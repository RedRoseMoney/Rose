// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import { IERC20 } from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import { IUniswapV2Factory } from "lib/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import { IUniswapV2Pair } from "lib/v2-core/contracts/interfaces/IUniswapV2Pair.sol";

/**
  *       _____
  *     .'/L|__`.
  *    / =[_]O|` \
  *    |   _  |   |
  *    ;  (_)  ;  |
  *     '.___.' \  \
  *      |     | \  `-.
  *     |    _|  `\    \
  *      _./' \._   `-._\
  *    .'/     `.`.   '_.-.
  *
  * @title ROSE Market Strategist
  *
  * @author 5A6E55E
  *
  * @notice Markets are often assumed to follow some kind of exponential
  *         distribution over their price action, for a specific time
  *         interval (e.g. every 1h price change) with most market
  *         movements of small magnitudes, and rare movements of very
  *         large magnitudes relative to the probability of being drawn
  *         from the gaussian distribution fitted to the data.
  *
  *         1.) Naive expected price distribution following a gaussian:
  *             |---------------------------------|
  *             |               :::               |
  *             |             ::   ::             |
  *             |            :       :            |
  *             |           :         :           |
  *             |          ::         ::          |
  *             |          :           :          |
  *             |         :             :         |
  *             |        ::             ::        |
  *             |      :::               :::      |
  *             |   ::::                   ::::   |
  *             |----------------|----------------|
  *            -10               0                10
  *
  *         2.) Actual price distribution following an exponential with
  *             long tails due to the frequency of critical events:
  *             |-------------------------------|
  *             |               :               |
  *             |              :::              |
  *             |             :: ::             |
  *             |            ::   ::            |
  *             |           ::     ::           |
  *             |         :::       :::         |
  *             |      ::::           ::::      |
  *             |  :::::                 :::::  |
  *             |---------------|---------------|
  *            -10              0               10
  *
  *         Price action can be decomposed and treated as a combination
  *         of two main states:
  *             - a trending state (::),
  *             - a fast, high-volatility state (!!),
  *         with a transition from these two states happening at
  *         critical points (x).
  *
  *             |-------------------------------------|
  *             |               x  :: :: x            |
  *             |             !! :: :: :: !!          |
  *             |             !!          !!    ::    |
  *             |            !!            !! ::  :: :|
  *             |            !!              x     :: |
  *             |  :: ::    !!                        |
  *             | :: :: :: !!                         |
  *             |::       x                           |
  *             |-------------------------------------|
  *
  *         We refer to these high volatility states as critical-states.
  *
  *         The ROSE Market Strategist executes a periodic market-making
  *         strategy driving volume at fixed intervals called critical-
  *         states. During these events, the strategist will skew price
  *         action to the upside by punishing sellers and rewarding
  *         buyers.
  *         To achieve this, the market strategy will reduce the amount
  *         of liquidity available into markets to increase price
  *         volatility. strong slashing and rewards mechanisms will be
  *         imposed on sell and buy orders, respectively.
  *
  *         Critical-states will initially be triggered every week,
  *         and will last for two hours. the frequency of these events
  *         will progressively decrease, as the period duration
  *         increases. The epoch length and critical-state duration
  *         will approximately double every year.
  *
  *         At the end of the period, if the price increased (more ROSE
  *         bought than sold), the amount of ETH withdrawn from the
  *         liquidity pool is reinserted, and the corresponding amount
  *         of ROSE is provided, following the new reserves ratio. The
  *         excess ROSE will then be burned by the strategy. On the
  *         other hand, if the price decreased, the amount of ROSE
  *         withdrawn from the liquidity pool is reinserted, and the
  *         corresponding amount of ETH is provided. The excess ETH
  *         will then be swapped for ROSE and burned.
  *
  * @todo let users LP with us directly for rewards
  * @todo handle transfers from or to this address with _transfer
  * @todo add a way to remove liquidity to support future markets (migrate())
  * @todo add rewards logic
  * @todo think about adding a day of critical-state by month
  */
