// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import {Test, console} from "forge-std/Test.sol";
import {BloomFilter} from "../src/BloomFilter.sol";

contract BloomFilterTest is Test {

    BloomFilter public filter;

    function setUp() public {
        filter = new BloomFilter(/*8e2, 1e10*/);
    }

    function test_insert(bytes32[10] memory insertedMessages, bytes32[10] memory nonInsertedMessages) public {
        for (uint i = 0; i < insertedMessages.length; i++) {
            for (uint j = 0; j < nonInsertedMessages.length; j++) {
                vm.assume(insertedMessages[i] != nonInsertedMessages[j]);
            }
        }
        for (uint i = 0; i < insertedMessages.length; i++) {
            filter.insert(insertedMessages[i]);
            assertTrue(filter.contains(insertedMessages[i]));
        }
        for (uint i = 0; i < nonInsertedMessages.length; i++) {
            assertFalse(filter.contains(nonInsertedMessages[i]));
        }
    }

    function test_values() public {
        emit log_named_uint("numHashFunctions", filter.k());
        emit log_named_uint("bitArraySize", filter.m());
    }

    receive() external payable {}
}
