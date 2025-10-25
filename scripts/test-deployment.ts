import { ethers } from "hardhat";
import { AirDrop, MyMintableToken } from "../typechain";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import fs from "fs";

/**
 * Test Deployment Script
 * Tests the complete deployment and basic functionality
 */

async function main() {
  console.log("🚀 Testing MerkleMint Deployment...");
  console.log("===================================");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  try {
    // 1. Deploy MyMintableToken
    console.log("\n📦 Deploying MyMintableToken...");
    const MyMintableTokenFactory = await ethers.getContractFactory("MyMintableToken");
    const token = await MyMintableTokenFactory.deploy();
    await token.waitForDeployment();
    console.log("✅ MyMintableToken deployed to:", await token.getAddress());

    // 2. Generate Merkle Tree
    console.log("\n🌳 Generating Merkle Tree...");
    const whitelist = [
      { address: "0x8fF1580fcD7022dD5F26cbccE6d586aF655Dd0BA", amount: "1000000000000000000000" },
      { address: "0x1bB2fC040616C2e6bB7D9c7dc137069860a555bB", amount: "1200000000000000000000" },
      { address: "0x895f94bC6160018ff116Bf9f2912e56B7ceb5319", amount: "1400000000000000000000" },
    ];

    const leaves = whitelist.map((entry) =>
      keccak256(ethers.solidityPackedKeccak256(["address", "uint256"], [entry.address, entry.amount]))
    );
    const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    const merkleRoot = merkleTree.getHexRoot();
    console.log("✅ Merkle root generated:", merkleRoot);

    // 3. Deploy AirDrop
    console.log("\n📦 Deploying AirDrop...");
    const AirDropFactory = await ethers.getContractFactory("AirDrop");
    const airDrop = await AirDropFactory.deploy();
    await airDrop.waitForDeployment();
    console.log("✅ AirDrop deployed to:", await airDrop.getAddress());

    // 4. Initialize AirDrop
    console.log("\n🔧 Initializing AirDrop...");
    await airDrop.initialize(await token.getAddress(), merkleRoot);
    console.log("✅ AirDrop initialized");

    // 5. Grant MINTER_ROLE
    console.log("\n🔑 Granting MINTER_ROLE...");
    await token.grantRole(await token.MINTER_ROLE(), await airDrop.getAddress());
    console.log("✅ MINTER_ROLE granted");

    // 6. Test basic functionality
    console.log("\n🧪 Testing basic functionality...");

    // Test merkle root
    const storedRoot = await airDrop.merkleRoot();
    console.log("✅ Merkle root stored:", storedRoot === merkleRoot);

    // Test token address
    const storedToken = await airDrop.token();
    console.log("✅ Token address stored:", storedToken === (await token.getAddress()));

    // Test roles
    const hasAdminRole = await airDrop.hasRole(await airDrop.DEFAULT_ADMIN_ROLE(), deployer.address);
    console.log("✅ Admin role assigned:", hasAdminRole);

    // Test upgrade amount
    await airDrop.setUpgradeAmount("1000000000000000000000");
    const upgradeAmount = await airDrop.upgradeAmount();
    console.log("✅ Upgrade amount set:", upgradeAmount.toString());

    // Test statistics
    const [totalClaimed, totalClaimers] = await airDrop.getClaimStats();
    console.log(
      "✅ Initial statistics - Total claimed:",
      totalClaimed.toString(),
      "Total claimers:",
      totalClaimers.toString()
    );

    // 7. Save deployment info
    const deploymentInfo = {
      network: "localhost",
      timestamp: new Date().toISOString(),
      deployer: deployer.address,
      contracts: {
        MyMintableToken: await token.getAddress(),
        AirDrop: await airDrop.getAddress(),
      },
      merkleRoot: merkleRoot,
      whitelist: whitelist,
    };

    fs.writeFileSync("./deployment-test.json", JSON.stringify(deploymentInfo, null, 2));
    console.log("✅ Deployment info saved to deployment-test.json");

    console.log("\n🎉 Deployment test completed successfully!");
    console.log("==========================================");
    console.log("📊 Deployment Summary:");
    console.log("- MyMintableToken: ✅");
    console.log("- AirDrop: ✅");
    console.log("- Merkle Tree: ✅");
    console.log("- Initialization: ✅");
    console.log("- Role Assignment: ✅");
    console.log("- Basic Functions: ✅");
  } catch (error) {
    console.error("❌ Deployment test failed:", error);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("❌ Deployment test script failed:", error);
  process.exitCode = 1;
});
