import assertThrows from "./helpers/assertThrows";
import { namehash } from "./helpers/utils";

let Registry = artifacts.require("./registry/Registry.sol");

contract('Registry', function(accounts) {
  describe('initialization', async function() {
    let registry;

    before(async function() {
      registry = await Registry.new();
    });

    it('should not allow to register other than owner', async function(){
      assertThrows(registry.register(namehash('microsoft.eth'), registry.address, { from: accounts[1] }));
    });

    it('should allow to register', async function(){
      let receipt = await registry.register(namehash('microsoft.eth'), registry.address);
      assert.equal(receipt.logs.length, 1);
      assert.equal(receipt.logs[0].event, 'Registered');
      assert.equal(receipt.logs[0].args._id, namehash('microsoft.eth'));
      assert.equal(receipt.logs[0].args._address, registry.address);

      receipt = await registry.register(namehash('latest.microsoft.eth'), registry.address);
      assert.equal(receipt.logs.length, 1);
      assert.equal(receipt.logs[0].event, 'Registered');
      assert.equal(receipt.logs[0].args._id, namehash('latest.microsoft.eth'));
      assert.equal(receipt.logs[0].args._address, registry.address);
    });

    it('should resolve', async function(){
      let resolvedAddress = await registry.resolve(namehash('microsoft.eth'));
      assert.equal(resolvedAddress, registry.address);

      resolvedAddress = await registry.resolve(namehash('latest.microsoft.eth'));
      assert.equal(resolvedAddress, registry.address);
    });

    it('should allow to unregister', async function(){
      let receipt = await registry.unregister(namehash('microsoft.eth'));
      assert.equal(receipt.logs.length, 1);
      assert.equal(receipt.logs[0].event, 'Unregistered');
      assert.equal(receipt.logs[0].args._id, namehash('microsoft.eth'));

      // `microsoft.eth` shouldn't be there
      let resolvedAddress = await registry.resolve(namehash('microsoft.eth'));
      assert.equal(resolvedAddress, `0x${Array(41).join('0')}`);

      // `latest.microsoft.eth` should be there
      resolvedAddress = await registry.resolve(namehash('latest.microsoft.eth'));
      assert.equal(resolvedAddress, registry.address);
    });
  });
});
