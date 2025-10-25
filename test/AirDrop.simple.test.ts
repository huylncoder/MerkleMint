import { expect } from "chai";
import { ethers } from "hardhat";
import "@nomicfoundation/hardhat-chai-matchers";
import { AirDrop, MyMintableToken } from "../typechain";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("AirDrop Contract - Quick Tests", () => {
  let airDrop: AirDrop;
  let token: MyMintableToken;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  // Danh sách whitelist
  const whitelist: { address: string; amount: bigint }[] = [
    { address: "", amount: ethers.parseEther("1000") },
    { address: "", amount: ethers.parseEther("1200") },
  ];

  let merkleTree: MerkleTree;
  let merkleRoot: string;

  beforeEach(async () => {
    [owner, user1, user2] = await ethers.getSigners();

    // Cập nhật địa chỉ thật
    whitelist[0].address = user1.address;
    whitelist[1].address = user2.address;

    // Deploy MyMintableToken
    const Token = await ethers.getContractFactory("MyMintableToken");
    token = (await Token.deploy()) as MyMintableToken;
    await token.waitForDeployment();

    // ✅ Tạo Merkle tree đúng cách
    const leaves = whitelist.map((entry) =>
      keccak256(ethers.solidityPacked(["address", "uint256"], [entry.address, entry.amount]))
    );
    merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    merkleRoot = merkleTree.getHexRoot();

    // Deploy AirDrop
    const AirDropFactory = await ethers.getContractFactory("AirDrop");
    airDrop = (await AirDropFactory.deploy()) as AirDrop;
    await airDrop.waitForDeployment();

    // Initialize
    await airDrop.initialize(await token.getAddress(), merkleRoot);

    // Gán quyền mint
    await token.grantRole(await token.MINTER_ROLE(), await airDrop.getAddress());
  });

  // ==============================
  describe("Basic Functionality", () => {
    it("should initialize correctly", async () => {
      expect(await airDrop.token()).to.equal(await token.getAddress());
      expect(await airDrop.merkleRoot()).to.equal(merkleRoot);
    });

    it("should allow valid users to claim tokens", async () => {
      const user = user1;
      const amount = whitelist[0].amount;

      const leaf = keccak256(ethers.solidityPacked(["address", "uint256"], [user.address, amount]));
      const proof = merkleTree.getHexProof(leaf);

      const balanceBefore = await token.balanceOf(user.address);

      await airDrop.connect(user).claim(amount, proof);

      const balanceAfter = await token.balanceOf(user.address);
      expect(balanceAfter - balanceBefore).to.equal(amount);
    });

    it("should prevent double claiming", async () => {
      const user = user1;
      const amount = whitelist[0].amount;

      const leaf = keccak256(ethers.solidityPacked(["address", "uint256"], [user.address, amount]));
      const proof = merkleTree.getHexProof(leaf);

      await airDrop.connect(user).claim(amount, proof);

      await expect(airDrop.connect(user).claim(amount, proof)).to.be.revertedWith("Already claimed");
    });

    it("should reject zero amount claims", async () => {
      const user = user1;
      const proof: string[] = [];

      await expect(airDrop.connect(user).claim(0n, proof)).to.be.reverted;
    });
  });

  // ==============================
  describe("Access Control", () => {
    it("should allow admin to set merkle root", async () => {
      const newRoot = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
      await airDrop.setMerkleRoot(newRoot);
      expect(await airDrop.merkleRoot()).to.equal(newRoot);
    });

    it("should reject non-admin from setting root", async () => {
      const newRoot = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef";
      await expect(airDrop.connect(user1).setMerkleRoot(newRoot)).to.be.revertedWith("AccessControl");
    });

    it("should allow admin to set upgrade amount", async () => {
      const newAmount = ethers.parseEther("500");
      await airDrop.setUpgradeAmount(newAmount);
      expect(await airDrop.upgradeAmount()).to.equal(newAmount);
    });
  });

  // ==============================
  describe("Statistics", () => {
    it("should track claim statistics", async () => {
      const user = user1;
      const amount = whitelist[0].amount;

      const leaf = keccak256(ethers.solidityPacked(["address", "uint256"], [user.address, amount]));
      const proof = merkleTree.getHexProof(leaf);

      await airDrop.connect(user).claim(amount, proof);

      const [totalClaimed, totalClaimers] = await airDrop.getClaimStats();
      expect(totalClaimed).to.equal(amount);
      expect(totalClaimers).to.equal(1n);
    });
  });

  // ==============================
  describe("Gas Usage", () => {
    it("should use reasonable gas for claiming", async () => {
      const user = user1;
      const amount = whitelist[0].amount;

      const leaf = keccak256(ethers.solidityPacked(["address", "uint256"], [user.address, amount]));
      const proof = merkleTree.getHexProof(leaf);

      const tx = await airDrop.connect(user).claim(amount, proof);
      const receipt = await tx.wait();

      // Gas hợp lý (ví dụ < 120k)
      expect(receipt?.gasUsed).to.be.lessThan(120000n);
    });
  });
});
