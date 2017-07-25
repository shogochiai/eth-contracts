var MultiSigWalletFactory = artifacts.require("./wallet/MultiSigWalletFactory.sol");

module.exports = function(deployer) {
  // Deploy multisig wallet factory
  deployer.deploy(MultiSigWalletFactory);
};
