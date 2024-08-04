// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "lib/openzeppelin-contracts/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract ROSE is ERC20Permit {

    address immutable strategy;

    mapping (uint epoch => uint amount) totalBuysVolume;
    mapping (uint epoch => mapping (address buyer => uint amount)) buyOrders;

    constructor(uint initialSupply) ERC20Permit("ROSE") {
        strategy = msg.sender;
        _mint(strategy, initialSupply);
    }

    function _update(address from, address to, uint amount) internal override returns (bool) {
        if (from == strategy || to == strategy) {
            return super._update(from, to, amount);
        }
        (, bytes memory ret) = strategy.call(abi.encodeWithSignature("_update(address,address,uint256)", from, to, amount));
        amount = abi.decode(ret, (uint));
        return super._update(from, to, amount);
    }

    function slash(address from, uint amount, uint slashFactor) external returns (uint remainingAmount) {
        require(msg.sender == strategy, "ROSE.slash: This function is protected");
        uint slashedAmount = amount * 1e6 / slashFactor / 1e6;
        super._update(from, strategy, slashedAmount);
        return amount - slashedAmount;
    }

    // function mint(address to, uint amount, bytes calldata data) public {
    //     _mint(to, amount);
    //     to.call(abi.encodeWithSignature("onTokenReceived(address,uint,bytes)", msg.sender, amount, data));
    //     _burn(to, amount);
    // }
}
