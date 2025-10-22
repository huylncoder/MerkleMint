import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import fs from 'fs';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("====================");
  console.log(`Network: ${hre.network.name}`);
  console.log("====================");

  // Deploy MyMintableToken
  console.log("====================");
  console.log("Deploy MyMintableToken Contract");
  console.log("====================");

  const myMintableToken = await deploy("MyMintableToken", {
    contract: "MyMintableToken",
    args: [],
    from: deployer,
    log: true,
    autoMine: true,
    skipIfAlreadyDeployed: true,
  });

  console.log("MyMintableToken deployed to:", myMintableToken.address);

  // Load merkle root
  const rootPath = './Merkle/root.json';
  const rootData = fs.readFileSync(rootPath, 'utf8');
  const merkleRoot = JSON.parse(rootData).root; // Assuming structure {root: "0x..."}

  // Deploy AirDrop
  console.log("====================");
  console.log("Deploy AirDrop Contract");
  console.log("====================");

  const airDrop = await deploy("AirDrop", {
    contract: "AirDrop",
    args: [myMintableToken.address, merkleRoot],
    from: deployer,
    log: true,
    autoMine: true,
    skipIfAlreadyDeployed: true,
  });

  console.log("AirDrop deployed to:", airDrop.address);
};

func.tags = ["deploy"];
export default func;