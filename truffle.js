require('babel-register')
require('babel-polyfill')

const HDWalletProvider = require('truffle-hdwallet-provider')
const wallets = require('./test/helpers/wallets.js')

module.exports = {
  networks: {
    // See <http://truffleframework.com/docs/advanced/configuration>
    // to customize your Truffle configuration!
    dev: {
      host: '127.0.0.1',
      port: 8545,
      network_id: 4474 // Match any network id
    }
  }
}
