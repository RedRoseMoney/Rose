// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26; 

import { Script } from "forge-std/Script.sol";
import { Rose } from "../src/Rose.sol";

contract RoseScript is Script {

    Rose public rose;

    function run() external {
        vm.startBroadcast();
        rose = new Rose{salt: "REDROSE", value: 1e17}(1e5, 1e4, 1e17, tx.origin);
        vm.stopBroadcast();
    }
}
