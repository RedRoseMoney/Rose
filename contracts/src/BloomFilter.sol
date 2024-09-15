// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract BloomFilter {
    uint256 public constant m = 32768; // Adjusted to be a power of two (e.g., 2^13)
    uint256 public constant k = 26;    // Optimal number of hash functions
    uint256 public constant WORD_SIZE = 256;

    // Since m = 8192 bits, we need m / 256 = 32 uint256 slots
    uint256[128] public bitArray;


    /**
     * @notice Inserts an element into the Bloom filter.
     * @param element The element to insert.
     */
    function insert(bytes32 element) public {
        // Compute two hash functions
        uint256 h1 = uint256(keccak256(abi.encodePacked(element, uint256(0))));
        uint256 h2 = uint256(keccak256(abi.encodePacked(element, uint256(1))));

        // Precompute h1mod and h2mod (since m is a power of two, use bitwise AND)
        uint256 _m = m;
        uint256 mMask = _m - 1;
        uint256 h1mod = h1 & mMask;
        uint256 h2mod = h2 & mMask;
        uint256 hashValue = h1mod;

        uint256 _k = k; // Cache k
        uint256 bitArray_slot;
        assembly {
            bitArray_slot := bitArray.slot
        }

        for (uint256 i = 0; i < _k; i++) {
            assembly {
                // Compute bitPosition, wordIndex, and bitIndex
                let bitPosition := hashValue
                let wordIndex := shr(8, bitPosition) // Equivalent to bitPosition / 256
                let bitIndex := and(bitPosition, 255) // Equivalent to bitPosition % 256

                // Calculate storage slot for bitArray[wordIndex]
                mstore(0x0, wordIndex)
                mstore(0x20, bitArray_slot)
                let storageSlot := keccak256(0x0, 0x40)

                // Load current value, set the bit, and store it back
                let currentValue := sload(storageSlot)
                let newValue := or(currentValue, shl(bitIndex, 1))
                sstore(storageSlot, newValue)

                // Update hashValue for the next iteration
                hashValue := and(add(hashValue, h2mod), mMask)
            }
        }
    }

    /**
     * @notice Checks if an element is possibly in the Bloom filter.
     * @param element The element to check.
     * @return True if the element is possibly in the filter, false if definitely not.
     */
    function contains(bytes32 element) public view returns (bool) {
        uint256 h1 = uint256(keccak256(abi.encodePacked(element, uint256(0))));
        uint256 h2 = uint256(keccak256(abi.encodePacked(element, uint256(1))));
        uint256 _m = m;
        uint256 mMask = _m - 1;
        uint256 h1mod = h1 & mMask;
        uint256 h2mod = h2 & mMask;
        uint256 hashValue = h1mod;

        uint256 _k = k;
        uint256 bitArray_slot;
        assembly {
            bitArray_slot := bitArray.slot
        }
    
        uint256 i;
        for (i = 0; i < _k;) {
            assembly {
                // Compute bitPosition, wordIndex, and bitIndex
                let bitPosition := hashValue
                let wordIndex := shr(8, bitPosition) // Equivalent to bitPosition / 256
                let bitIndex := and(bitPosition, 255) // Equivalent to bitPosition % 256

                // Calculate storage slot for bitArray[wordIndex]
                mstore(0x0, wordIndex)
                mstore(0x20, bitArray_slot)
                let storageSlot := keccak256(0x0, 0x40)

                // Load current value and check if the bit is set
                let currentValue := sload(storageSlot)
                let mask := shl(bitIndex, 1)
                if iszero(and(currentValue, mask)) {
                    // If the bit is not set, return false
                    mstore(0x0, 0)
                    return(0x0, 32)
                }

                // Update hashValue for the next iteration
                hashValue := and(add(hashValue, h2mod), mMask)
            }
            unchecked { ++i; }
        }
        // All bits are set, return true
        assembly {
            mstore(0x0, 1)
            return(0x0, 32)
        }
    }
}
