let Migrations = artifacts.require('./Migrations.sol')
let RegistryFactory = artifacts.require('./registry/RegistryFactory.sol')
let Registry = artifacts.require('./registry/Registry.sol')
let MultiSigWalletFactory = artifacts.require(
  './wallet/MultiSigWalletFactory.sol'
)

// name hash
const namehash = require('eth-ens-namehash')

module.exports = async function(deployer) {
  const account = web3.eth.accounts[0]

  //
  // Get registry from registry factory
  //

  // Deploy registry factory
  await deployer.deploy(RegistryFactory)
  // Deploy multisig wallet factory
  await deployer.deploy(MultiSigWalletFactory)

  // Create registry contract
  const registryFactory = RegistryFactory.at(RegistryFactory.address)
  const registryReceipt = await registryFactory.create(account)
  const registryContract = Registry.at(registryReceipt.logs[0].args._address)

  // register contracts
  await registryContract.register(
    namehash.hash('v1.simple-registry-factory.matic'),
    RegistryFactory.address
  )
  await registryContract.register(
    namehash.hash('v1.multisig-wallet-factory.matic'),
    MultiSigWalletFactory.address
  )

  // print registry contract address
  console.log('Registry contract', registryContract.address)
}
