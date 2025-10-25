// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AirDrop.sol";

/**
 * @title AirDropV2
 * @dev Phiên bản nâng cấp của AirDrop với các tính năng bổ sung
 * @author nexm
 */
contract AirDropV2 is AirDrop {
    // Biến trạng thái mới (phải thêm sau các biến hiện có)
    string public version;
    bytes32[] public merkleRoots;
    mapping(bytes32 => bool) public usedRoots;

    // New events
    event BatchMerkleRootUpdated(bytes32[] newRoots);
    event VersionUpdated(string newVersion);

    /**
     * @dev Khởi tạo các tính năng đặc biệt của V2
     */
    function initializeV2() external reinitializer(2) {
        version = "V2";
        emit VersionUpdated("V2");
    }

    /**
     * @dev Thiết lập nhiều Merkle root cho các thao tác hàng loạt
     * @param roots Mảng các hash Merkle root
     */
    function setBatchMerkleRoot(bytes32[] calldata roots) external onlyRole(ROOT_SETTER_ROLE) {
        for (uint256 i = 0; i < roots.length; i++) {
            if (roots[i] == bytes32(0)) revert MerkleRootNotSet();
            if (usedRoots[roots[i]]) continue; // Bỏ qua các root đã sử dụng
            
            merkleRoots.push(roots[i]);
            usedRoots[roots[i]] = true;
        }
        
        emit BatchMerkleRootUpdated(roots);
    }

    /**
     * @dev Trả về số lượng Merkle root
     * @return count Số lượng Merkle root
     */
    function getMerkleRootCount() external view returns (uint256 count) {
        return merkleRoots.length;
    }

    /**
     * @dev Trả về Merkle root cụ thể theo chỉ mục
     * @param index Chỉ mục của Merkle root
     * @return root Merkle root tại chỉ mục đã cho
     */
    function getMerkleRootByIndex(uint256 index) external view returns (bytes32 root) {
        require(index < merkleRoots.length, "Index out of bounds");
        return merkleRoots[index];
    }

    /**
     * @dev Hàm nhận token nâng cao với hỗ trợ nhiều root
     * @param amount Số lượng token cần nhận
     * @param proof Bằng chứng Merkle để xác minh
     * @param rootIndex Chỉ mục của Merkle root cần sử dụng
     */
    function claimWithRootIndex(
        uint256 amount, 
        bytes32[] calldata proof, 
        uint256 rootIndex
    ) external whenNotPaused {
        if (claimed[msg.sender]) revert AlreadyClaimed();
        if (rootIndex >= merkleRoots.length) revert InvalidAmount();
        if (amount == 0) revert InvalidAmount();

        bytes32 currentRoot = merkleRoots[rootIndex];
        if (currentRoot == bytes32(0)) revert MerkleRootNotSet();

        // Tạo hash leaf sử dụng abi.encode để bảo mật
        bytes32 leaf = keccak256(abi.encode(msg.sender, amount));
        if (!MerkleProof.verify(proof, currentRoot, leaf)) revert InvalidProof();

        claimed[msg.sender] = true;
        totalClaimed += amount;
        totalClaimers += 1;

        // Mint token trực tiếp cho người nhận
        token.mint(msg.sender, amount);
        emit Claimed(msg.sender, amount);
    }

    /**
     * @dev Hàm nhận token hàng loạt cho nhiều người dùng
     * @param amounts Mảng số lượng cần nhận
     * @param proofs Mảng bằng chứng Merkle
     * @param rootIndex Chỉ mục của Merkle root cần sử dụng
     */
    function batchClaim(
        uint256[] calldata amounts,
        bytes32[][] calldata proofs,
        uint256 rootIndex
    ) external whenNotPaused {
        require(amounts.length == proofs.length, "Arrays length mismatch");
        require(rootIndex < merkleRoots.length, "Invalid root index");

        bytes32 currentRoot = merkleRoots[rootIndex];
        if (currentRoot == bytes32(0)) revert MerkleRootNotSet();

        for (uint256 i = 0; i < amounts.length; i++) {
            if (amounts[i] == 0) continue;

            // Tạo hash leaf
            bytes32 leaf = keccak256(abi.encode(msg.sender, amounts[i]));
            if (!MerkleProof.verify(proofs[i], currentRoot, leaf)) continue;

            // Chỉ nhận nếu chưa được nhận
            if (!claimed[msg.sender]) {
                claimed[msg.sender] = true;
                totalClaimers += 1;
            }

            totalClaimed += amounts[i];
            token.mint(msg.sender, amounts[i]);
            emit Claimed(msg.sender, amounts[i]);
        }
    }

    /**
     * @dev Trả về thống kê nâng cao
     * @return _totalClaimed Tổng số lượng đã nhận
     * @return _totalClaimers Tổng số người đã nhận
     * @return _merkleRootCount Số lượng Merkle root
     * @return _version Phiên bản hợp đồng
     */
    function getEnhancedStats() external view returns (
        uint256 _totalClaimed,
        uint256 _totalClaimers,
        uint256 _merkleRootCount,
        string memory _version
    ) {
        return (totalClaimed, totalClaimers, merkleRoots.length, version);
    }

    // Dành chỗ lưu trữ cho các nâng cấp tương lai
    uint256[40] private __gap;
}
