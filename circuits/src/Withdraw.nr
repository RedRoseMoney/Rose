use dep::std::hash;
use dep::std::merkle;

fn main(
    message: [Field; 62],
    amount: pub Field,
    nullifier: pub Field,
    index: Field,
    hashpath: [Field; 40],
    root: pub Field,
) {
    let commitment = hash::pedersen_commitment([message, amount, nullifier]);
    let merkle_root = merkle::compute_merkle_root(commitment, index, hashpath);
    assert(merkle_root == root);
}

fn compute_merkle_root(
    mut node: Field,
    index_bits: [bool; TREE_DEPTH],
    hashpath: [Field; TREE_DEPTH]
) -> Field {
    // Iterate over each level of the tree
    for i in 0..TREE_DEPTH {
        let sibling = hashpath[i];
        // Decide the order of hashing based on the current bit of the index
        if index_bits[i] == false {
            // If the bit is 0, current node is on the left
            node = hash_pair(node, sibling);
        } else {
            // If the bit is 1, current node is on the right
            node = hash_pair(sibling, node);
        }
    }
    return node;
}

// Helper function to hash two fields together
fn hash_pair(left: Field, right: Field) -> Field {
    // Use a hash function compatible with Noir (e.g., Poseidon)
    // Combine the two fields into an array
    let inputs = [left, right];
    // Compute the hash
    let result = hash::poseidon(inputs);
    return result;
}

#[test]
fn test_main() {
    main(1, 2);

    // Uncomment to make test fail
    // main(1, 1);
}
