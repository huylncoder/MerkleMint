import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { AirDrop, MyMintableToken, AirDropV2 } from "../typechain";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Upgrade Tests", () => {
  let airDrop: AirDrop;
  let airDropV2: AirDropV2;
  let token: MyMintableToken;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const merkleRoot = "0x08f367931976a91f5f9c53602606b54e58dec72fd089495ea8214cfa83295d5b";

  beforeEach(async () => {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy MyMintableToken
    const MyMintableTokenFactory = await ethers.getContractFactory("MyMintableToken");
    token = await MyMintableTokenFactory.deploy();
    await token.waitForDeployment();

    // Deploy AirDrop V1
    const AirDropFactory = await ethers.getContractFactory("AirDrop");
    airDrop = (await upgrades.deployProxy(AirDropFactory, [await token.getAddress(), merkleRoot], {
      kind: "uups",
    })) as AirDrop;
    await airDrop.waitForDeployment();

    // Grant MINTER_ROLE to AirDrop
    await token.grantRole(await token.MINTER_ROLE(), await airDrop.getAddress());
  });

  describe("Upgrade to V2", () => {
    it("should upgrade successfully", async () => {
      // Deploy V2 implementation
      const AirDropV2Factory = await ethers.getContractFactory("AirDropV2");
      airDropV2 = (await upgrades.upgradeProxy(await airDrop.getAddress(), AirDropV2Factory)) as AirDropV2;
      await airDropV2.waitForDeployment();

      // Check that the proxy address remains the same
      expect(await airDropV2.getAddress()).to.equal(await airDrop.getAddress());

      // Check that V2 functions are available
      expect(await airDropV2.version()).to.equal("V2");
    });

    it("should preserve state after upgrade", async () => {
      // Set some state before upgrade
      await airDrop.setUpgradeAmount("500000000000000000000");
      await airDrop.setMerkleRoot("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");

      // Upgrade to V2
      const AirDropV2Factory = await ethers.getContractFactory("AirDropV2");
      airDropV2 = (await upgrades.upgradeProxy(await airDrop.getAddress(), AirDropV2Factory)) as AirDropV2;
      await airDropV2.waitForDeployment();

      // Check that state is preserved
      expect(await airDropV2.upgradeAmount()).to.equal("500000000000000000000");
      expect(await airDropV2.merkleRoot()).to.equal(
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
      );
    });

    it("should allow V2 specific functions", async () => {
      // Upgrade to V2
      const AirDropV2Factory = await ethers.getContractFactory("AirDropV2");
      airDropV2 = (await upgrades.upgradeProxy(await airDrop.getAddress(), AirDropV2Factory)) as AirDropV2;
      await airDropV2.waitForDeployment();

      // Test V2 specific function
      await expect(
        airDropV2.setBatchMerkleRoot(["0x1111111111111111111111111111111111111111111111111111111111111111"])
      ).to.emit(airDropV2, "BatchMerkleRootUpdated");
    });
  });

  describe("Upgrade Authorization", () => {
    it("should allow upgrader role to upgrade", async () => {
      // Grant upgrader role to user1
      await airDrop.grantRole(await airDrop.UPGRADER_ROLE(), user1.address);

      // User1 should be able to upgrade
      const AirDropV2Factory = await ethers.getContractFactory("AirDropV2");
      await expect(
        upgrades.upgradeProxy(await airDrop.getAddress(), AirDropV2Factory, {
          call: "initializeV2",
          args: [],
        })
      ).to.not.be.reverted;
    });

    it("should reject non-upgrader from upgrading", async () => {
      // User2 should not be able to upgrade
      const AirDropV2Factory = await ethers.getContractFactory("AirDropV2");

      // This should fail because user2 doesn't have UPGRADER_ROLE
      await expect(airDrop.connect(user2).upgradeToAndCall(await AirDropV2Factory.getAddress(), "0x")).to.be.reverted;
    });
  });

  describe("Storage Layout Compatibility", () => {
    it("should maintain storage layout", async () => {
      // Set all state variables
      await airDrop.setUpgradeAmount("1000000000000000000000");
      await airDrop.setMerkleRoot("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");

      // Upgrade to V2
      const AirDropV2Factory = await ethers.getContractFactory("AirDropV2");
      airDropV2 = (await upgrades.upgradeProxy(await airDrop.getAddress(), AirDropV2Factory)) as AirDropV2;
      await airDropV2.waitForDeployment();

      // Check that all state variables are preserved
      expect(await airDropV2.token()).to.equal(await token.getAddress());
      expect(await airDropV2.merkleRoot()).to.equal(
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
      );
      expect(await airDropV2.upgradeAmount()).to.equal("1000000000000000000000");
      expect(await airDropV2.totalClaimed()).to.equal(0);
      expect(await airDropV2.totalClaimers()).to.equal(0);
    });
  });

  describe("Upgrade Validation", () => {
    it("should validate new implementation", async () => {
      // Create a malicious implementation that tries to change storage layout
      const MaliciousFactory = await ethers.getContractFactory("MaliciousAirDrop");

      await expect(upgrades.upgradeProxy(await airDrop.getAddress(), MaliciousFactory)).to.be.reverted;
    });

    it("should reject zero address implementation", async () => {
      await expect(airDrop.upgradeToAndCall(ethers.ZeroAddress, "0x")).to.be.revertedWithCustomError(
        airDrop,
        "InvalidTokenAddress"
      );
    });
  });

  describe("Upgrade Events", () => {
    it("should emit upgrade events", async () => {
      const AirDropV2Factory = await ethers.getContractFactory("AirDropV2");

      await expect(upgrades.upgradeProxy(await airDrop.getAddress(), AirDropV2Factory)).to.emit(airDrop, "Upgraded");
    });
  });
});

// Mock contracts for testing
describe("Mock Contracts", () => {
  it("should deploy malicious contract for testing", async () => {
    const MaliciousFactory = await ethers.getContractFactory("MaliciousAirDrop");
    const malicious = await MaliciousFactory.deploy();
    await malicious.waitForDeployment();

    // This contract should have different storage layout
    expect(await malicious.getAddress()).to.not.equal(ethers.ZeroAddress);
  });
});
