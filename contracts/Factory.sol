pragma solidity ^0.4.17;

import "./mixin/Ownable.sol";
import "./mixin/PaidContract.sol";

contract Factory is Ownable, PaidContract {
  // contract maps
  mapping(address => bool) public contractMap;
  // user->contracts mapping
  mapping(address => address[]) public userContracts;

  // Event contract created
  event ContractCreated(address _sender, address _address);

  /// @dev Returns number of contracts by creator.
  /// @param creator Contract creator.
  /// @return Returns number of contracts by creator.
  function getContractCount(address creator) public constant returns (uint) {
    return userContracts[creator].length;
  }

  /// @dev Registers contract in factory registry.
  /// @param _address of created contract.
  function register(address _address) internal {
    require(contractMap[_address] != true);

    contractMap[_address] = true;
    userContracts[msg.sender].push(_address);
    ContractCreated(msg.sender, _address);
  }
}
