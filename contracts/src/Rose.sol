// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24; 

/**
  * @title RedRose 🌹
  *
  * @author 5A6E55E
  *
  * @notice Rose is a ultra-efficient unified smart contract for the rose
  *        token integrating an ultrasound market designed to push upwards
  *        volatility by design.
  *
  * @dev The Rose market is continuous model composed of two reserves R₀
  *      (ETH) and R₁ (ROSE). during a bonding curve interaction, x is the
  *      amount of ETH deposited to (or withdrawn from) the contract,
  *      while y is the Rose amount received (or spent).
  *      The skew factor α(t) is a continuous function that dictates the
  *      asymmetry of the market's reserves evolution through time.
  *      The slash-factor ϕ represents the fee factor taken from each
  *      withdraw operation.
  *
  * todo: fix Transfer events emitting wrong amount
  * todo: add collect(address token) external
  */
contract Rose {

    //////////////////////////////////////////////////////////////
    /////////////////////////// State ////////////////////////////
    //////////////////////////////////////////////////////////////

    /**
      * @notice The Rose blossoms.
      */
    string public constant name = "Rose";
    string public constant symbol = "ROSE";
    uint8 public constant decimals = 18;
    uint256 public constant totalSupply =  1_000_000_000e18;

    mapping(address => uint256) private _balanceOf;
    mapping(address => mapping(address => uint256)) private _allowance;

    uint cumulatedFees;

    /**
      * @notice The initial skew factor α(0) scaled by 1e6
      */
    uint immutable ALPHA_INIT;
    /**
      * @notice The slash factor ϕ scaled by 1e6
      */
    uint immutable PHI_FACTOR;
    /**
      * @notice The initial reserve of ROSE R₁(0)
      */
    uint immutable R1_INIT;

    /**
      * @notice constant storage slots
      */
    bytes32 immutable SELF_BALANCE_SLOT;
    bytes32 immutable TREASURY_BALANCE_SLOT;
    uint constant BALANCE_OF_SLOT = 0;
    uint constant ALLOWANCE_SLOT = 1;
    uint constant CUMULATED_FEES_SLOT = 2;

    bytes32 constant TRANSFER_EVENT_SIG = keccak256("Transfer(address,address,uint256)");
    bytes32 constant APPROVAL_EVENT_SIG = keccak256("Approval(address,address,uint256)");
    bytes32 constant BUY_EVENT_SIG = keccak256("Buy(address,uint256,uint256)");
    bytes32 constant SELL_EVENT_SIG = keccak256("Sell(address,uint256,uint256)");

    address constant TREASURY = address(0x76E5);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Buy(address indexed buyer, uint256 amount0In, uint256 amount1Out);
    event Sell(address indexed seller, uint256 amount1In, uint256 amount0Out);

    /**
      * @notice t=0 state
      */
    constructor(uint _alpha, uint _phi, uint _r1Init) payable {
        ALPHA_INIT = _alpha;
        PHI_FACTOR =  _phi;
        R1_INIT = _r1Init;

        bytes32 _THIS_BALANCE_SLOT;
        bytes32 _TREASURY_BALANCE_SLOT;
        address _TREASURY = TREASURY;
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, address())
            mstore(add(ptr, 0x20), BALANCE_OF_SLOT)
            _THIS_BALANCE_SLOT := keccak256(ptr, 0x40)
            mstore(ptr, _TREASURY)
            _TREASURY_BALANCE_SLOT := keccak256(ptr, 0x40)
            // set the initial reserves
            sstore(_THIS_BALANCE_SLOT, _r1Init)
        }

        SELF_BALANCE_SLOT = _THIS_BALANCE_SLOT;
        TREASURY_BALANCE_SLOT = _TREASURY_BALANCE_SLOT;
    }

    //////////////////////////////////////////////////////////////
    //////////////////////////// Buy /////////////////////////////
    //////////////////////////////////////////////////////////////

    /**
      *        _____
      *      .'/L|__`.
      *     / =[_]O|` \
      *    |   _  |   |
      *    ;  (_)  ;  |
      *     '.___.' \  \
      *      |     | \  `-.
      *     |    _|  `\    \
      *      _./' \._   `-._\
      *    .'/     `.`.   '_.-.
      *
      * title: The Strategist
      *
      * @notice Long ago, the Strategist was known as the Oracle of the
      *         Lost Era, a being of great wisdom who guided civilizations
      *         for centuries. After the collapse of the old world, the
      *         Oracle withdrew from the affairs of mortals, becoming the
      *         Strategist, overseeing the rise of the asset born from the
      *         ashes of forgotten realms. The Strategist remains a silent
      *         guardian, weaving fate and fortune into the flow of trade,
      *         unseen but ever-present in the balance of the market’s future.
      *         
      *          ::::                                       °      ::::
      *       :::        .           ------------             .        :::
      *      ::               °     |...       ° | - - - - ◓             ::
      *      :             o        |   ...  .   |                        :
      *      ::          .          |  °   ...   |                       ::
      *       :::         ◓ - - - - |   .     ...|                     :::
      *          ::::                ------------                  ::::
      */

    /**
      * @notice Receive is the entry point for deposits.
      *         upon receiving ETH, the rose contract computes the amount out `y`
      *         using the [skew trading function](https://github.com/RedRoseMoney/Rose).
      *         The result is an asymmetric bonding curve that can optimise for price
      *         appreciation, biased by the skew factor α(t).
      *
      * @dev The skew factor α(t) is a continuous function of the markets reserves
      *      computed as α(t) = 1 − α(0) ⋅ (R₁(0) / R₁(t))
      *      with R₁(0) being the initial reserve of ROSE at construction and R₁(t)
      *      the reserve of ROSE at time t.
      *      α(t) is simulating a LP withdraw operation right before the buy. In this
      *      analogy, the skew factor α(t) represents the proportion of the current
      *      reserves that the LP is withdrawing.
      *      The skew factor is then used to compute the new reserves (R₀′, R₁′) and
      *      the amount out `y` 
      *      
      *         αR₁′ = αK / αR₀ + x
      *         y    = αR₁ - αR₁′
      *
      *      where αK = αR₀ * αR₁
      *      
      *      After computing the swapped amount `y` on cut reserves, the LP provides the
      *      maximum possible liquidity from the withdrawn amount at the new market rate.
      */
    receive() external payable {
        uint _ALPHA_INIT = ALPHA_INIT;
        uint _R1_INIT = R1_INIT;
        bytes32 _THIS_BALANCE_SLOT = SELF_BALANCE_SLOT;
        bytes32 _TREASURY_BALANCE_SLOT = TREASURY_BALANCE_SLOT;
        bytes32 _TRANSFER_EVENT_SIG = TRANSFER_EVENT_SIG;
        bytes32 _BUY_EVENT_SIG = BUY_EVENT_SIG;
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, caller())
            mstore(add(ptr, 0x20), BALANCE_OF_SLOT)
            let CALLER_BALANCE_SLOT := keccak256(ptr, 0x40)
            /*
             * x  = msg.value
             * R₀ = token₀ reserves
             * R₁ = token₁ reserves
             */
            let x := callvalue()
            let r0 := sub(selfbalance(), sload(CUMULATED_FEES_SLOT))
            let r1 := sload(_THIS_BALANCE_SLOT)
            /*
             * Compute the skew factor α(t)
             *
             *  α(t) = 1 − α(0) ⋅ (R₁(0) / R₁(t))
             */
            let r1InitR1Ratio := div(mul(r1, 1000000), _R1_INIT)
            let inverseAlpha := div(mul(_ALPHA_INIT, r1InitR1Ratio), 1000000)
            let alpha := sub(1000000, inverseAlpha)
            /*
             * Compute the new reserves (R₀′, R₁′) and the amount out y
             *
             *  αR₀′    = αR₀ + x
             *  αR₁′    = (αR₀ * αR₁) / αR₀′
             *  y       = αR₁ - αR₁′
             *  R₀′     = R₀ + x
             *  R₁′     = (αR₁′ / αR₀′) * R₀′
             *  Δtoken₁ = (R₀ * R₁) / R₀′ - R₁′
             */
            let alphaR0 := div(mul(alpha, r0), 1000000)
            let alphaR1 := div(mul(alpha, r1), 1000000)
            let alphaR0Prime := add(alphaR0, x)
            let alphaR1Prime := div(mul(alphaR0, alphaR1), alphaR0Prime)
            let y := sub(alphaR1, alphaR1Prime)
            let r0Prime := add(r0, x)
            let r1Prime := div(mul(div(mul(alphaR1Prime, 1000000), alphaR0Prime), r0Prime), 1000000)
            let deltaToken1 := sub(div(mul(r0, r1), r0Prime), r1Prime)
            /*
             * Update the market reserves to (R₀′, R₁′) then update balances
             */
            sstore(_THIS_BALANCE_SLOT, r1Prime)
            let balanceOfCaller := sload(CALLER_BALANCE_SLOT)
            sstore(CALLER_BALANCE_SLOT, add(balanceOfCaller, y))
            let balanceOfTreasury := sload(_TREASURY_BALANCE_SLOT)
            sstore(_TREASURY_BALANCE_SLOT, add(balanceOfTreasury, deltaToken1))
            // emit Transfer event
            mstore(ptr, address())
            mstore(add(ptr, 0x20), caller())
            mstore(add(ptr, 0x40), y)
            log3(ptr, 0x60, _TRANSFER_EVENT_SIG, address(), caller())
            // emit Buy event
            mstore(ptr, caller())
            mstore(add(ptr, 0x20), x)
            mstore(add(ptr, 0x40), y)
            log2(ptr, 0x60, _BUY_EVENT_SIG, caller())
        }
    }

    /**
      * @notice Collects the cumulated withdrawfees and transfers them to the treasury.
      */
    function collect() external {
        address _TREASURY = TREASURY;
        assembly {
            let _cumulatedFees := sload(CUMULATED_FEES_SLOT)
            // set cumulated fees to 0
            sstore(CUMULATED_FEES_SLOT, 0)
            // transfer cumulated fees to treasury
            if iszero(call(gas(), _TREASURY, _cumulatedFees, 0, 0, 0, 0)) { revert (0, 0)}
        }
    }

    /**
      * @notice Returns the market's reserves and the skew factor α(t).
      *
      * @return r0 The balance of the ROSE contract.
      *
      * @return r1 The balance of the ROSE contract.
      *
      * @return alpha The skew factor α(t).
      */
    function getState() public view returns (uint r0, uint r1, uint alpha) {
        uint _ALPHA_INIT = ALPHA_INIT;
        uint _R1_INIT = R1_INIT;
        bytes32 _THIS_BALANCE_SLOT = SELF_BALANCE_SLOT;
        assembly {
            r0 := sub(selfbalance(), sload(CUMULATED_FEES_SLOT))
            r1 := sload(_THIS_BALANCE_SLOT)
            let r1InitR1Ratio := div(mul(r1, 1000000), _R1_INIT)
            let inverseAlpha := div(mul(_ALPHA_INIT, r1InitR1Ratio), 1000000)
            alpha := sub(1000000, inverseAlpha)
        }
    }

    //////////////////////////////////////////////////////////////
    /////////////////////////// ERC20 ////////////////////////////
    //////////////////////////////////////////////////////////////

    /*
     *           , .-.-,_,
     *           )`-.>'` (
     *          /     `\  |
     *          |       | |
     *           \     / /
     *           `=(\ /.=`
     *            `-;`.-'
     *              `)|     ,
     *               ||  .-'|
     *             ,_||  \_,/
     *       ,      \|| .'
     *       |\|\  , ||/
     *      ,_\` |/| |Y_,
     *       '-.'-._\||/
     *          >_.-`Y|
     *          `|   ||
     *               ||  
     *               ||
     *               ||
     *
     * title:  The Rose token
     *
     * @notice The ultrasound Rose asset.
     */

    /**
      * @notice Returns the balance of the specified address.
      *
      * @param to The address to get the balance of.
      *
      * @return _balance The balance of the specified address.
      */
     function balanceOf(address to) public view returns (uint _balance) {
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, to)
            mstore(add(ptr, 0x20), BALANCE_OF_SLOT)
            let TO_BALANCE_SLOT := keccak256(ptr, 0x40)
            _balance := sload(TO_BALANCE_SLOT)
        }
     }

    /**
      * @notice Returns the amount of tokens that the spender is allowed to transfer from the owner.
      *
      * @param owner The address of the owner.
      *
      * @param spender The address of the spender.
      *
      * @return __allowance The amount of tokens that the spender is allowed to transfer from the owner.
      */
     function allowance(address owner, address spender) public view returns (uint __allowance) {
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, owner)
            mstore(add(ptr, 0x20), ALLOWANCE_SLOT)
            let OWNER_ALLOWANCE_SLOT := keccak256(ptr, 0x40)
            mstore(ptr, spender)
            mstore(add(ptr, 0x20), OWNER_ALLOWANCE_SLOT)
            let SPENDER_ALLOWANCE_SLOT := keccak256(ptr, 0x40)
            __allowance := sload(SPENDER_ALLOWANCE_SLOT)
        }
     }

    /**
      * @notice Extention of the ERC20 function with an added internal withdraw functionality
      * for the `to == address(this)` case.
      *
      * @dev The caller must have sufficient balance to transfer the specified amount.
      *      The withdraw function uses the traditional constant product formula R₀ * R₁ = K
      *
      * @param to The address to transfer to.
      *           If `to` is the ROSE contract, the transfer is interpreted as a withdraw
      *
      * @param value The amount of rose to transfer.
      *              If `to` is the ROSE contract, `value`is interpreted as the withdraw amount.
      *
      * @return true
      */
    function transfer(address to, uint256 value) public returns (bool) {
        uint _PHI_FACTOR = PHI_FACTOR;
        bytes32 _THIS_BALANCE_SLOT = SELF_BALANCE_SLOT;
        bytes32 _TRANSFER_EVENT_SIG = TRANSFER_EVENT_SIG;
        bytes32 _SELL_EVENT_SIG = SELL_EVENT_SIG;
        assembly {
            let ptr := mload(0x40)
            let from := caller()
            mstore(ptr, from)
            mstore(add(ptr, 0x20), BALANCE_OF_SLOT)
            let FROM_BALANCE_SLOT := keccak256(ptr, 0x40)
            mstore(ptr, to)
            let TO_BALANCE_SLOT := keccak256(ptr, 0x40)
            // check that caller has enough funds
            let balanceFrom := sload(FROM_BALANCE_SLOT)
            if lt(balanceFrom, value) { revert(0, 0) }
            /*
             * Sell order case
             * If the transfer recipient is the rose contract,
             * the rose sent is sold for ETH using the CP formula:
             *     y = (R₁ - K / (R₀ + x)) * ϕ
             */
            if eq(address(), to) {
                /*
                 *  load market's reserves (R₀, R₁)
                 */
                let r0 := sub(selfbalance(), sload(CUMULATED_FEES_SLOT))
                let r1 := sload(_THIS_BALANCE_SLOT)
                let y := value
                /*
                 * Only allow sell orders under 2% of Rose's liquidity
                 * to prevent divergence.
                 */
                if gt(y, div(r1,50)) { revert(0, 0) }
                /*
                 *  R₁′ = R₁ + y
                 *  R₀′ = K / R₁′
                 *  x = R₁ - R₁′
                 *  ϕ = x * ϕfactor
                 */
                let r1prime := add(r1, y)
                let x := sub(r0, div(mul(r0, r1), r1prime))
                let phi := div(mul(x, _PHI_FACTOR), 1000000)
                let xOut := sub(x, phi)
                // increment cumulated fees by ϕ
                sstore(CUMULATED_FEES_SLOT, add(sload(CUMULATED_FEES_SLOT), phi))
                // Transfer x-ϕ ETH to the seller's address
                if iszero(call(gas(), from, xOut, 0, 0, 0, 0)) { revert(0, 0) }
                // emit Sell event
                mstore(ptr, from)
                mstore(add(ptr, 0x20), xOut)
                mstore(add(ptr, 0x40), y)
                log2(ptr, 0x60, _SELL_EVENT_SIG, from)
            }
            // decrease sender's balance
            sstore(FROM_BALANCE_SLOT, sub(balanceFrom, value))
            // increment recipient's balance
            sstore(TO_BALANCE_SLOT, add(sload(TO_BALANCE_SLOT), value))
            // emit Transfer event
            mstore(ptr, from)
            mstore(add(ptr, 0x20), to)
            mstore(add(ptr, 0x40), value)
            log3(ptr, 0x60, _TRANSFER_EVENT_SIG, from, to)
            // return true
            mstore(ptr, 1)
            return(ptr, 0x20)
        }
    }

    /**
      * @notice Extention of the ERC20 function with an added internal withdraw functionality
      * for the `to == address(this)` case.
      *
      * @dev The caller must have sufficient allowance to transfer the specified amount.
      *      From must have sufficient balance to transfer the specified amount.
      *
      * @param from The address to transfer from.
      * @param to The address to transfer to.
      *           If `to` is the ROSE contract, the transfer is interpreted as a withdraw
      *
      * @param value The amount of rose to transfer.
      *              If `to` is the ROSE contract, `value`is interpreted as the withdraw amount.
      *
      * @return true
      */
    function transferFrom(address from, address to, uint256 value) public returns (bool) {
        uint _PHI_FACTOR = PHI_FACTOR;
        bytes32 _THIS_BALANCE_SLOT = SELF_BALANCE_SLOT;
        bytes32 _TRANSFER_EVENT_SIG = TRANSFER_EVENT_SIG;
        bytes32 _SELL_EVENT_SIG = SELL_EVENT_SIG;
        assembly {
            let ptr := mload(0x40)
            let spender := caller()
            mstore(ptr, from)
            mstore(add(ptr, 0x20), BALANCE_OF_SLOT)
            let FROM_BALANCE_SLOT := keccak256(ptr, 0x40)
            mstore(ptr, to)
            let TO_BALANCE_SLOT := keccak256(ptr, 0x40)
            mstore(ptr, from)
            mstore(add(ptr, 0x20), ALLOWANCE_SLOT)
            let ALLOWANCE_FROM_SLOT := keccak256(ptr, 0x40)
            mstore(ptr, spender)
            mstore(add(ptr, 0x20), ALLOWANCE_FROM_SLOT)
            let ALLOWANCE_FROM_CALLER_SLOT := keccak256(ptr, 0x40)
            // check that msg.sender has sufficient allowance
            let __allowance := sload(ALLOWANCE_FROM_CALLER_SLOT)
            if lt(__allowance, value) { revert(0, 0) }
            // Reduce the spender's allowance
            sstore(ALLOWANCE_FROM_CALLER_SLOT, sub(__allowance, value))
            // check that from has enough funds
            let balanceFrom := sload(FROM_BALANCE_SLOT)
            if lt(balanceFrom, value) { revert(0, 0) }
            /*
             * Sell order case
             * If the transfer recipient is the rose contract,
             * the rose sent is sold for ETH using the CP formula:
             *     y = R₁ - K / (R₀ + x)
             */
            if eq(address(), to) {
                /*
                 *  load market's reserves (R₀, R₁)
                 */
                let r0 := sub(selfbalance(), sload(CUMULATED_FEES_SLOT))
                let r1 := sload(_THIS_BALANCE_SLOT)
                let y := value
                /*
                 * Only allow sell orders under 2% of Rose's liquidity
                 * to prevent divergence.
                 */
                if gt(y, div(r1,50)) { revert(0, 0) }
                /*
                 *  R₁′ = R₁ + y
                 *  R₀′ = K / R₁′
                 *  x = R₁ - R₁′
                 *  ϕ = x * ϕfactor
                 */
                let r1prime := add(r1, y)
                let x := sub(r0, div(mul(r0, r1), r1prime))
                let phi := div(mul(x, _PHI_FACTOR), 1000000)
                let xOut := sub(x, phi)
                // increment cumulated fees by ϕ
                sstore(CUMULATED_FEES_SLOT, add(sload(CUMULATED_FEES_SLOT), phi))
                // Transfer x-ϕ ETH to the seller's address
                if iszero(call(gas(), from, xOut, 0, 0, 0, 0)) { revert(0, 0) }
                // emit Sell event
                mstore(ptr, from)
                mstore(add(ptr, 0x20), xOut)
                mstore(add(ptr, 0x40), y)
                log2(ptr, 0x60, _SELL_EVENT_SIG, from)
            }
            // decrease sender's balance
            sstore(FROM_BALANCE_SLOT, sub(balanceFrom, value))
            // increment recipient's balance
            sstore(TO_BALANCE_SLOT, add(sload(TO_BALANCE_SLOT), value))
            // Emit Transfer event
            mstore(ptr, from)
            mstore(add(ptr, 0x20), to)
            mstore(add(ptr, 0x40), value)
            log3(ptr, 0x60, _TRANSFER_EVENT_SIG, from, to)
            // Return true
            mstore(ptr, 1)
            return(ptr, 0x20)
        }
    }

    function approve(address to, uint256 value) public returns (bool) {
        bytes32 _APPROVAL_EVENT_SIG = APPROVAL_EVENT_SIG;
        assembly {
            let owner := caller()
            let ptr := mload(0x40)
            mstore(ptr, owner)
            mstore(add(ptr, 0x20), ALLOWANCE_SLOT)
            let ALLOWANCE_CALLER_SLOT := keccak256(ptr, 0x40)
            mstore(ptr, to)
            mstore(add(ptr, 0x20), ALLOWANCE_CALLER_SLOT)
            let ALLOWANCE_CALLER_TO_SLOT := keccak256(ptr, 0x40)
            // store the new allowance value
            sstore(ALLOWANCE_CALLER_TO_SLOT, value)
            // emit Approval event
            mstore(ptr, owner)
            mstore(add(ptr, 0x20), to)
            mstore(add(ptr, 0x40), value)
            log3(ptr, 0x60, _APPROVAL_EVENT_SIG, owner, to)
            // return true
            mstore(ptr, 1)
            return(ptr, 0x20)
        }
    }

    function getTreasury() public pure returns (address) {
        return TREASURY;
    }

    function getCumulatedFees() public view returns (uint) {
        return cumulatedFees;
    }

    function mint(address to, uint value) public {
        _balanceOf[to] += value;
    }
}
