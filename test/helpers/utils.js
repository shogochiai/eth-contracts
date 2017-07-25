export function getFunctionSelector (functionSignature) {
  // no spaces
  functionSignature = functionSignature.replace(/ /g, '');
  return web3.sha3(functionSignature).slice(0, 10);
};

export function getFunctionEncoding (functionSignature, args) {
  let selector = getFunctionSelector(functionSignature);
  let argString = '';
  for (let i = 0; i < args.length; i++) {
    let paddedArg = web3.toHex(args[i]).slice(2);
    while (paddedArg.length % 64 != 0) {
      paddedArg = '0' + paddedArg;
    }
    argString = argString + paddedArg;
  }
  return selector + argString;
};

export function mineOneBlock () {
  web3.currentProvider.send({
    jsonrpc: "2.0",
    method: "evm_mine",
    id: new Date().getTime(),
  });
};

export function mineToBlockHeight (targetBlockHeight) {
  while (web3.eth.blockNumber < targetBlockHeight) {
    mineOneBlock();
  }
};
