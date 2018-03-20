import assertRevert from './helpers/assertRevert'

let Ownable = artifacts.require('./mixin/Ownable.sol')

contract('Ownable', function(accounts) {
  describe('creation', async function() {
    let ownable
    let ownable2

    before(async function() {
      ownable = await Ownable.new({from: accounts[0]})
      ownable2 = await Ownable.new({from: accounts[1]})
    })

    it('should create contract with proper owner', async function() {
      let owner = await ownable.owner()
      assert.equal(owner, accounts[0])

      owner = await ownable2.owner()
      assert.equal(owner, accounts[1])
    })
  })

  describe('ownership', async function() {
    let ownable

    before(async function() {
      ownable = await Ownable.new({from: accounts[0]})
    })

    it('should allow to transfer ownership', async function() {
      let owner = await ownable.owner()
      assert.equal(owner, accounts[0])

      // change transfer ownership
      let receipt = await ownable.transferOwnership(accounts[1])
      assert.equal(receipt.logs.length, 1)
      assert.equal(receipt.logs[0].event, 'OwnershipChanged')
      assert.equal(receipt.logs[0].args.newOwner, accounts[1])
      assert.equal(receipt.logs[0].args.oldOwner, accounts[0])

      owner = await ownable.owner()
      assert.equal(owner, accounts[1])
    })

    it('should not allow to transfer ownership from any account except owner', async function() {
      let owner = await ownable.owner()
      assert.equal(owner, accounts[1])

      // try to change transfer ownership
      await assertRevert(ownable.transferOwnership(accounts[2], {from: accounts[3]}))

      owner = await ownable.owner()
      assert.equal(owner, accounts[1])

      // try to change transfer ownership
      await assertRevert(ownable.transferOwnership(accounts[2], {from: accounts[2]}))

      owner = await ownable.owner()
      assert.equal(owner, accounts[1])
    })
  })
})
