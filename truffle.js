require('babel-register')
require('babel-polyfill')

const HDWalletProvider = require('truffle-hdwallet-provider')
const wallets = require('./test/helpers/wallets.js')

module.exports = {
  networks: {
    // See <http://truffleframework.com/docs/advanced/configuration>
    // to customize your Truffle configuration!
  }
}
