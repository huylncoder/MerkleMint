import { expect } from "chai";
import { ethers } from "hardhat";
import "@nomicfoundation/hardhat-chai-matchers";
import { AirDrop, MyMintableToken } from "../typechain";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("AirDrop Contract - Comprehensive Tests", () => {
  let airDrop: AirDrop;
  let token: MyMintableToken;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;
  let nonWhitelistedUser: SignerWithAddress;

  // Test data
  const whitelist = [
    { address: "", amount: "1000000000000000000000" }, // 1000 tokens
    { address: "", amount: "1200000000000000000000" }, // 1200 tokens
    { address: "", amount: "1400000000000000000000" }, // 1400 tokens
  ];

  let merkleTree: MerkleTree;
  let merkleRoot: string;

  beforeEach(async () => {
    [owner, user1, user2, user3, nonWhitelistedUser] = await ethers.getSigners();

    // Update whitelist with actual addresses
    whitelist[0].address = user1.address;
    whitelist[1].address = user2.address;
    whitelist[2].address = user3.address;

    // Deploy MyMintableToken
    const MyMintableTokenFactory = await ethers.getContractFactory("MyMintableToken");
    token = await MyMintableTokenFactory.deploy();
    await token.waitForDeployment();

    // Generate Merkle tree
    const leaves = whitelist.map((entry) =>
      keccak256(ethers.solidityPackedKeccak256(["address", "uint256"], [entry.address, entry.amount]))
    );
    merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    merkleRoot = merkleTree.getHexRoot();

    // Deploy AirDrop
    const AirDropFactory = await ethers.getContractFactory("AirDrop");
    airDrop = await AirDropFactory.deploy();
    await airDrop.waitForDeployment();

    // Initialize AirDrop
    await airDrop.initialize(await token.getAddress(), merkleRoot);

    // Grant MINTER_ROLE to AirDrop
    await token.grantRole(await token.MINTER_ROLE(), await airDrop.getAddress());
  });

  describe("Initialization", () => {
    it("should initialize with correct values", async () => {
      expect(await airDrop.token()).to.equal(await token.getAddress());
      expect(await airDrop.merkleRoot()).to.equal(merkleRoot);
      expect(await airDrop.hasRole(await airDrop.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
    });

    it("should revert with zero token address", async () => {
      const AirDropFactory = await ethers.getContractFactory("AirDrop");
      const newAirDrop = await AirDropFactory.deploy();
      await expect(newAirDrop.initialize(ethers.ZeroAddress, merkleRoot)).to.be.revertedWithCustomError(
        newAirDrop,
        "InvalidTokenAddress"
      );
    });

    it("should revert with zero merkle root", async () => {
      const AirDropFactory = await ethers.getContractFactory("AirDrop");
      const newAirDrop = await AirDropFactory.deploy();
      await expect(newAirDrop.initialize(await token.getAddress(), ethers.ZeroHash)).to.be.revertedWithCustomError(
        newAirDrop,
        "MerkleRootNotSet"
      );
    });
  });

  describe("Claiming", () => {
    it("should allow valid users to claim tokens", async () => {
      const user = user1;
      const amount = whitelist[0].amount;

      const leaf = keccak256(ethers.solidityPackedKeccak256(["address", "uint256"], [user.address, amount]));
      const proof = merkleTree.getHexProof(leaf);

      const balanceBefore = await token.balanceOf(user.address);

      await airDrop.connect(user).claim(amount, proof);

      const balanceAfter = await token.balanceOf(user.address);
      expect(balanceAfter - balanceBefore).to.equal(amount);
    });

    it("should reject invalid proofs", async () => {
      const user = user1;
      const amount = whitelist[0].amount;
      const invalidProof = ["0x1234567890abcdef"];

      await expect(airDrop.connect(user).claim(amount, invalidProof)).to.be.revertedWithCustomError(
        airDrop,
        "InvalidProof"
      );
    });

    it("should prevent double claiming", async () => {
      const user = user1;
      const amount = whitelist[0].amount;

      const leaf = keccak256(ethers.solidityPackedKeccak256(["address", "uint256"], [user.address, amount]));
      const proof = merkleTree.getHexProof(leaf);

      // First claim should succeed
      await airDrop.connect(user).claim(amount, proof);

      // Second claim should fail
      await expect(airDrop.connect(user).claim(amount, proof)).to.be.revertedWithCustomError(airDrop, "AlreadyClaimed");
    });

    it("should reject zero amount claims", async () => {
      const user = user1;
      const amount = 0;
      const proof: string[] = [];

      await expect(airDrop.connect(user).claim(amount, proof)).to.be.revertedWithCustomError(airDrop, "InvalidAmount");
    });

    it("should reject claims from non-whitelisted addresses", async () => {
      const user = nonWhitelistedUser;
      const amount = "1000000000000000000000";
      const proof: string[] = [];

      await expect(airDrop.connect(user).claim(amount, proof)).to.be.revertedWithCustomError(airDrop, "InvalidProof");
    });

    it("should update claim statistics", async () => {
      const user = user1;
      const amount = whitelist[0].amount;

      const leaf = keccak256(ethers.solidityPackedKeccak256(["address", "uint256"], [user.address, amount]));
      const proof = merkleTree.getHexProof(leaf);

      await airDrop.connect(user).claim(amount, proof);

      const [totalClaimed, totalClaimers] = await airDrop.getClaimStats();
      expect(totalClaimed).to.equal(amount);
      expect(totalClaimers).to.equal(1);
    });
  });

  describe("Access Control", () => {
    it("should allow admin to set merkle root", async () => {
      const newRoot = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

      await airDrop.setMerkleRoot(newRoot);

      expect(await airDrop.merkleRoot()).to.equal(newRoot);
    });

    it("should reject non-admin from setting root", async () => {
      const newRoot = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

      await expect(airDrop.connect(user1).setMerkleRoot(newRoot)).to.be.revertedWithCustomError(
        airDrop,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("should allow admin to set upgrade amount", async () => {
      const newAmount = "500000000000000000000"; // 500 tokens

      await airDrop.setUpgradeAmount(newAmount);

      expect(await airDrop.upgradeAmount()).to.equal(newAmount);
    });

    it("should reject excessive upgrade amount", async () => {
      const excessiveAmount = "2000000000000000000000000"; // 2M tokens

      await expect(airDrop.setUpgradeAmount(excessiveAmount)).to.be.revertedWithCustomError(
        airDrop,
        "UpgradeAmountTooHigh"
      );
    });
  });

  describe("Pause Functionality", () => {
    it("should allow pauser to pause contract", async () => {
      await airDrop.pause();
      expect(await airDrop.paused()).to.be.true;
    });

    it("should allow pauser to unpause contract", async () => {
      await airDrop.pause();
      await airDrop.unpause();
      expect(await airDrop.paused()).to.be.false;
    });

    it("should prevent claiming when paused", async () => {
      await airDrop.pause();

      const user = user1;
      const amount = whitelist[0].amount;
      const leaf = keccak256(ethers.solidityPackedKeccak256(["address", "uint256"], [user.address, amount]));
      const proof = merkleTree.getHexProof(leaf);

      await expect(airDrop.connect(user).claim(amount, proof)).to.be.revertedWithCustomError(airDrop, "ContractPaused");
    });

    it("should reject non-pauser from pausing", async () => {
      await expect(airDrop.connect(user1).pause()).to.be.revertedWithCustomError(
        airDrop,
        "AccessControlUnauthorizedAccount"
      );
    });
  });

  describe("Emergency Functions", () => {
    it("should allow admin to emergency withdraw", async () => {
      // First mint some tokens to the contract
      await token.mint(await airDrop.getAddress(), "1000000000000000000000");

      const balanceBefore = await token.balanceOf(owner.address);

      await airDrop.emergencyWithdraw(await token.getAddress(), "1000000000000000000000");

      const balanceAfter = await token.balanceOf(owner.address);
      expect(balanceAfter - balanceBefore).to.equal("1000000000000000000000");
    });

    it("should reject non-admin from emergency withdraw", async () => {
      await expect(
        airDrop.connect(user1).emergencyWithdraw(await token.getAddress(), "1000000000000000000000")
      ).to.be.revertedWithCustomError(airDrop, "AccessControlUnauthorizedAccount");
    });

    it("should reject emergency withdraw with zero amount", async () => {
      await expect(airDrop.emergencyWithdraw(await token.getAddress(), 0)).to.be.revertedWithCustomError(
        airDrop,
        "InvalidAmount"
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle multiple users claiming", async () => {
      // User 1 claims
      const user1Amount = whitelist[0].amount;
      const user1Leaf = keccak256(ethers.solidityPackedKeccak256(["address", "uint256"], [user1.address, user1Amount]));
      const user1Proof = merkleTree.getHexProof(user1Leaf);
      await airDrop.connect(user1).claim(user1Amount, user1Proof);

      // User 2 claims
      const user2Amount = whitelist[1].amount;
      const user2Leaf = keccak256(ethers.solidityPackedKeccak256(["address", "uint256"], [user2.address, user2Amount]));
      const user2Proof = merkleTree.getHexProof(user2Leaf);
      await airDrop.connect(user2).claim(user2Amount, user2Proof);

      // Check statistics
      const [totalClaimed, totalClaimers] = await airDrop.getClaimStats();
      expect(totalClaimed).to.equal(BigInt(user1Amount) + BigInt(user2Amount));
      expect(totalClaimers).to.equal(2);
    });

    it("should handle empty proof array", async () => {
      const user = user1;
      const amount = whitelist[0].amount;
      const emptyProof: string[] = [];

      await expect(airDrop.connect(user).claim(amount, emptyProof)).to.be.revertedWithCustomError(
        airDrop,
        "InvalidProof"
      );
    });

    it("should handle invalid addresses in proof", async () => {
      const user = user1;
      const amount = whitelist[0].amount;
      const invalidProof = ["0x0000000000000000000000000000000000000000000000000000000000000000"];

      await expect(airDrop.connect(user).claim(amount, invalidProof)).to.be.revertedWithCustomError(
        airDrop,
        "InvalidProof"
      );
    });
  });

  describe("Gas Optimization", () => {
    it("should use reasonable gas for claiming", async () => {
      const user = user1;
      const amount = whitelist[0].amount;
      const leaf = keccak256(ethers.solidityPackedKeccak256(["address", "uint256"], [user.address, amount]));
      const proof = merkleTree.getHexProof(leaf);

      const tx = await airDrop.connect(user).claim(amount, proof);
      const receipt = await tx.wait();

      // Gas should be reasonable (less than 100k gas)
      expect(receipt?.gasUsed).to.be.lessThan(100000);
    });
  });
});
