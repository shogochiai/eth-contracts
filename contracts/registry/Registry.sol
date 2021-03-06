pragma solidity 0.4.19;

import "../mixin/Ownable.sol";


contract Registry is Ownable {
  uint constant public VERSION = 1;

  // id -> address mapping
  mapping(bytes32 => address) public addressMap;

  // Events
  event Registered(bytes32 indexed _id, address indexed _address, address indexed _sender);
  event Unregistered(bytes32 indexed _id);

  /// @dev contructor
  function Registry(address _owner) public {
    owner = _owner;
  }

  // Methods
  /// @dev Registers contract in registry.
  /// @param _id of contract.
  /// @param _address of contract.
  function register(bytes32 _id, address _address) public onlyOwner {
    addressMap[_id] = _address;
    Registered(_id, _address, msg.sender);
  }

  /// @dev Unregisters contract in registry.
  /// @param _id of contract.
  function unregister(bytes32 _id) public onlyOwner {
    delete addressMap[_id];
    Unregistered(_id);
  }

  /// @dev Resolves id with contract address.
  /// @param _id of contract.
  function resolve(bytes32 _id) public view returns (address _address) {
    _address = addressMap[_id];
  }
}
