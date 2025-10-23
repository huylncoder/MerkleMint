// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./MyMintableToken.sol";

contract AirDrop is AccessControl {
    bytes32 public constant ROOT_SETTER_ROLE = keccak256("ROOT_SETTER_ROLE");

    bytes32 public merkleRoot;
    MyMintableToken public token;
    mapping(address => bool) public claimed;

    event MerkleRootUpdated(bytes32 newRoot);
    event Claimed(address indexed account, uint256 amount);

    constructor(address tokenAddress, bytes32 root) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ROOT_SETTER_ROLE, msg.sender);
        token = MyMintableToken(tokenAddress);
        merkleRoot = root;
    }
    
    // Nếu cần đổi root (trong trường hợp thay whitelist)
    function setMerkleRoot(bytes32 root) external onlyRole(ROOT_SETTER_ROLE) {
        merkleRoot = root;
        emit MerkleRootUpdated(root);
    }

    // Người dùng claim token nằm trong whitelist
    function claim(uint256 amount, bytes32[] calldata proof) external {
        require(!claimed[msg.sender], "Already claimed");
        require(merkleRoot != bytes32(0), "Merkle root not set");

        // Tạo leaf 
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, amount));
        require(MerkleProof.verify(proof, merkleRoot, leaf), "Invalid proof");

        claimed[msg.sender] = true;

        // Mint token trực tiếp cho người claim
        token.mint(msg.sender, amount);
        emit Claimed(msg.sender, amount);
    }
}

