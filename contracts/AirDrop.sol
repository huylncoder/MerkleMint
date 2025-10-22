// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./MyMintableToken.sol";

contract AirDrop is Ownable {
    bytes32 public merkleRoot;
    MyMintableToken public token;
    mapping(address => bool) public claimed;

    event MerkleRootUpdated(bytes32 newRoot);
    event Claimed(address indexed account, uint256 amount);

    constructor(address tokenAddress, bytes32 root) Ownable(msg.sender) {
        token = MyMintableToken(tokenAddress);
        merkleRoot = root;
    }

    // 🔧 Nếu cần đổi root (trong trường hợp thay whitelist)
    function setMerkleRoot(bytes32 root) external onlyOwner {
        merkleRoot = root;
        emit MerkleRootUpdated(root);
    }

    // 🎁 Người dùng claim token nếu nằm trong whitelist
    function claim(uint256 amount, bytes32[] calldata proof) external {
        require(!claimed[msg.sender], "Already claimed");
        require(merkleRoot != bytes32(0), "Merkle root not set");

        // Tạo leaf (ph��i trùng với off-chain)
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, amount));
        require(MerkleProof.verify(proof, merkleRoot, leaf), "Invalid proof");

        claimed[msg.sender] = true;

        // Mint token trực tiếp cho người claim
        token.mint(msg.sender, amount);
        emit Claimed(msg.sender, amount);
    }
}