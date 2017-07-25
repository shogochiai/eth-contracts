import assertThrows from "./helpers/assertThrows";

let MultiSigWallet = artifacts.require("./wallet/MultiSigWallet.sol");

contract('MultiSigWallet', function(accounts) {
  describe('initialization', async function() {
    let wallet;

    before(async function() {
      wallet = await MultiSigWallet.new(accounts.slice(0, 1), 1);
    });

    it('should create wallet with proper ownership', async function(){
      let originalOwners = accounts.slice(0, 1);
      let walletOwners = await wallet.getOwners();

      assert.deepEqual(walletOwners, originalOwners);
    });

    it('should create wallet with proper requirements', async function(){
      let required = await wallet.required();
      assert.equal(required, 1);
    });

    it ('should throw while creating wallet with 0 requirements', async function() {
      assertThrows(MultiSigWallet.new(accounts.slice(0, 1), 0));
    });

    it ('should throw while creating wallet with 0 owners', async function() {
      assertThrows(MultiSigWallet.new([], 1));
    });

    it ('should throw while creating wallet with required > number of owners', async function() {
      assertThrows(MultiSigWallet.new(accounts.slice(0, 1), 2));
    });
  });

  describe('ownership changes', async function(){
    let wallet;
    let originalOwners;

    before(async function() {
      originalOwners = accounts.slice(0, 4);
      wallet = await MultiSigWallet.new(originalOwners, 1);

      let owners = await wallet.getOwners();
      assert.deepEqual(owners, originalOwners);
    });

    it('should allow to add owner', async function() {
      let addOwnerData = wallet.addOwner.request(accounts[4]).params[0].data;
      let addOwnerReceipt = await wallet.submitTransaction(wallet.address, 0, addOwnerData);
      assert.equal(addOwnerReceipt.logs.length, 4);
      assert.equal(addOwnerReceipt.logs[0].event,'Submission');
      assert.equal(addOwnerReceipt.logs[1].event,'Confirmation');
      assert.equal(addOwnerReceipt.logs[2].event,'OwnerAddition');
      assert.equal(addOwnerReceipt.logs[3].event,'Execution');

      let owners = await wallet.getOwners();
      assert.deepEqual(owners, accounts.slice(0,5));
    });

    it('should not allow to submit transaction except owner', async function() {
      let addOwnerData = wallet.addOwner.request(accounts[5]).params[0].data;
      assertThrows(wallet.submitTransaction(wallet.address, 0, addOwnerData, {from: accounts[5]}));
      assertThrows(wallet.submitTransaction(wallet.address, 0, addOwnerData, {from: accounts[6]}));
    });

    it('should allow to remove owner', async function() {
      let removeOwnerData = wallet.removeOwner.request(accounts[4]).params[0].data;
      let removeOwnerReceipt = await wallet.submitTransaction(wallet.address, 0, removeOwnerData);
      assert.equal(removeOwnerReceipt.logs.length, 4);
      assert.equal(removeOwnerReceipt.logs[0].event,'Submission');
      assert.equal(removeOwnerReceipt.logs[1].event,'Confirmation');
      assert.equal(removeOwnerReceipt.logs[2].event,'OwnerRemoval');
      assert.equal(removeOwnerReceipt.logs[3].event,'Execution');

      let owners = await wallet.getOwners();
      assert.deepEqual(owners, accounts.slice(0,4));
    });

    it('should allow to replace owner', async function() {
      let oldOwner = await wallet.owners(3);
      assert.equal(oldOwner, accounts[3]);

      let replaceOwnerData = wallet.replaceOwner.request(accounts[3], accounts[6]).params[0].data;
      let replaceOwnerReceipt = await wallet.submitTransaction(wallet.address, 0, replaceOwnerData);
      assert.equal(replaceOwnerReceipt.logs.length, 5);
      assert.equal(replaceOwnerReceipt.logs[0].event,'Submission');
      assert.equal(replaceOwnerReceipt.logs[1].event,'Confirmation');
      assert.equal(replaceOwnerReceipt.logs[2].event,'OwnerRemoval');
      assert.equal(replaceOwnerReceipt.logs[3].event,'OwnerAddition');
      assert.equal(replaceOwnerReceipt.logs[4].event,'Execution');

      let newOwner = await wallet.owners(3);
      assert.equal(newOwner, accounts[6]);

      let owners = await wallet.getOwners();
      assert.deepEqual(owners.length, 4);
    });

    it('should throw while removing last owner', async function() {
      let wallet2 = await MultiSigWallet.new(accounts.slice(0, 1), 1);
      let removeOwnerData = wallet2.removeOwner.request(accounts[0]).params[0].data;
      let removeOwnerReceipt = await wallet2.submitTransaction(wallet2.address, 0, removeOwnerData);
      assert.equal(removeOwnerReceipt.logs.length, 3);
      assert.equal(removeOwnerReceipt.logs[0].event,'Submission');
      assert.equal(removeOwnerReceipt.logs[1].event,'Confirmation');
      assert.equal(removeOwnerReceipt.logs[2].event,'ExecutionFailure');

      let owners = await wallet2.getOwners();
      assert.deepEqual(owners, accounts.slice(0, 1));

      let required = await wallet2.required();
      assert.equal(required, 1);
    });
  });

  describe('requirement changes', async function(){
    let wallet;
    let originalOwners;

    before(async function() {
      originalOwners = accounts.slice(0, 2);
      wallet = await MultiSigWallet.new(originalOwners, 2);

      let owners = await wallet.getOwners();
      assert.deepEqual(owners, originalOwners);

      let required = await wallet.required();
      assert.equal(required, 2);
    });

    it('should change requirements while removing owner if required', async function() {
      let owners = await wallet.getOwners();
      assert.deepEqual(owners, originalOwners);

      let required = await wallet.required();
      assert.equal(required, 2);

      let removeOwnerData = wallet.removeOwner.request(accounts[1]).params[0].data;
      let removeOwnerReceipt = await wallet.submitTransaction(wallet.address, 0, removeOwnerData, { from: accounts[0] });
      let txId = removeOwnerReceipt.logs[0].args.transactionId.toNumber();
      assert.equal(removeOwnerReceipt.logs.length, 2);
      assert.equal(removeOwnerReceipt.logs[0].event,'Submission');
      assert.equal(removeOwnerReceipt.logs[1].event,'Confirmation');

      // confirm transaction
      let confirmationReceipt = await wallet.confirmTransaction(txId, { from: accounts[1] });
      assert.equal(confirmationReceipt.logs.length, 4);
      assert.equal(confirmationReceipt.logs[0].event,'Confirmation');
      assert.equal(confirmationReceipt.logs[1].event,'RequirementChange');
      assert.equal(confirmationReceipt.logs[2].event,'OwnerRemoval');
      assert.equal(confirmationReceipt.logs[3].event,'Execution');

      owners = await wallet.getOwners();
      assert.deepEqual(owners, accounts.slice(0, 1));

      required = await wallet.required();
      assert.equal(required, 1);

      // add owners
      let newAccounts = accounts.slice(1, 4);
      for (let i = 0; i < newAccounts.length; i++) {
        let acc = newAccounts[i];
        let addOwnerData = wallet.addOwner.request(acc).params[0].data;
        let addOwnerReceipt = await wallet.submitTransaction(wallet.address, 0, addOwnerData);
        assert.equal(addOwnerReceipt.logs.length, 4);
      }

      owners = await wallet.getOwners();
      assert.deepEqual(owners, accounts.slice(0, 4));

      required = await wallet.required();
      assert.equal(required, 1);
    });

    it('should allow to change requirement', async function() {
      let required = await wallet.required();
      assert.equal(required, 1);

      // change requirement to 2
      let requirementData = wallet.changeRequirement.request(2).params[0].data;
      let receipt = await wallet.submitTransaction(wallet.address, 0, requirementData, { from: accounts[0] });
      assert.equal(receipt.logs.length, 4);
      assert.equal(receipt.logs[0].event,'Submission');
      assert.equal(receipt.logs[1].event,'Confirmation');
      assert.equal(receipt.logs[2].event,'RequirementChange');
      assert.equal(receipt.logs[3].event,'Execution');

      required = await wallet.required();
      assert.equal(required, 2);

      // change requirement to 3
      requirementData = wallet.changeRequirement.request(3).params[0].data;
      receipt = await wallet.submitTransaction(wallet.address, 0, requirementData, { from: accounts[0] });
      let txid = receipt.logs[0].args.transactionId.toNumber();
      assert.equal(receipt.logs.length, 2);
      assert.equal(receipt.logs[0].event,'Submission');
      assert.equal(receipt.logs[1].event,'Confirmation');

      receipt = await wallet.confirmTransaction(txid, { from: accounts[1] });
      assert.equal(receipt.logs.length, 3);
      assert.equal(receipt.logs[0].event,'Confirmation');
      assert.equal(receipt.logs[1].event,'RequirementChange');
      assert.equal(receipt.logs[2].event,'Execution');

      required = await wallet.required();
      assert.equal(required, 3);

      // try adding owner
      let owners;
      let numConfs;

      // submision and first confirmation
      let addOwnerData = wallet.addOwner.request(accounts[4]).params[0].data;
      receipt = await wallet.submitTransaction(wallet.address, 0, addOwnerData, { from: accounts[0]});
      txid = receipt.logs[0].args.transactionId.toNumber();
      assert.equal(receipt.logs.length, 2);
      assert.equal(receipt.logs[0].event,'Submission');
      assert.equal(receipt.logs[1].event,'Confirmation');

      numConfs = await wallet.getConfirmationCount(txid);
      assert.equal(numConfs, 1);

      owners = await wallet.getOwners();
      assert.deepEqual(owners, accounts.slice(0, 4));

      // check pending transaction id
      let totalTransaction = await wallet.transactionCount();
      let pendingTransactionCount = await wallet.getTransactionCount(true, false);
      let pendingTransactionIds = await wallet.getTransactionIds(0, totalTransaction, true, false);

      assert.equal(pendingTransactionCount, 1);
      assert.equal(pendingTransactionIds.length, 1);
      assert.equal(pendingTransactionIds[0].toNumber(), txid);

      // cannot confirm transaction except owner
      assertThrows(wallet.confirmTransaction(txid, { from: accounts[6] }));

      // second confirmation
      receipt = await wallet.confirmTransaction(txid, { from: accounts[1] });
      assert.equal(receipt.logs.length, 1);
      assert.equal(receipt.logs[0].event,'Confirmation');

      numConfs = await wallet.getConfirmationCount(txid);
      assert.equal(numConfs, 2);

      owners = await wallet.getOwners();
      assert.deepEqual(owners, accounts.slice(0, 4));

      // third confirmation
      receipt = await wallet.confirmTransaction(txid, { from: accounts[2] });
      assert.equal(receipt.logs.length, 3);
      assert.equal(receipt.logs[0].event,'Confirmation');
      assert.equal(receipt.logs[1].event,'OwnerAddition');
      assert.equal(receipt.logs[2].event,'Execution');

      numConfs = await wallet.getConfirmationCount(txid);
      assert.equal(numConfs, 3);

      owners = await wallet.getOwners();
      assert.deepEqual(owners, accounts.slice(0, 5));

      required = await wallet.required();
      assert.equal(required, 3);
    });
  });

  describe('confirm and revoke transaction', async function() {
    let wallet;
    let originalOwners;

    before(async function (){
      originalOwners = accounts.slice(0, 4);
      wallet = await MultiSigWallet.new(originalOwners, 2);
    });

    it('requires multiple confirmations', async function(){
      let functionData = wallet.addOwner.request(accounts[4]).params[0].data;
      let addOwnerReceipt = await wallet.submitTransaction(wallet.address, 0, functionData);
      assert.equal(addOwnerReceipt.logs.length, 2);
      assert.equal(addOwnerReceipt.logs[0].event, 'Submission');
      assert.equal(addOwnerReceipt.logs[1].event, 'Confirmation');
      assert.equal(addOwnerReceipt.logs[1].args.sender, accounts[0]);

      let txid = addOwnerReceipt.logs[1].args.transactionId.toNumber();
      let confs = await wallet.getConfirmations(txid);
      let numConfs = await wallet.getConfirmationCount(txid);

      assert.equal(confs.length, 1);
      assert.equal(confs.length, numConfs);

      let revokeReceipt = await wallet.revokeConfirmation(txid);
      assert.equal(revokeReceipt.logs.length, 1);
      assert.equal(revokeReceipt.logs[0].event,'Revocation');

      confs = await wallet.getConfirmations(txid);
      assert.equal(confs.length, 0, "Confirmation count should be 0");

      let transactionCount = await wallet.getTransactionCount(true, false);
      assert.equal(transactionCount, 1, "Transaction count should be 1");

      let transactionIds = await wallet.getTransactionIds(0, 1, true, false);
      assert.equal(transactionIds.length, 1, "Pending transaction length should be 1");
      assert.equal(transactionIds[0].toNumber(), txid, "Pending transaction id should be txid");

      let confirmReceipt = await wallet.confirmTransaction(txid, {from: accounts[1]});
      assert.equal(confirmReceipt.logs.length, 1, "Confirm transaction function result should have total 1 log");
      assert.equal(confirmReceipt.logs[0].event, 'Confirmation', "Confirm transaction function result should have confirmation log");

      confs = await wallet.getConfirmations(txid);
      assert.equal(confs.length, 1, "Confirmation count should be 1 after one confirmation");

      let confirmed = await wallet.isConfirmed(txid);
      assert.equal(confirmed, false, "Transaction should be confirmed yet - need 2 confirmation");

      numConfs = await wallet.getConfirmationCount(txid);
      assert.equal(numConfs, 1);

      confirmReceipt = await wallet.confirmTransaction(txid, {from: accounts[2]});
      assert.equal(confirmReceipt.logs.length, 3);
      assert.equal(confirmReceipt.logs[0].event,'Confirmation');
      assert.equal(confirmReceipt.logs[1].event,'OwnerAddition');
      assert.equal(confirmReceipt.logs[2].event,'Execution');

      numConfs = await wallet.getConfirmationCount(txid);
      assert.equal(numConfs, 2);

      transactionCount = await wallet.getTransactionCount(false, true);
      assert.equal(transactionCount, 1);

      confirmed = await wallet.isConfirmed(txid);
      assert.equal(confirmed, true);

      assertThrows(wallet.revokeConfirmation(txid), 'expected revokeConfirmation to fail');
    });
  });

  describe("withdraw", async function() {
    let wallet;
    let originalOwners;

    before(async function (){
      originalOwners = accounts.slice(0, 4);
      wallet = await MultiSigWallet.new(originalOwners, 2);

      let amount = web3.toWei(5, 'ether');

      // send money to wallet
      await wallet.sendTransaction({from: accounts[0], value: amount});

      // get balance
      let balance = web3.fromWei(web3.eth.getBalance(wallet.address), 'ether');
      assert.equal(balance.toNumber(), 5);
    });

    it("should allow to withdraw fund", async function(){
      let amount = web3.toWei(3, 'ether');
      let accountBalance = web3.fromWei(web3.eth.getBalance(accounts[5]), 'ether');

      let withdrawReceipt = await wallet.submitTransaction(accounts[5], amount, '0x');
      assert.equal(withdrawReceipt.logs.length, 2);
      let txid = withdrawReceipt.logs[0].args.transactionId.toNumber();
      assert.equal(withdrawReceipt.logs[0].event, 'Submission');
      assert.equal(withdrawReceipt.logs[1].event, 'Confirmation');
      assert.equal(withdrawReceipt.logs[1].args.sender, accounts[0]);

      withdrawReceipt = await wallet.confirmTransaction(txid, {from: accounts[1]});
      assert.equal(withdrawReceipt.logs.length, 2);
      assert.equal(withdrawReceipt.logs[0].event, 'Confirmation');
      assert.equal(withdrawReceipt.logs[1].event,'Execution');

      let newAccountBalance = web3.fromWei(web3.eth.getBalance(accounts[5]), 'ether');
      assert.equal(newAccountBalance.minus(accountBalance).toNumber(), 3, "Withdraw fund should be equal to value");

      let walletBalance = web3.fromWei(web3.eth.getBalance(wallet.address), 'ether');
      assert.equal(walletBalance.toNumber(), 2);
    });

    it("should not allow to withdraw fund except owner", async function(){
      let amount = web3.toWei(1, 'ether');
      let accountBalance = web3.fromWei(web3.eth.getBalance(accounts[5]), 'ether');
      assertThrows(wallet.submitTransaction(accounts[5], amount, '0x', {from: accounts[5]}));
    });

    it("should not allow to withdraw more fund than wallet has", async function(){
      let walletBalance = web3.fromWei(web3.eth.getBalance(wallet.address), 'ether');
      assert.equal(walletBalance.toNumber(), 2);

      let amount = web3.toWei(3, 'ether');
      let accountBalance = web3.fromWei(web3.eth.getBalance(accounts[5]), 'ether');
      let withdrawReceipt = await wallet.submitTransaction(accounts[5], amount, '0x', {from: accounts[0]});
      assert.equal(withdrawReceipt.logs.length, 2);
      let txid = withdrawReceipt.logs[0].args.transactionId.toNumber();
      assert.equal(withdrawReceipt.logs[0].event, 'Submission');
      assert.equal(withdrawReceipt.logs[1].event, 'Confirmation');
      assert.equal(withdrawReceipt.logs[1].args.sender, accounts[0]);

      withdrawReceipt = await wallet.confirmTransaction(txid, {from: accounts[1]});
      assert.equal(withdrawReceipt.logs.length, 2);
      assert.equal(withdrawReceipt.logs[0].event, 'Confirmation');
      assert.equal(withdrawReceipt.logs[1].event,'ExecutionFailure');

      walletBalance = web3.fromWei(web3.eth.getBalance(wallet.address), 'ether');
      assert.equal(walletBalance.toNumber(), 2);
    });
  });
});
