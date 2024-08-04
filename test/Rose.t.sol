// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {Rose} from "src/Rose.sol";
import {Strategy} from "src/Strategy.sol";

contract RoseTest is Test {
    IERC20 public rose;
    Strategy public strategy;

    function setUp() public {
        strategy = new Strategy();
        rose = strategy.ROSE();
    }
}
