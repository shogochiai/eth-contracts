import sigUtil from 'eth-sig-util'
import utils from 'ethereumjs-util'
import {Buffer} from 'safe-buffer'

import {generateFirstWallets, mnemonics} from './helpers/wallets'
import assertRevert from './helpers/assertRevert'

const MultiSigWallet = artifacts.require('./wallet/MultiSigWallet.sol')

// fetch 10 wallets
const wallets = generateFirstWallets(mnemonics, 10)

function getMsgParams(destination, value, data, nonce, walletAddress) {
  return {
    data: [
      {
        type: 'address',
        name: 'wallet',
        value: walletAddress || destination
      },
      {
        type: 'address',
        name: 'destination',
        value: destination
      },
      {
        type: 'uint256',
        name: 'value',
        value: value
      },
      {
        type: 'uint256',
        name: 'nonce',
        value: nonce
      },
      {
        type: 'bytes',
        name: 'data',
        value: data
      }
    ]
  }
}

function getSigs(_wallets, destination, value, data, nonce, walletAddress) {
  _wallets.sort((w1, w2) => {
    return Buffer.compare(w1.getAddress(), w2.getAddress()) >= 0
  })
  const sigs = _wallets.map(w => {
    return sigUtil.signTypedData(
      w.getPrivateKey(),
      getMsgParams(destination, value, data, nonce, walletAddress)
    )
  })

  return utils.bufferToHex(Buffer.concat(sigs.map(s => utils.toBuffer(s))))
}

