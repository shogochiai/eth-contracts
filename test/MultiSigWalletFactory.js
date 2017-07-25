import assertThrows from "./helpers/assertThrows";

let MultiSigWalletFactory = artifacts.require("./wallet/MultiSigWalletFactory.sol");
let MultiSigWallet = artifacts.require("./wallet/MultiSigWallet.sol");

contract('MultiSigWalletFactory', function(accounts) {
  describe('initialization', async function() {
    let factory;

    beforeEach(async function(){
      factory = await MultiSigWalletFactory.new({from: accounts[0]});
    });

    it('should create contract with proper owner and should allow to update', async function() {
      let owner = await factory.owner();
      assert.equal(owner, accounts[0]);

      // change transfer ownership
      let receipt = await factory.transferOwnership(accounts[1]);
      assert.equal(receipt.logs.length, 1);
      assert.equal(receipt.logs[0].event, 'OwnershipChanged');
      assert.equal(receipt.logs[0].args.newOwner, accounts[1]);
      assert.equal(receipt.logs[0].args.oldOwner, accounts[0]);

      owner = await factory.owner();
      assert.equal(owner, accounts[1]);
    });

    it('should create contract with proper fee and should allow to update', async function() {
      let fee = await factory.fee();
      assert.equal(fee, 0);

      let newFee = web3.toWei(1, 'ether');
      let feeReceipt = await factory.updateFee(newFee);
      assert.equal(feeReceipt.logs.length, 1);
      assert.equal(feeReceipt.logs[0].event, 'FeeChanged');
      assert.equal(feeReceipt.logs[0].args.newFee.toString(), newFee.toString());

      fee = await factory.fee();
      assert.equal(fee.toString(), newFee.toString());
    });
  });

  describe('create contract', async function(){
    let factory;

    beforeEach(async function(){
      factory = await MultiSigWalletFactory.new({from: accounts[0]});
    });

    it('should anyone to create MultiSigWallet contract', async function() {
      let fee = web3.toWei(0, 'ether');
      let receipt = await factory.create(accounts.slice(0, 2), 1, {value: fee}); // with zero fee
      assert.equal(receipt.logs.length, 1);
      assert.equal(receipt.logs[0].event, 'ContractCreated');

      // wallet address from event
      let walletAddress = receipt.logs[0].args._address;
      let walletContract = MultiSigWallet.at(walletAddress);

      // check wallet's requirements
      assert.deepEqual(await walletContract.getOwners(), accounts.slice(0, 2));
      assert.equal(await walletContract.required(), 1);
    });

    it('should not allow to create with lesser fees', async function() {
      let fee = await factory.fee();
      assert.equal(fee, 0);

      let newFee = web3.toWei(1, 'ether');
      let feeReceipt = await factory.updateFee(newFee);
      assert.equal(feeReceipt.logs.length, 1);
      assert.equal(feeReceipt.logs[0].event, 'FeeChanged');
      assert.equal(feeReceipt.logs[0].args.newFee.toString(), newFee.toString());

      assertThrows(factory.create(accounts.slice(0, 2), 1, {value: fee}));
    });

    it('should allow to create with more or same fees', async function() {
      let fee = await factory.fee();
      assert.equal(fee, 0);

      let newFee = web3.toWei(1, 'ether');
      let feeReceipt = await factory.updateFee(newFee);
      assert.equal(feeReceipt.logs.length, 1);
      assert.equal(feeReceipt.logs[0].event, 'FeeChanged');
      assert.equal(feeReceipt.logs[0].args.newFee.toString(), newFee.toString());

      let receipt = await factory.create(accounts.slice(0, 2), 1, {value: newFee});
      assert.equal(receipt.logs.length, 1);
      assert.equal(receipt.logs[0].event, 'ContractCreated');

      // wallet address from event
      let walletAddress = receipt.logs[0].args._address;
      let walletContract = MultiSigWallet.at(walletAddress);

      // check wallet's requirements
      assert.deepEqual(await walletContract.getOwners(), accounts.slice(0, 2));
      assert.equal(await walletContract.required(), 1);


      // check factory balance
      let shouldBalance = web3.toWei(1, 'ether');
      let factoryBalance = web3.eth.getBalance(factory.address);
      assert.equal(shouldBalance.toString(), factoryBalance.toString());
    });
  });

  describe('withdraw', async function(){
    let factory;

    beforeEach(async function(){
      factory = await MultiSigWalletFactory.new({from: accounts[0]});
      await factory.updateFee(web3.toWei(1, 'ether'));
    });

    it('should allow owner to withdraw fund', async function() {
      assertThrows(factory.create(accounts.slice(0, 2), 1));

      // get account balance
      let accountBalance = web3.eth.getBalance(accounts[0]);

      let testData = [
        {from: accounts[1], value: web3.toWei(1, 'ether')},
        {from: accounts[2], value: web3.toWei(2, 'ether')},
        {from: accounts[3], value: web3.toWei(3, 'ether')},
        {from: accounts[4], value: web3.toWei(4, 'ether')},
      ];
      for (let i = 0; i < testData.length; i++) {
        // create contract with fee 1 ETH
        let createReceipt = await factory.create(accounts.slice(0, 2), 1, testData[i]);
        assert.equal(createReceipt.logs.length, 1);
        assert.equal(createReceipt.logs[0].event, 'ContractCreated');

        let shouldBalance = testData[i].value;
        let factoryBalance = web3.eth.getBalance(factory.address);
        assert.equal(shouldBalance.toString(), factoryBalance.toString());

        // withdraw receipt
        let withdrawReceipt = await factory.withdraw({from: accounts[0]});
        assert.equal(withdrawReceipt.logs.length, 1);
        assert.equal(withdrawReceipt.logs[0].event, 'FundWithdraw');
        assert.equal(withdrawReceipt.logs[0].args.amount.toString(), testData[i].value.toString());

        shouldBalance = web3.toWei(0, 'ether');
        factoryBalance = web3.eth.getBalance(factory.address);
        assert.equal(shouldBalance.toString(), factoryBalance.toString());
      }

      // check account[0] balance
      let newAccountBalance = web3.eth.getBalance(accounts[0]);
      assert.equal(newAccountBalance.minus(accountBalance).gt(web3.toWei(9, 'ether')), true);
    });

    it('should not allow other to withdraw fund', async function() {
      assertThrows(factory.create(accounts.slice(0, 2), 1));

      let createReceipt = await factory.create(accounts.slice(0, 2), 1, {value: web3.toWei(1, 'ether')});
      assert.equal(createReceipt.logs.length, 1);
      assert.equal(createReceipt.logs[0].event, 'ContractCreated');

      // withdraw should not be allowed
      assertThrows(factory.withdraw({from: accounts[1]}));
      assertThrows(factory.withdraw({from: accounts[2]}));
      assertThrows(factory.withdraw({from: accounts[6]}));

      // check factory balance
      let shouldBalance = web3.toWei(1, 'ether');
      let factoryBalance = web3.eth.getBalance(factory.address);
      assert.equal(shouldBalance.toString(), factoryBalance.toString());
    });
  });
});
