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

  // Deploy MyMintableToken as upgradeable
  console.log("====================");
  console.log("Deploy MyMintableToken Contract");
  console.log("====================");

  const MyMintableToken = await ethers.getContractFactory("MyMintableToken");
  const myMintableToken = await upgrades.deployProxy(MyMintableToken, [], {
    initializer: 'initialize',
  });

  await myMintableToken.waitForDeployment();
  const myMintableTokenAddress = await myMintableToken.getAddress();
  console.log("MyMintableToken deployed to:", myMintableTokenAddress);

  // Load merkle root
  const rootPath = './Merkle/root.json';
  const rootData = fs.readFileSync(rootPath, 'utf8');
  const merkleRoot = JSON.parse(rootData).root; 

  // Deploy AirDrop (non-upgradeable)
  console.log("====================");
  console.log("Deploy AirDrop Contract");
  console.log("====================");

  const AirDrop = await ethers.getContractFactory("AirDrop");
  const airDrop = await AirDrop.deploy(myMintableTokenAddress, merkleRoot);
  await airDrop.waitForDeployment();
  const airDropAddress = await airDrop.getAddress();

  console.log("AirDrop deployed to:", airDropAddress);
  
  // Verify implementations if on a network that supports it
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("====================");
    console.log("Verifying contracts");
    console.log("====================");

    // Get the implementation address for MyMintableToken
    const implAddress = await upgrades.erc1967.getImplementationAddress(myMintableTokenAddress);
    
    try {
      await hre.run("verify:verify", {
        address: implAddress,
        constructorArguments: [],
      });
      console.log("MyMintableToken implementation verified");
    } catch (e) {
      console.log("Error verifying MyMintableToken:", e);
    }

    try {
      await hre.run("verify:verify", {
        address: airDropAddress,
        constructorArguments: [myMintableTokenAddress, merkleRoot],
      });
      console.log("AirDrop verified");
    } catch (e) {
      console.log("Error verifying AirDrop:", e);
    }
  }
};

func.tags = ["MyMintableToken", "AirDrop", "deploy"];
export default func;