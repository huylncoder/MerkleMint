import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const token = await deploy('MyMintableToken', {
    from: deployer,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
    },
    log: true,
  });

  await deploy('AirDrop', {
    from: deployer,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
    },
    args: [token.address],
    log: true,
  });
};

export default func;
func.tags = ['Proxy'];