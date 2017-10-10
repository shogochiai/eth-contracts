let Migrations = artifacts.require("./Migrations.sol");
let RegistryFactory = artifacts.require("./registry/RegistryFactory.sol");
let Registry = artifacts.require("./registry/Registry.sol");
let MultiSigWalletFactory = artifacts.require("./wallet/MultiSigWalletFactory.sol");
let MultiSigWallet = artifacts.require("./wallet/MultiSigWallet.sol");

module.exports = async function(deployer) {
  // Deploy migration contract
  // await deployer.deploy(Migrations);

  //
  // Get registry from registry factory
  //

  // Deploy registry factory
  await deployer.deploy(RegistryFactory);
  const registryFactory = await RegistryFactory.deployed();

  // Create registry contract
  // const registryReceipt = await registryFactory.create();
  // const registryContract = Registry.at(registryReceipt.logs[0].args._address);

  // Deploy multisig wallet factory
  await deployer.deploy(MultiSigWalletFactory);
  const multisigWalletFactory = await MultiSigWalletFactory.deployed();
};
