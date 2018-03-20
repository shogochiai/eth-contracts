import assertRevert from './helpers/assertRevert'
import {namehash} from './helpers/utils'

let RegistryFactory = artifacts.require('./registry/registryFactory.sol')
let Registry = artifacts.require('./registry/Registry.sol')

contract('Registry', function(accounts) {
  describe('initialization', async function() {
    let registry

    before(async function() {
      const registryFactory = await RegistryFactory.new()
      const registryReceipt = await registryFactory.create(accounts[0])
      registry = Registry.at(registryReceipt.logs[0].args._address)
    })

    it('should set owner properly', async function() {
      assert.equal(await registry.owner(), accounts[0])
    })

    it('should not allow to register other than owner', async function() {
      await assertRevert(
        registry.register(namehash('microsoft.eth'), registry.address, {
          from: accounts[1]
        })
      )
    })
  })

  describe('register and unregister', async function() {
    let registry

    before(async function() {
      const registryFactory = await RegistryFactory.new()
      const registryReceipt = await registryFactory.create(accounts[0])
      registry = Registry.at(registryReceipt.logs[0].args._address)
    })

    it('should allow to register', async function() {
      let receipt = await registry.register(
        namehash('microsoft.eth'),
        registry.address
      )
      assert.equal(receipt.logs.length, 1)
      assert.equal(receipt.logs[0].event, 'Registered')
      assert.equal(receipt.logs[0].args._id, namehash('microsoft.eth'))
      assert.equal(receipt.logs[0].args._address, registry.address)

      receipt = await registry.register(
        namehash('latest.microsoft.eth'),
        registry.address
      )
      assert.equal(receipt.logs.length, 1)
      assert.equal(receipt.logs[0].event, 'Registered')
      assert.equal(receipt.logs[0].args._id, namehash('latest.microsoft.eth'))
      assert.equal(receipt.logs[0].args._address, registry.address)
    })

    it('should resolve', async function() {
      let resolvedAddress = await registry.resolve(namehash('microsoft.eth'))
      assert.equal(resolvedAddress, registry.address)

      resolvedAddress = await registry.resolve(namehash('latest.microsoft.eth'))
      assert.equal(resolvedAddress, registry.address)
    })

    it('should allow to unregister', async function() {
      let receipt = await registry.unregister(namehash('microsoft.eth'))
      assert.equal(receipt.logs.length, 1)
      assert.equal(receipt.logs[0].event, 'Unregistered')
      assert.equal(receipt.logs[0].args._id, namehash('microsoft.eth'))

      // `microsoft.eth` shouldn't be there
      let resolvedAddress = await registry.resolve(namehash('microsoft.eth'))
      assert.equal(resolvedAddress, `0x${Array(41).join('0')}`)

      // `latest.microsoft.eth` should be there
      resolvedAddress = await registry.resolve(namehash('latest.microsoft.eth'))
      assert.equal(resolvedAddress, registry.address)
    })
  })
})
