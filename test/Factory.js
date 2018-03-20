import assertRevert from './helpers/assertRevert'

let Factory = artifacts.require('./Factory.sol')

contract('Factory', function(accounts) {
  describe('initialization', async function() {
    let factory
    let factory2

    before(async function() {
      factory = await Factory.new({from: accounts[0]})
      factory2 = await Factory.new({from: accounts[1]})
    })

    it('should create contract with proper owner', async function() {
      let owner = await factory.owner()
      assert.equal(owner, accounts[0])

      owner = await factory2.owner()
      assert.equal(owner, accounts[1])
    })

    it('should create contract with proper fee', async function() {
      let fee = await factory.fee()
      assert.equal(fee, 0)
    })
  })

  describe('ownership', async function() {
    let factory

    before(async function() {
      factory = await Factory.new({from: accounts[0]})
    })

    it('should allow to transfer ownership', async function() {
      let owner = await factory.owner()
      assert.equal(owner, accounts[0])

      // change transfer ownership
      let receipt = await factory.transferOwnership(accounts[1])
      assert.equal(receipt.logs.length, 1)
      assert.equal(receipt.logs[0].event, 'OwnershipChanged')
      assert.equal(receipt.logs[0].args.newOwner, accounts[1])
      assert.equal(receipt.logs[0].args.oldOwner, accounts[0])

      owner = await factory.owner()
      assert.equal(owner, accounts[1])
    })

    it('should not allow to transfer ownership from any account except owner', async function() {
      let owner = await factory.owner()
      assert.equal(owner, accounts[1])

      // try to change transfer ownership
      await assertRevert(factory.transferOwnership(accounts[2], {from: accounts[3]}))

      owner = await factory.owner()
      assert.equal(owner, accounts[1])

      // try to change transfer ownership
      await assertRevert(factory.transferOwnership(accounts[2], {from: accounts[2]}))

      owner = await factory.owner()
      assert.equal(owner, accounts[1])
    })
  })

  describe('fee changes', async function() {
    let factory

    before(async function() {
      factory = await Factory.new({from: accounts[0]})
    })

    it('should allow to change fee', async function() {
      let fee = await factory.fee()
      assert.equal(fee, 0)

      let newFee = web3.toWei(1, 'ether')
      let feeReceipt = await factory.updateFee(newFee)
      assert.equal(feeReceipt.logs.length, 1)
      assert.equal(feeReceipt.logs[0].event, 'FeeChanged')
      assert.equal(feeReceipt.logs[0].args.newFee.toString(), newFee.toString())

      fee = await factory.fee()
      assert.equal(fee.toString(), newFee.toString())
    })

    it('should not allow to change fee by any account except owner', async function() {
      let fee = await factory.fee()
      assert.equal(fee.toString(), web3.toWei(1, 'ether').toString())

      let newFee = web3.toWei(2, 'ether')
      await assertRevert(factory.updateFee(newFee, {from: accounts[1]}))
      await assertRevert(factory.updateFee(newFee, {from: accounts[2]}))

      // check fee again
      fee = await factory.fee()
      assert.equal(fee.toString(), web3.toWei(1, 'ether').toString())
    })
  })

  describe('withdraw', async function() {
    let factory

    before(async function() {
      factory = await Factory.new({from: accounts[0]})
    })

    it('should allow owner to withdraw fund', async function() {
      let fundReceipt = await factory.withdraw()
      assert.equal(fundReceipt.logs.length, 1)
      assert.equal(fundReceipt.logs[0].event, 'FundWithdraw')
      assert.equal(fundReceipt.logs[0].args.amount, 0)
    })

    it('should not allow other to withdraw fund', async function() {
      await assertRevert(factory.withdraw({from: accounts[1]}))
    })
  })
})
