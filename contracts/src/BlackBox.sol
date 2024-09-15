// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26; 

/**
  * @title Black Box 
  *
  * @author 5A6E55E
  *
  *          _______
  *        .' /H|__ `.
  *       /  =[_]O|` \
  *      |   / \ |   |
  *      ;  | O |;   ;
  *       '.___.' \  /
  *        |  _  |  \  `-.
  *       |   |_|   `\    \
  *        _./'   `\_  `-._\
  *      .'/         `.`.  '_.-.
  *
  * @notice Privacy device for any ERC20 token
  *
  * @dev This system makes use of pedersen commitments accumulated in a merkle tree.
  *      Proofs are generated over the Barretenberg curve.
  *
  *          _________                     _______                
  *        .'         `.                 .' _____ `.              
  *       / .#########. \               / .'#####`. \             
  *      | |###########| |             | |#######|  |             
  *      ; |###########| ;             ; |#######|  ;             
  *      \ '.___###__.' /  \            \ '.___.' /  \            
  *       \           / \  `-.           \       / \  `-.         
  *        |   ###   |  `\    \           |     |  `\    \        
  *       |    ###   _|    `\    \       |     _|    `\    \      
  *        _./'   `\._       `-._\        _./'   `\._   `-._\     
  *      .'/         `.`.       '_.-.   .'/         `.`.    '_.-. 
  */
contract BlackBox is DepositVerifier, WithdrawVerifier {

    bytes32 root;

    mapping(bytes32 => bool) nullifiers;

    address constant ROSE = 0x0000000000000000000000000000000000000000;

    bytes32 constant TRANSFER_SIG = keccak256("transfer(address,uint256)");

    constructor(bytes32 _root) {
        root = _root;
    }

    function deposit(bytes32 leaf, bytes32 newRoot, bytes32[] memory proof) external payable {
        // verify that
        assert(verifyDeposit(leaf, msg.value, root, newRoot, proof));

        assembly {
            // send deposit call to ROSE
            if iszero(call(gas(), ROSE, msg.value, 0, 0, 0, 0)) { revert(0, 0) }
            // update merkle tree
            sstore(root, newRoot)
        }
    }

    function withdraw(uint256 value, bytes32 nullifier, bytes32[] memory proof) external {
        assert(verifyWithdraw(value, nullifier, root, proof));

        assembly {
            // send withdraw call to ROSE
            let ptr := mload(0x40)
            mstore(ptr, shl(224, TRANSFER_SIG))
            mstore(add(ptr, 0x04), ROSE)
            mstore(add(ptr, 0x24), value)
            if iszero(call(gas(), ROSE, 0, ptr, 0x44, 0, 0)) { revert(0, 0) }
            // set nullifier
            mstore(ptr, nullifier)
            mstore(add(ptr, 0x20), 1)
            let NULLIFIER_SLOT := keccak256(ptr, 0x40)
            sstore(NULLIFIER_SLOT, true)
        }
    }
}
