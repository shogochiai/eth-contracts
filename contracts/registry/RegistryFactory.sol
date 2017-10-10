pragma solidity ^0.4.15;

import "../Factory.sol";
import "./Registry.sol";

contract RegistryFactory is Factory {
  uint constant public version = 1;

  function create(address _owner) public payable enoughPaid returns (address registry) {
    registry = new Registry(_owner);
    register(registry);
  }
}
