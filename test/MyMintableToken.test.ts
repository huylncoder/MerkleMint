import { expect } from "chai";
import { ethers } from "hardhat";
import { MyMintableToken } from "../typechain";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("MyMintableToken Contract", () => {
  let token: MyMintableToken;
  let owner: SignerWithAddress;
  let minter: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async () => {
    [owner, minter, user1, user2] = await ethers.getSigners();

    const MyMintableTokenFactory = await ethers.getContractFactory("MyMintableToken");
    token = await MyMintableTokenFactory.deploy();
    await token.waitForDeployment();
  });

  describe("Initialization", () => {
    it("should initialize with correct values", async () => {
      expect(await token.name()).to.equal("MyMintableToken");
      expect(await token.symbol()).to.equal("MTK");
      expect(await token.decimals()).to.equal(18);
      expect(await token.totalSupply()).to.equal(0);
    });

    it("should grant admin role to deployer", async () => {
      expect(await token.hasRole(await token.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
    });

    it("should grant minter role to deployer", async () => {
      expect(await token.hasRole(await token.MINTER_ROLE(), owner.address)).to.be.true;
    });
  });

  describe("Minting", () => {
    it("should allow minter to mint tokens", async () => {
      const amount = "1000000000000000000000"; // 1000 tokens

      await expect(token.mint(user1.address, amount))
        .to.emit(token, "Transfer")
        .withArgs(ethers.ZeroAddress, user1.address, amount);

      expect(await token.balanceOf(user1.address)).to.equal(amount);
      expect(await token.totalSupply()).to.equal(amount);
    });

    it("should reject non-minter from minting", async () => {
      const amount = "1000000000000000000000";

      await expect(token.connect(user1).mint(user2.address, amount)).to.be.reverted;
    });

    it("should reject minting to zero address", async () => {
      const amount = "1000000000000000000000";

      await expect(token.mint(ethers.ZeroAddress, amount)).to.be.revertedWithCustomError(token, "ERC20InvalidReceiver");
    });

    it("should handle multiple mints", async () => {
      const amount1 = "1000000000000000000000";
      const amount2 = "2000000000000000000000";

      await token.mint(user1.address, amount1);
      await token.mint(user2.address, amount2);

      expect(await token.balanceOf(user1.address)).to.equal(amount1);
      expect(await token.balanceOf(user2.address)).to.equal(amount2);
      expect(await token.totalSupply()).to.equal(BigInt(amount1) + BigInt(amount2));
    });
  });

  describe("Burning", () => {
    beforeEach(async () => {
      // Mint some tokens first
      await token.mint(user1.address, "1000000000000000000000");
    });

    it("should allow minter to burn tokens", async () => {
      const burnAmount = "500000000000000000000"; // 500 tokens

      await expect(token.burn(user1.address, burnAmount))
        .to.emit(token, "Transfer")
        .withArgs(user1.address, ethers.ZeroAddress, burnAmount);

      expect(await token.balanceOf(user1.address)).to.equal("500000000000000000000");
      expect(await token.totalSupply()).to.equal("500000000000000000000");
    });

    it("should reject non-minter from burning", async () => {
      const burnAmount = "500000000000000000000";

      await expect(token.connect(user1).burn(user1.address, burnAmount)).to.be.reverted;
    });

    it("should reject burning from zero address", async () => {
      const burnAmount = "500000000000000000000";

      await expect(token.burn(ethers.ZeroAddress, burnAmount)).to.be.revertedWithCustomError(
        token,
        "ERC20InvalidSender"
      );
    });

    it("should reject burning more than balance", async () => {
      const burnAmount = "2000000000000000000000"; // 2000 tokens

      await expect(token.burn(user1.address, burnAmount)).to.be.revertedWithCustomError(
        token,
        "ERC20InsufficientBalance"
      );
    });
  });

  describe("Role Management", () => {
    it("should allow admin to grant minter role", async () => {
      await token.grantRole(await token.MINTER_ROLE(), minter.address);

      expect(await token.hasRole(await token.MINTER_ROLE(), minter.address)).to.be.true;
    });

    it("should allow admin to revoke minter role", async () => {
      await token.grantRole(await token.MINTER_ROLE(), minter.address);
      await token.revokeRole(await token.MINTER_ROLE(), minter.address);

      expect(await token.hasRole(await token.MINTER_ROLE(), minter.address)).to.be.false;
    });

    it("should reject non-admin from granting roles", async () => {
      await expect(token.connect(user1).grantRole(await token.MINTER_ROLE(), minter.address)).to.be.reverted;
    });

    it("should allow role holder to renounce their own role", async () => {
      await token.grantRole(await token.MINTER_ROLE(), minter.address);
      await token.connect(minter).renounceRole(await token.MINTER_ROLE(), minter.address);

      expect(await token.hasRole(await token.MINTER_ROLE(), minter.address)).to.be.false;
    });
  });

  describe("Standard ERC20 Functions", () => {
    beforeEach(async () => {
      await token.mint(user1.address, "1000000000000000000000");
    });

    it("should allow transfers", async () => {
      const transferAmount = "500000000000000000000";

      await expect(token.connect(user1).transfer(user2.address, transferAmount))
        .to.emit(token, "Transfer")
        .withArgs(user1.address, user2.address, transferAmount);

      expect(await token.balanceOf(user1.address)).to.equal("500000000000000000000");
      expect(await token.balanceOf(user2.address)).to.equal(transferAmount);
    });

    it("should allow approvals", async () => {
      const approveAmount = "500000000000000000000";

      await expect(token.connect(user1).approve(user2.address, approveAmount))
        .to.emit(token, "Approval")
        .withArgs(user1.address, user2.address, approveAmount);

      expect(await token.allowance(user1.address, user2.address)).to.equal(approveAmount);
    });

    it("should allow transferFrom with approval", async () => {
      const transferAmount = "500000000000000000000";

      await token.connect(user1).approve(user2.address, transferAmount);

      await expect(token.connect(user2).transferFrom(user1.address, user2.address, transferAmount))
        .to.emit(token, "Transfer")
        .withArgs(user1.address, user2.address, transferAmount);

      expect(await token.balanceOf(user2.address)).to.equal(transferAmount);
      expect(await token.allowance(user1.address, user2.address)).to.equal(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero amount minting", async () => {
      await expect(token.mint(user1.address, 0))
        .to.emit(token, "Transfer")
        .withArgs(ethers.ZeroAddress, user1.address, 0);

      expect(await token.balanceOf(user1.address)).to.equal(0);
    });

    it("should handle zero amount burning", async () => {
      await token.mint(user1.address, "1000000000000000000000");

      await expect(token.burn(user1.address, 0))
        .to.emit(token, "Transfer")
        .withArgs(user1.address, ethers.ZeroAddress, 0);

      expect(await token.balanceOf(user1.address)).to.equal("1000000000000000000000");
    });

    it("should handle maximum uint256 values", async () => {
      const maxAmount = ethers.MaxUint256;

      await expect(token.mint(user1.address, maxAmount))
        .to.emit(token, "Transfer")
        .withArgs(ethers.ZeroAddress, user1.address, maxAmount);

      expect(await token.balanceOf(user1.address)).to.equal(maxAmount);
      expect(await token.totalSupply()).to.equal(maxAmount);
    });
  });
});
