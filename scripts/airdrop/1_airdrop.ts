// 1. set rooot

// 2. claim

import { ethers } from "hardhat";
import { AirDrop } from "../../typechain-types";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account: ", deployer.address);

  const airdrop: AirDrop = await ethers.getContract("AirDrop");

  const setRoot = async () => {
    await airdrop.setMerkleRoot("aaaa");
  };

  const claim = async () => {};

  await setRoot();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
