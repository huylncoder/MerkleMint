import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import fs from 'fs';
import { ethers } from "hardhat";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("====================");
  console.log(`Network: ${hre.network.name}`);
  console.log(`Deployer: ${deployer}`);
  console.log("====================");

  // Deploy MyMintableToken
  const myMintableToken = await deploy("MyMintableToken", {
    from: deployer,
    log: true,
    args: [],
  });
  console.log("====================");
  console.log("MyMintableToken deployed to:", myMintableToken.address);
  console.log("====================");

  // Load merkle root
  const rootPath = './scripts/Merkle/root.json';
  const rootData = fs.readFileSync(rootPath, 'utf8');
  const merkleRoot = JSON.parse(rootData).root;

  // Deploy AirDrop as an upgradeable contract
  const airDrop = await deploy("AirDrop", {
    from: deployer,
    log: true,
    proxy: {
      proxyContract: "UUPS",
      execute: {
        init: {
          methodName: "initialize",
          args: [myMintableToken.address, merkleRoot],
        },
      },
    },
    contract: "Airdrop",
    autoMine: true,
    skipIfAlreadyDeployed: true,
  });
  console.log("====================");
  console.log("AirDrop proxy deployed to:", airDrop.address);
  console.log("====================");

  // Grant MINTER_ROLE to AirDrop contract
  console.log("====================");
  console.log("Granting MINTER_ROLE to AirDrop contract");
  console.log("====================");
  
  const tokenContract = await ethers.getContractAt("MyMintableToken", myMintableToken.address);
  const MINTER_ROLE = await tokenContract.MINTER_ROLE();
  
  const hasRole = await tokenContract.hasRole(MINTER_ROLE, airDrop.address);
  if (!hasRole) {
    const grantRoleTx = await tokenContract.grantRole(MINTER_ROLE, airDrop.address);
    await grantRoleTx.wait();
    console.log(`MINTER_ROLE granted to: ${airDrop.address}`);
  } else {
    console.log(`AirDrop contract already has MINTER_ROLE.`);
  }
};

func.tags = ["MyMintableToken", "AirDrop", "deploy"];
export default func;
