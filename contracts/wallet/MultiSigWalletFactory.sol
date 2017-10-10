pragma solidity ^0.4.17;

import "../Factory.sol";
import "./MultiSigWallet.sol";

/// @title Multisignature wallet factory - Allows creation of multisig wallet.
/// @author Stefan George - <stefan.george@consensys.net>
contract MultiSigWalletFactory is Factory {
  uint constant public version = 1;

  /// @dev Allows verified creation of multisignature wallet.
  /// @param _owners List of initial owners.
  /// @param _required Number of required confirmations.
  /// @return Returns wallet address.
  function create(address[] _owners, uint _required) public payable enoughPaid returns (address wallet) {
    wallet = new MultiSigWallet(_owners, _required);
    register(wallet);
  }
}
