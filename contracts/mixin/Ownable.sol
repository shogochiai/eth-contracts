pragma solidity ^0.4.11;

contract Ownable {
  address public owner;

  // Event
  event OwnershipChanged(address indexed newOwner, address indexed oldOwner);

  // Modifier
  modifier onlyOwner {
    require(msg.sender == owner);
    _;
  }

  function Ownable() {
    owner = msg.sender;
  }

  /**
   * @dev Allows the current owner to transfer control of the contract to a newOwner.
   * @param newOwner The address to transfer ownership to.
   */
  function transferOwnership(address newOwner) onlyOwner {
    require(newOwner != address(0));
    var oldOwner = owner;
    owner = newOwner;
    OwnershipChanged(newOwner, oldOwner);
  }
}