contract Strategy {

    struct PoolState {
        uint reserve0;
        uint reserve1;
        uint priceCumulative;
        uint timestamp;
    }

    IUniswapV2Pair public pair;
    IERC20 public constant ROSE;
    IERC20 public constant weth;

    PoolState poolState;

    bool criticalStateActivated;
    uint constant EPOCH_OFFSET;
    uint constant EPOCH_DURATION = 1 weeks;
    uint constant CRITICAL_STATE_DURATION = 2 hours;
    uint constant GROWTH_FACTOR;
    uint lpWithdrawFactor;
    uint slashFactor;

    address[] pairs;

    mapping (uint epoch => uint amount) totalBuysForEpoch;
    mapping (uint epoch => mapping (address buyer => uint amount)) totalBuysForBuyer;
    
    constructor(
        address _factory,
        address _weth,
        address treasury,
        uint amount0In,
        uint amount1In,
        uint _lpWithdrawFactor,
        uint _slashFactor,
        uint _growthFactor,
        uint _initialSupply
    ) {
        EPOCH_OFFSET = block.timestamp % EPOCH_DURATION;
        lpWithdrawFactor = _lpWithdrawFactor;
        slashFactor = _slashFactor;
        GROWTH_FACTOR = _growthFactor;

        ROSE = IERC20(new ROSE(_initialSupply));
        weth = IERC20(_weth);

        (bool createPairSuccess, bytes memory ret) = _factory.call(
            abi.encodeWithSignature("createPair(address,address)", address(ROSE), address(weth))
        );
        pair = IUniswapV2Pair(abi.decode(ret, (address)));
        pairs.push(address(pair));

        ROSE.transfer(address(pair), amount0In);
        weth.transfer(address(pair), amount1In);
        pair.mint(address(this));
    }
    
    /**
      * @notice called from ROSE._update.
      *         this hook activates the LP burn at the start of
      *         the critical state, handles slashing and record
      *         buys for rewards calculation.
      *
      * @param from the sender of the transfer
      *
      * @param to the receiver of the transfer
      *
      * @param amount the initial amount sent, slashed if the
      *               transaction is a sell order
      *
      * @return remainingAmount amount to transfer, minus
      *         slashing
      */
    function _update(address from, address to, uint amount) external override returns (uint remainingAmount) {
        require (msg.sender == strategy, "Strategy._update: This function is protected");
        if (_isCritical()) {
            // The critical-state will be triggered on the first transaction
            // submitted after the period has started.
            if (!criticalStateActivated) {
                // activate the LP removal and slashing mechanism
                triggerCriticalState();
            }
            if (contains(pairs, to)) {
                // sell order:
                // -- slash that bitch out --
                amount = ROSE.slash(from, amount, slashFactor);
            } else if (contains(pairs, from)) {
                // buy orders:
                // record the cumulative amount bought by msg.sender
                // and the total amount bought during that epoch.
                recordBuy(to, amount);
            }
        } else {
            // The critical-state is disabled on the first transaction
            // after the end of the period
            if (criticalStateActivated) {
                disableCriticalState();
                criticalStateActivated = false;
            }
        }
    }

    /**
        @notics activate the critical state, record the state of
                the pool then remove LP.
      */
    function triggerCriticalState() internal returns (uint) {
        criticalStateActivated = true;
        _recordPoolState();
        _burnLp();
    }

    // @todo check the necessary steps to securely extract the price from cumulatives [https://docs.uniswap.org/contracts/v2/concepts/core-concepts/oracles]
    //       to avoid JIT liquidity attacks which would allow to burn most of the liquidity.
    //       uint _price = (_newPriceCumulative - _lastPriceCumulative) / (_newTimestamp - _lastTimestamp);
    function disableCriticalState() internal returns (uint) {
        uint _lastPriceCumulative = poolState.priceCumulative;
        uint _lastTimestamp = poolState.timestamp;
        _recordPoolState();
        uint _newPriceCumulative = poolState.priceCumulative;
        uint _newTimestamp = block.timestamp;
        // temporary simple price ratio calculation
        uint _price = poolState.reserve0 / poolState.reserve1;
        // @todo should check for balances instead of old state to
        //       determine the amount to mint? Should revise the
        //       computation of the liquidity to provide on both sides
        bool priceIncreased = _priceIncreased();
        _mintLp();
    }

    function _recordPoolState() internal view returns (uint) {
        poolState.priceCumulative = pair.price0CumulativeLast();
        (uint112 _reserve0, uint112 _reserve1, ) = pair.getReserves();
        poolState.reserve0 = uint(_reserve0);
        poolState.reserve1 = uint(_reserve1);
        poolState.timestamp = block.timestamp;
    }

    /**
        @notice Withdraw a LP position
      */
    function _burnLp() internal {
        uint lpBalance = pair.balanceOf(address(this));
        pair.transfer(address(pair), lpBalance * 1e6 / lpWithdrawFactor / 1e6);
        pair.burn(address(this));
    }

    /**
        @notice Mint a LP position
      */
    function _mintLp(uint amount0, uint amount1) internal {
        ROSE.transfer(address(pair), amount0);
        weth.transfer(address(pair), amount1);
        pair.mint(address(this));
    }

    /**
        @notice Computes the current epoch number

        @return the current epoch number
      */
    function _epoch() internal view returns (uint) {
        return (block.timestamp / EPOCH_DURATION) - EPOCH_OFFSET;
    }

    /**
        @notice Check if we are in a critical state

        @return true if we are in a critical state
      */
    function _isCritical() internal view returns (bool) {
        uint criticalStateStart = _epoch() * EPOCH_DURATION;
        uint criticalStateEnd = criticalStateStart + CRITICAL_STATE_DURATION;
        return criticalStateStart <= block.timestamp && block.timestamp <= criticalStateEnd;
    }

    /**
        @notice Increase the recorded buy orders volume for a given
                buyer and for the epoch's total

        @param buyer the buyer address

        @param amount the amount bought

      */
    function recordBuy(address buyer, uint amount) internal {
        totalBuysForBuyer[_epoch()][buyer] += amount;
        totalBuysForEpoch[_epoch()] += amount;
    }

    /**
        @notice Check if an element is in an array

        @param array the array to search in

        @param element the element to search for

        @return true if the element is in the array
      */
    function contains(address[] memory array, address element) internal pure returns (bool) {
        for (uint i = 0; i < array.length; i++) {
            if (array[i] == element) {
                return true;
            }
        }
        return false;
    }
}
