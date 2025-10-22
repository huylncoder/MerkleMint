// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./MyMintableToken.sol";

contract AirDrop is Initializable, OwnableUpgradeable {
    bytes32 public merkleRoot;
    MyMintableToken public token;
    mapping(address => bool) public claimed;

    event Claimed(address indexed user, uint256 amount);

    function initialize(address _token) initializer public {
        __Ownable_init(msg.sender);
        token = MyMintableToken(_token);
    }

    function setMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        merkleRoot = _merkleRoot;
    }

    function claim(uint256 amount, bytes32[] calldata merkleProof) external {
        // require không bị claim trước đó
        require(!claimed[msg.sender], "Address has already claimed");
        // xác minh merkle proof và dùng root đã set để xác thực proof
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, amount));
        require(MerkleProof.verify(merkleProof, merkleRoot, leaf), "Invalid merkle proof");
        
        // Nếu hợp lệ và chưa claim trước đó, contract đánh dấu hasClaim = true
        claimed[msg.sender] = true;
        token.mint(msg.sender, amount);
        emit Claimed(msg.sender, amount);
    }

    function hasAddressClaimed(address account) external view returns (bool) {
        return claimed[account];
    }
}