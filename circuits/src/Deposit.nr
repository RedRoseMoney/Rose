use dep::std::hash;
use dep::std::merkle;

fn main(
    leaf: pub [Field; 62],
    message: [Field; 62],
    value: pub Field,
    nullifier: Field,
    index: Field,
    hashpath: [Field; 40],
    root: pub Field,
    newRoot: pub Field
) {
    let merkle_root = merkle::compute_merkle_root(leaf, index, hashpath);
    let commitment = hash::pedersen_commitment([message, value, nullifier]);
    assert(leaf == commitment);
    let merkle_root = merkle::compute_merkle_root(leaf, index, hashpath);
    assert(merkle_root == root);
}

fn s_compute_merkle_root(
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