contract('MultiSigWallet', function(accounts) {
  describe('initialization', async function() {
    let wallet

    before(async function() {
      wallet = await MultiSigWallet.new(accounts.slice(0, 1), 1)
    })

    it('should create wallet with proper ownership', async function() {
      let originalOwners = accounts.slice(0, 1)
      let walletOwners = await wallet.getOwners()

      assert.deepEqual(walletOwners, originalOwners)
    })

    it('should create wallet with proper requirements', async function() {
      let required = await wallet.threshold()
      assert.equal(required, 1)
    })

    it('should throw while creating wallet with 0 requirements', async function() {
      await assertRevert(MultiSigWallet.new(accounts.slice(0, 1), 0))
    })

    it('should throw while creating wallet with 0 owners', async function() {
      await assertRevert(MultiSigWallet.new([], 1))
    })

    it('should throw while creating wallet with required > number of owners', async function() {
      await assertRevert(MultiSigWallet.new(accounts.slice(0, 1), 2))
    })
  })

  describe('ownership changes', async function() {
    let wallet
    let originalOwners

    before(async function() {
      originalOwners = accounts.slice(0, 4)
      wallet = await MultiSigWallet.new(originalOwners, 1)

      const owners = await wallet.getOwners()
      assert.deepEqual(owners, originalOwners)
    })

    it('should allow to add owner', async function() {
      const addOwnerData = wallet.addOwner.request(accounts[4]).params[0].data
      const nonce = parseInt((await wallet.nonce()).toString(), 10)
      const sigs = getSigs(
        wallets.slice(1, 2),
        wallet.address,
        0,
        addOwnerData,
        nonce
      )

      const addOwnerReceipt = await wallet.execute(
        wallet.address,
        0,
        addOwnerData,
        sigs
      )
      assert.equal(addOwnerReceipt.logs.length, 2)
      assert.equal(addOwnerReceipt.logs[0].event, 'OwnerAddition')
      assert.equal(addOwnerReceipt.logs[1].event, 'Execution')
      assert.equal(
        addOwnerReceipt.logs[1].args.nonce.toString(),
        nonce.toString()
      )

      const owners = await wallet.getOwners()
      assert.deepEqual(owners, accounts.slice(0, 5))
    })

    it('should not allow to submit transaction except owner', async function() {
      const addOwnerData = wallet.addOwner.request(accounts[5]).params[0].data
      const nonce = parseInt((await wallet.nonce()).toString(), 10)
      const sigs = getSigs(
        wallets.slice(7, 8),
        wallet.address,
        0,
        addOwnerData,
        nonce
      )

      await assertRevert(wallet.execute(wallet.address, 0, addOwnerData, sigs))
    })

    it('should allow to remove owner', async function() {
      const removeOwnerData = wallet.removeOwner.request(accounts[4]).params[0]
        .data
      const nonce = parseInt((await wallet.nonce()).toString(), 10)
      const sigs = getSigs(
        wallets.slice(1, 2),
        wallet.address,
        0,
        removeOwnerData,
        nonce
      )

      let removeOwnerReceipt = await wallet.execute(
        wallet.address,
        0,
        removeOwnerData,
        sigs
      )
      assert.equal(removeOwnerReceipt.logs.length, 2)
      assert.equal(removeOwnerReceipt.logs[0].event, 'OwnerRemoval')
      assert.equal(removeOwnerReceipt.logs[1].event, 'Execution')

      let owners = await wallet.getOwners()
      assert.deepEqual(owners, accounts.slice(0, 4))
    })

    it('should allow to replace owner', async function() {
      const oldOwner = await wallet.owners(3)
      assert.equal(oldOwner, accounts[3])

      const replaceOwnerData = wallet.replaceOwner.request(
        accounts[3],
        accounts[6]
      ).params[0].data
      const nonce = parseInt((await wallet.nonce()).toString(), 10)
      const sigs = getSigs(
        wallets.slice(1, 2),
        wallet.address,
        0,
        replaceOwnerData,
        nonce
      )
      const replaceOwnerReceipt = await wallet.execute(
        wallet.address,
        0,
        replaceOwnerData,
        sigs
      )
      assert.equal(replaceOwnerReceipt.logs.length, 3)
      assert.equal(replaceOwnerReceipt.logs[0].event, 'OwnerRemoval')
      assert.equal(replaceOwnerReceipt.logs[1].event, 'OwnerAddition')
      assert.equal(replaceOwnerReceipt.logs[2].event, 'Execution')

      const newOwner = await wallet.owners(3)
      assert.equal(newOwner, accounts[6])

      const owners = await wallet.getOwners()
      assert.deepEqual(owners.length, 4)
    })

    it('should throw while removing last owner', async function() {
      const wallet2 = await MultiSigWallet.new(accounts.slice(0, 1), 1)
      const removeOwnerData = wallet2.removeOwner.request(accounts[0]).params[0]
        .data
      const nonce = parseInt((await wallet2.nonce()).toString(), 10)
      const sigs = getSigs(
        wallets.slice(0, 1),
        wallet2.address,
        0,
        removeOwnerData,
        nonce
      )

      await assertRevert(
        wallet2.execute(wallet2.address, 0, removeOwnerData, sigs)
      )

      const owners = await wallet2.getOwners()
      assert.deepEqual(owners, accounts.slice(0, 1))

      const threshold = await wallet2.threshold()
      assert.equal(threshold, 1)
    })
  })

  describe('requirement changes', async function() {
    let wallet
    let originalOwners

    before(async function() {
      originalOwners = accounts.slice(0, 2)
      wallet = await MultiSigWallet.new(originalOwners, 2)

      let owners = await wallet.getOwners()
      assert.deepEqual(owners, originalOwners)

      let required = await wallet.threshold()
      assert.equal(required, 2)
    })

    it('should change requirements while removing owner if required', async function() {
      let owners = await wallet.getOwners()
      assert.deepEqual(owners, originalOwners)

      let threshold = await wallet.threshold()
      assert.equal(threshold, 2)

      let removeOwnerData = wallet.removeOwner.request(accounts[1]).params[0]
        .data
      let nonce = parseInt((await wallet.nonce()).toString(), 10)
      let sigs = getSigs(
        wallets.slice(0, 2),
        wallet.address,
        0,
        removeOwnerData,
        nonce
      )

      let removeOwnerReceipt = await wallet.execute(
        wallet.address,
        0,
        removeOwnerData,
        sigs
      )
      assert.equal(removeOwnerReceipt.logs.length, 3)
      assert.equal(removeOwnerReceipt.logs[0].event, 'ThresholdChanged')
      assert.equal(removeOwnerReceipt.logs[1].event, 'OwnerRemoval')
      assert.equal(removeOwnerReceipt.logs[2].event, 'Execution')

      owners = await wallet.getOwners()
      assert.deepEqual(owners, accounts.slice(0, 1))

      threshold = await wallet.threshold()
      assert.equal(threshold, 1)

      // add owners
      let newAccounts = accounts.slice(1, 4)
      for (let i = 0; i < newAccounts.length; i++) {
        let acc = newAccounts[i]
        let addOwnerData = wallet.addOwner.request(acc).params[0].data
        nonce = parseInt((await wallet.nonce()).toString(), 10)
        sigs = getSigs(
          wallets.slice(0, 1),
          wallet.address,
          0,
          addOwnerData,
          nonce
        )
        let addOwnerReceipt = await wallet.execute(
          wallet.address,
          0,
          addOwnerData,
          sigs
        )
        assert.equal(addOwnerReceipt.logs.length, 2)
      }

      owners = await wallet.getOwners()
      assert.deepEqual(owners, accounts.slice(0, 4))

      threshold = await wallet.threshold()
      assert.equal(threshold, 1)
    })

    it('should allow to change requirement', async function() {
      let threshold = await wallet.threshold()
      assert.equal(threshold, 1)

      // change requirement to 2
      let requirementData = wallet.changeThreshold.request(2).params[0].data
      let nonce = parseInt((await wallet.nonce()).toString(), 10)
      let sigs = getSigs(
        wallets.slice(0, 1),
        wallet.address,
        0,
        requirementData,
        nonce
      )
      let receipt = await wallet.execute(
        wallet.address,
        0,
        requirementData,
        sigs
      )
      assert.equal(receipt.logs.length, 2)
      assert.equal(receipt.logs[0].event, 'ThresholdChanged')
      assert.equal(receipt.logs[1].event, 'Execution')

      threshold = await wallet.threshold()
      assert.equal(threshold, 2)

      // change requirement to 3
      requirementData = wallet.changeThreshold.request(3).params[0].data
      nonce = parseInt((await wallet.nonce()).toString(), 10)
      sigs = getSigs(
        wallets.slice(0, 2),
        wallet.address,
        0,
        requirementData,
        nonce
      )
      receipt = await wallet.execute(wallet.address, 0, requirementData, sigs)
      assert.equal(receipt.logs.length, 2)
      assert.equal(receipt.logs[0].event, 'ThresholdChanged')
      assert.equal(receipt.logs[1].event, 'Execution')

      threshold = await wallet.threshold()
      assert.equal(threshold, 3)

      // try adding owner
      let addOwnerData = wallet.addOwner.request(accounts[4]).params[0].data
      nonce = parseInt((await wallet.nonce()).toString(), 10)
      sigs = getSigs(
        wallets.slice(0, 3),
        wallet.address,
        0,
        addOwnerData,
        nonce
      )
      receipt = await wallet.execute(wallet.address, 0, addOwnerData, sigs)
      assert.equal(receipt.logs.length, 2)
      assert.equal(receipt.logs[0].event, 'OwnerAddition')
      assert.equal(receipt.logs[1].event, 'Execution')
    })
  })

  describe('withdraw', async function() {
    let wallet
    let originalOwners

    before(async function() {
      originalOwners = accounts.slice(0, 4)
      wallet = await MultiSigWallet.new(originalOwners, 2)

      let amount = web3.toWei(5, 'ether')

      // send money to wallet
      await wallet.sendTransaction({from: accounts[0], value: amount})

      // get balance
      let balance = web3.fromWei(web3.eth.getBalance(wallet.address), 'ether')
      assert.equal(balance.toNumber(), 5)
    })

    it('should allow to withdraw fund', async function() {
      let amount = web3.toWei(3, 'ether')
      let accountBalance = web3.fromWei(
        web3.eth.getBalance(accounts[5]),
        'ether'
      )

      let nonce = parseInt((await wallet.nonce()).toString(), 10)
      let sigs = getSigs(
        wallets.slice(0, 3),
        accounts[5],
        amount,
        '0x',
        nonce,
        wallet.address
      )
      let withdrawReceipt = await wallet.execute(
        accounts[5],
        amount,
        '0x',
        sigs
      )
      assert.equal(withdrawReceipt.logs.length, 1)
      assert.equal(withdrawReceipt.logs[0].event, 'Execution')

      let newAccountBalance = web3.fromWei(
        web3.eth.getBalance(accounts[5]),
        'ether'
      )
      assert.equal(
        newAccountBalance.minus(accountBalance).toNumber(),
        3,
        'Withdraw fund should be equal to value'
      )

      let walletBalance = web3.fromWei(
        web3.eth.getBalance(wallet.address),
        'ether'
      )
      assert.equal(walletBalance.toNumber(), 2)
    })

    it('should not allow to withdraw fund except owner', async function() {
      let amount = web3.toWei(1, 'ether')
      let accountBalance = web3.fromWei(
        web3.eth.getBalance(accounts[5]),
        'ether'
      )
      let nonce = parseInt((await wallet.nonce()).toString(), 10)
      let sigs = getSigs(
        wallets.slice(4, 7),
        accounts[5],
        amount,
        '0x',
        nonce,
        wallet.address
      )
      await assertRevert(wallet.execute(accounts[5], amount, '0x', sigs))
    })

    it('should not allow to withdraw more fund than wallet has', async function() {
      let walletBalance = web3.fromWei(
        web3.eth.getBalance(wallet.address),
        'ether'
      )
      assert.equal(walletBalance.toNumber(), 2)

      let amount = web3.toWei(3, 'ether')
      let accountBalance = web3.fromWei(
        web3.eth.getBalance(accounts[5]),
        'ether'
      )
      let nonce = parseInt((await wallet.nonce()).toString(), 10)
      let sigs = getSigs(
        wallets.slice(0, 3),
        accounts[5],
        amount,
        '0x',
        nonce,
        wallet.address
      )
      await assertRevert(wallet.execute(accounts[5], amount, '0x', sigs))
    })
  })
})
