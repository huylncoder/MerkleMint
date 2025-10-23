import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers, upgrades } from "hardhat";
import fs from 'fs';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deployer } = await getNamedAccounts();

  console.log("====================");
  console.log(`Network: ${hre.network.name}`);
  console.log("====================");

  // Deploy MyMintableToken (non-upgradeable)
  console.log("====================");
  console.log("Deploy MyMintableToken Contract");
  console.log("====================");

  const MyMintableToken = await ethers.getContractFactory("MyMintableToken");
  const myMintableToken = await MyMintableToken.deploy();
  await myMintableToken.waitForDeployment();
  const myMintableTokenAddress = await myMintableToken.getAddress();
  console.log("MyMintableToken deployed to:", myMintableTokenAddress);

  // Load merkle root
  const rootPath = './Merkle/root.json';
  const rootData = fs.readFileSync(rootPath, 'utf8');
  const merkleRoot = JSON.parse(rootData).root; 

  // Deploy AirDrop as upgradeable
  console.log("====================");
  console.log("Deploy AirDrop Contract");
  console.log("====================");

  const AirDrop = await ethers.getContractFactory("AirDrop");
  const airDrop = await upgrades.deployProxy(AirDrop, [myMintableTokenAddress, merkleRoot], {
    initializer: 'initialize',
  });
  await airDrop.waitForDeployment();
  const airDropAddress = await airDrop.getAddress();

  console.log("AirDrop proxy deployed to:", airDropAddress);

  // Grant MINTER_ROLE to AirDrop contract
  console.log("====================");
  console.log("Granting MINTER_ROLE to AirDrop contract");
  console.log("====================");
  const MINTER_ROLE = await myMintableToken.MINTER_ROLE();
  const grantRoleTx = await myMintableToken.grantRole(MINTER_ROLE, airDropAddress);
  await grantRoleTx.wait();
  console.log(`MINTER_ROLE granted to ${airDropAddress}`);
  
  // Verify implementations if on a network that supports it
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("====================");
    console.log("Verifying contracts");
    console.log("====================");
    
    try {
      await hre.run("verify:verify", {
        address: myMintableTokenAddress,
        constructorArguments: [],
      });
      console.log("MyMintableToken verified");
    } catch (e) {
      console.log("Error verifying MyMintableToken:", e);
    }

    // Get the implementation address for AirDrop
    const implAddress = await upgrades.erc1967.getImplementationAddress(airDropAddress);

    try {
      await hre.run("verify:verify", {
        address: implAddress,
        constructorArguments: [],
      });
      console.log("AirDrop implementation verified");
    } catch (e) {
      console.log("Error verifying AirDrop:", e);
    }
  }
};

func.tags = ["MyMintableToken", "AirDrop", "deploy"];
export default func;
