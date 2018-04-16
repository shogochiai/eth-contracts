require('babel-register')
require('babel-polyfill')
require('dotenv').config()
const Web3 = require("web3");
const web3 = new Web3();

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
    },
    kovan: {
      provider: function() {
        let wallet = new HDWalletProvider(process.env.MNEMONIC, process.env.INFURA_ENDPOINT)
        return wallet
      },
      gas: 4600000,
      gasPrice: web3.toWei("20", "gwei"),
      network_id: 42 // Match any network id
    }
  }//0x266bc97c256b1f7841ec1f017d0f634433c77c78e1f513576cd3fe4bf6536c4f
}
