const Web3 = require('web3');
const TruffleConfig = require('./truffle');
require('dotenv').config();

const config = TruffleConfig.networks['kovan'];  

if (process.env.ACCOUNT_PASSWORD) {
  const web3 = new Web3(new Web3.providers.HttpProvider('http://' + config.host + ':' + config.port));
  // web3.personal.unlockAccount(config.from, process.env.ACCOUNT_PASSWORD, 36000);

  const Registory = artifacts.require('./registry/Registry.sol')
  const RegistryABI = web3.eth.contract(Registory.abi);
console.log(process.env.CONTRACT_ADDR)
  const registry = RegistryABI.at(process.env.CONTRACT_ADDR);

  let MultiSigWalletFactoryAddr = registry.resolve()
  console.log(MultiSigWalletFactoryAddr)

}



