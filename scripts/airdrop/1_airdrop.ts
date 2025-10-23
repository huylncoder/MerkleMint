import { ethers } from "hardhat";
import { AirDrop, MyMintableToken } from "../../typechain";
import { generateMerkleTree } from "../merkleTree";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account: ", deployer.address);
  console.log("====================");

  const airdrop: AirDrop = await ethers.getContract("AirDrop");

  // 1. Tạo Merkle Root từ whitelist
  const { tree, whitelist, hashToken } = generateMerkleTree();

  const newRoot = tree.getHexRoot();

  // 2. Set Merkle Root
  console.log("Setting new Merkle root...");
  const tx = await airdrop.setMerkleRoot(newRoot);
  await tx.wait();
  console.log("Merkle root has been set to:", newRoot);
  console.log("====================");

  // 3. Test Claim Flow
  console.log("\nTesting claim flow...");
  const claimer = whitelist[0]; // Lấy user đầu tiên trong whitelist để test
  const leaf = hashToken(claimer.address, claimer.amount);
  const proof = tree.getHexProof(leaf);

  console.log("====================");
  console.log(`Attempting to claim for: ${claimer.address}`);
  console.log(`Amount: ${claimer.amount}`);
  console.log(`Proof: ${JSON.stringify(proof)}`);
  console.log("====================");

  // Lấy signer cho người dùng claim
  const claimerSigner = await ethers.getImpersonatedSigner(claimer.address);

  // Kiểm tra số dư token trước khi claim
  const token = await ethers.getContract<MyMintableToken>("MyMintableToken");
  const balanceBefore = await token.balanceOf(claimer.address);

  console.log(`Token balance before claim: ${ethers.formatUnits(balanceBefore, 18)}`);
  console.log("====================");

  // Thực hiện claim
  const claimTx = await airdrop.connect(claimerSigner).claim(claimer.amount, proof);
  await claimTx.wait();

  console.log("Claim transaction successful!");
  console.log("====================");

  // Kiểm tra số dư token sau khi claim
  const balanceAfter = await token.balanceOf(claimer.address);

  console.log(`Token balance after claim: ${ethers.formatUnits(balanceAfter, 18)}`);
  console.log("====================");

  if (balanceAfter > balanceBefore) {
    console.log("Claim test successful!");
  } else {
    console.log("Claim test failed!");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
