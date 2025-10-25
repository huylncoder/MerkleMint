// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./MyMintableToken.sol";

/**
 * @title AirDrop
 * @dev Hợp đồng airdrop Merkle có thể nâng cấp với mô hình UUPS proxy
 * @author nexm
 */
contract AirDrop is Initializable, AccessControlUpgradeable, UUPSUpgradeable, PausableUpgradeable {
    // Lỗi tùy chỉnh để tối ưu gas
    error AlreadyClaimed();
    error InvalidProof();
    error MerkleRootNotSet();
    error InvalidAmount();
    error InvalidTokenAddress();
    error UpgradeAmountTooHigh();
    error ContractPaused();

    // Roles
    bytes32 public constant ROOT_SETTER_ROLE = keccak256("ROOT_SETTER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // State variables
    bytes32 public merkleRoot;
    MyMintableToken public token;
    mapping(address => bool) public claimed;
    uint256 public upgradeAmount;
    uint256 public totalClaimed;
    uint256 public totalClaimers;

    // Events
    event MerkleRootUpdated(bytes32 indexed newRoot);
    event Claimed(address indexed account, uint256 amount);
    event UpgradeAmountUpdated(uint256 indexed newAmount);
    event EmergencyWithdraw(address indexed token, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Thiết lập số lượng nâng cấp (chỉ admin)
     * @param _upgradeAmount Số lượng nâng cấp mới
     */
    function setUpgradeAmount(uint256 _upgradeAmount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_upgradeAmount > 1000000 * 10**18) revert UpgradeAmountTooHigh();
        upgradeAmount = _upgradeAmount;
        emit UpgradeAmountUpdated(_upgradeAmount);
    }

    /**
     * @dev Khởi tạo hợp đồng
     * @param tokenAddress Địa chỉ của hợp đồng token
     * @param root Hash Merkle root
     */
    function initialize(address tokenAddress, bytes32 root) initializer public {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __Pausable_init();

        if (tokenAddress == address(0)) revert InvalidTokenAddress();
        if (root == bytes32(0)) revert MerkleRootNotSet();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ROOT_SETTER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        
        token = MyMintableToken(tokenAddress);
        merkleRoot = root;
    }
    
    /**
     * @dev Thiết lập Merkle root mới (chỉ vai trò root setter)
     * @param root Hash Merkle root mới
     */
    function setMerkleRoot(bytes32 root) external onlyRole(ROOT_SETTER_ROLE) {
        if (root == bytes32(0)) revert MerkleRootNotSet();
        merkleRoot = root;
        emit MerkleRootUpdated(root);
    }

    /**
     * @dev Nhận token cho địa chỉ trong whitelist
     * @param amount Số lượng token cần nhận
     * @param proof Bằng chứng Merkle để xác minh
     */
    function claim(uint256 amount, bytes32[] calldata proof) external whenNotPaused {
        if (claimed[msg.sender]) revert AlreadyClaimed();
        if (merkleRoot == bytes32(0)) revert MerkleRootNotSet();
        if (amount == 0) revert InvalidAmount();

        // Tạo hash leaf sử dụng abi.encode để bảo mật
        bytes32 leaf = keccak256(abi.encode(msg.sender, amount));
        if (!MerkleProof.verify(proof, merkleRoot, leaf)) revert InvalidProof();

        claimed[msg.sender] = true;
        totalClaimed += amount;
        totalClaimers += 1;

        // Mint token trực tiếp cho người nhận
        token.mint(msg.sender, amount);
        emit Claimed(msg.sender, amount);
    }

    /**
     * @dev Tạm dừng hợp đồng (chỉ vai trò pauser)
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Tiếp tục hợp đồng (chỉ vai trò pauser)
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev Hàm rút khẩn cấp cho token bị kẹt
     * @param tokenAddress Địa chỉ token cần rút
     * @param amount Số lượng cần rút
     */
    function emergencyWithdraw(address tokenAddress, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (tokenAddress == address(0)) revert InvalidTokenAddress();
        if (amount == 0) revert InvalidAmount();
        
        IERC20(tokenAddress).transfer(msg.sender, amount);
        emit EmergencyWithdraw(tokenAddress, amount);
    }

    /**
     * @dev Trả về thống kê nhận token
     * @return _totalClaimed Tổng số lượng đã nhận
     * @return _totalClaimers Tổng số người đã nhận
     */
    function getClaimStats() external view returns (uint256 _totalClaimed, uint256 _totalClaimers) {
        return (totalClaimed, totalClaimers);
    }

    /**
     * @dev Ủy quyền nâng cấp hợp đồng (chỉ vai trò upgrader)
     * @param newImplementation Địa chỉ của implementation mới
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        onlyRole(UPGRADER_ROLE)
        override
    {
        // Có thể thêm xác minh bổ sung ở đây
        if (newImplementation == address(0)) revert InvalidTokenAddress();
    }

    // Dành chỗ lưu trữ cho các nâng cấp tương lai
    uint256[45] private __gap;
}
