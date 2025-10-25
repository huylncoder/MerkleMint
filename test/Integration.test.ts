import { expect } from "chai";
import { ethers } from "hardhat";
import { AirDrop, MyMintableToken } from "../typechain";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Integration Tests", () => {
  let airDrop: AirDrop;
  let token: MyMintableToken;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  // Test data
  const whitelist = [
    { address: "", amount: "1000000000000000000000" }, // 1000 tokens
    { address: "", amount: "1200000000000000000000" }, // 1200 tokens
    { address: "", amount: "1400000000000000000000" }, // 1400 tokens
  ];

  let merkleTree: MerkleTree;
  let merkleRoot: string;

  beforeEach(async () => {
    [owner, user1, user2, user3] = await ethers.getSigners();

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

  describe("Complete Airdrop Flow", () => {
    it("should handle complete airdrop process", async () => {
      // All users claim their tokens
      for (let i = 0; i < whitelist.length; i++) {
        const user = [user1, user2, user3][i];
        const amount = whitelist[i].amount;

        const leaf = keccak256(ethers.solidityPackedKeccak256(["address", "uint256"], [user.address, amount]));
        const proof = merkleTree.getHexProof(leaf);

        await expect(airDrop.connect(user).claim(amount, proof))
          .to.emit(airDrop, "Claimed")
          .withArgs(user.address, amount);

        expect(await token.balanceOf(user.address)).to.equal(amount);
      }

      // Check final statistics
      const [totalClaimed, totalClaimers] = await airDrop.getClaimStats();
      const expectedTotal = BigInt(whitelist[0].amount) + BigInt(whitelist[1].amount) + BigInt(whitelist[2].amount);

      expect(totalClaimed).to.equal(expectedTotal);
      expect(totalClaimers).to.equal(3);
    });

    it("should handle partial airdrop completion", async () => {
      // Only first two users claim
      const user1Amount = whitelist[0].amount;
      const user1Leaf = keccak256(ethers.solidityPackedKeccak256(["address", "uint256"], [user1.address, user1Amount]));
      const user1Proof = merkleTree.getHexProof(user1Leaf);
      await airDrop.connect(user1).claim(user1Amount, user1Proof);

      const user2Amount = whitelist[1].amount;
      const user2Leaf = keccak256(ethers.solidityPackedKeccak256(["address", "uint256"], [user2.address, user2Amount]));
      const user2Proof = merkleTree.getHexProof(user2Leaf);
      await airDrop.connect(user2).claim(user2Amount, user2Proof);

      // Check statistics
      const [totalClaimed, totalClaimers] = await airDrop.getClaimStats();
      const expectedTotal = BigInt(user1Amount) + BigInt(user2Amount);

      expect(totalClaimed).to.equal(expectedTotal);
      expect(totalClaimers).to.equal(2);

      // Third user should still be able to claim
      const user3Amount = whitelist[2].amount;
      const user3Leaf = keccak256(ethers.solidityPackedKeccak256(["address", "uint256"], [user3.address, user3Amount]));
      const user3Proof = merkleTree.getHexProof(user3Leaf);

      await expect(airDrop.connect(user3).claim(user3Amount, user3Proof))
        .to.emit(airDrop, "Claimed")
        .withArgs(user3.address, user3Amount);
    });
  });

  describe("Merkle Root Updates", () => {
    it("should handle merkle root updates", async () => {
      // First user claims with original root
      const user1Amount = whitelist[0].amount;
      const user1Leaf = keccak256(ethers.solidityPackedKeccak256(["address", "uint256"], [user1.address, user1Amount]));
      const user1Proof = merkleTree.getHexProof(user1Leaf);
      await airDrop.connect(user1).claim(user1Amount, user1Proof);

      // Update merkle root (simulating new airdrop round)
      const newWhitelist = [
        { address: user2.address, amount: "2000000000000000000000" }, // 2000 tokens
        { address: user3.address, amount: "3000000000000000000000" }, // 3000 tokens
      ];

      const newLeaves = newWhitelist.map((entry) =>
        keccak256(ethers.solidityPackedKeccak256(["address", "uint256"], [entry.address, entry.amount]))
      );
      const newMerkleTree = new MerkleTree(newLeaves, keccak256, { sortPairs: true });
      const newRoot = newMerkleTree.getHexRoot();

      await airDrop.setMerkleRoot(newRoot);

      // Second user claims with new root
      const user2Amount = newWhitelist[0].amount;
      const user2Leaf = keccak256(ethers.solidityPackedKeccak256(["address", "uint256"], [user2.address, user2Amount]));
      const user2Proof = newMerkleTree.getHexProof(user2Leaf);

      await expect(airDrop.connect(user2).claim(user2Amount, user2Proof))
        .to.emit(airDrop, "Claimed")
        .withArgs(user2.address, user2Amount);

      expect(await token.balanceOf(user2.address)).to.equal(user2Amount);
    });
  });

  describe("Pause and Resume", () => {
    it("should handle pause and resume during airdrop", async () => {
      // First user claims successfully
      const user1Amount = whitelist[0].amount;
      const user1Leaf = keccak256(ethers.solidityPackedKeccak256(["address", "uint256"], [user1.address, user1Amount]));
      const user1Proof = merkleTree.getHexProof(user1Leaf);
      await airDrop.connect(user1).claim(user1Amount, user1Proof);

      // Pause the contract
      await airDrop.pause();
      expect(await airDrop.paused()).to.be.true;

      // Second user should not be able to claim
      const user2Amount = whitelist[1].amount;
      const user2Leaf = keccak256(ethers.solidityPackedKeccak256(["address", "uint256"], [user2.address, user2Amount]));
      const user2Proof = merkleTree.getHexProof(user2Leaf);

      await expect(airDrop.connect(user2).claim(user2Amount, user2Proof)).to.be.revertedWithCustomError(
        airDrop,
        "ContractPaused"
      );

      // Unpause the contract
      await airDrop.unpause();
      expect(await airDrop.paused()).to.be.false;

      // Second user should now be able to claim
      await expect(airDrop.connect(user2).claim(user2Amount, user2Proof))
        .to.emit(airDrop, "Claimed")
        .withArgs(user2.address, user2Amount);
    });
  });

  describe("Emergency Scenarios", () => {
    it("should handle emergency withdraw", async () => {
      // Mint some tokens to the contract (simulating stuck tokens)
      await token.mint(await airDrop.getAddress(), "1000000000000000000000");

      const ownerBalanceBefore = await token.balanceOf(owner.address);
      const contractBalanceBefore = await token.balanceOf(await airDrop.getAddress());

      expect(contractBalanceBefore).to.equal("1000000000000000000000");

      // Emergency withdraw
      await expect(airDrop.emergencyWithdraw(await token.getAddress(), "1000000000000000000000"))
        .to.emit(airDrop, "EmergencyWithdraw")
        .withArgs(await token.getAddress(), "1000000000000000000000");

      const ownerBalanceAfter = await token.balanceOf(owner.address);
      const contractBalanceAfter = await token.balanceOf(await airDrop.getAddress());

      expect(ownerBalanceAfter - ownerBalanceBefore).to.equal("1000000000000000000000");
      expect(contractBalanceAfter).to.equal(0);
    });
  });

  describe("Gas Optimization", () => {
    it("should use reasonable gas for multiple claims", async () => {
      let totalGasUsed = 0;

      for (let i = 0; i < whitelist.length; i++) {
        const user = [user1, user2, user3][i];
        const amount = whitelist[i].amount;

        const leaf = keccak256(ethers.solidityPackedKeccak256(["address", "uint256"], [user.address, amount]));
        const proof = merkleTree.getHexProof(leaf);

        const tx = await airDrop.connect(user).claim(amount, proof);
        const receipt = await tx.wait();

        totalGasUsed += Number(receipt?.gasUsed || 0);
      }

      // Total gas should be reasonable (less than 300k for 3 claims)
      expect(totalGasUsed).to.be.lessThan(300000);
    });
  });

  describe("Edge Cases", () => {
    it("should handle large whitelist", async () => {
      // Create a larger whitelist
      const largeWhitelist = [];
      for (let i = 0; i < 10; i++) {
        const user = await ethers.getSigner(i.toString());
        largeWhitelist.push({
          address: user.address,
          amount: "1000000000000000000000",
        });
      }

      const leaves = largeWhitelist.map((entry) =>
        keccak256(ethers.solidityPackedKeccak256(["address", "uint256"], [entry.address, entry.amount]))
      );
      const largeMerkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
      const largeRoot = largeMerkleTree.getHexRoot();

      // Update merkle root
      await airDrop.setMerkleRoot(largeRoot);

      // First user should be able to claim
      const firstUser = await ethers.getSigner("0");
      const amount = "1000000000000000000000";
      const leaf = keccak256(ethers.solidityPackedKeccak256(["address", "uint256"], [firstUser.address, amount]));
      const proof = largeMerkleTree.getHexProof(leaf);

      await expect(airDrop.connect(firstUser).claim(amount, proof))
        .to.emit(airDrop, "Claimed")
        .withArgs(firstUser.address, amount);
    });

    it("should handle zero merkle root", async () => {
      await expect(airDrop.setMerkleRoot(ethers.ZeroHash)).to.be.revertedWithCustomError(airDrop, "MerkleRootNotSet");
    });
  });
});
