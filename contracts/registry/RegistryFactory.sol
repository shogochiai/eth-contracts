pragma solidity 0.4.19;

import "../Factory.sol";
import "./Registry.sol";


contract RegistryFactory is Factory {
  uint constant public VERSION = 1;

  function create(address _owner) public payable enoughPaid returns (address registry) {
    registry = new Registry(_owner);
    register(registry);
  }
}
