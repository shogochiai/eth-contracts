pragma solidity ^0.4.11;

import "./mixin/Ownable.sol";

contract Factory is Ownable {
  uint public fee;

  // contract maps
  mapping(address => bool) public contractMap;
  // user->contracts mapping
  mapping(address => address[]) public contracts;

  // Event contract created
  event ContractCreated(address _sender, address _address);
  event FeeChanged(uint newFee);
  event FundWithdraw(uint amount);

  //
  // Modifiers
  //

  // Only if amount value is greater than/equals to decided fee
  modifier enoughPaid() {
    require(msg.value >= fee);
    _;
  }

  /// @dev Set fee for contract creation
  /// @param _fee for contract creation
  function updateFee(uint _fee) public onlyOwner {
    fee = _fee;
    FeeChanged(fee);
  }

  /// @dev Returns number of contracts by creator.
  /// @param creator Contract creator.
  /// @return Returns number of contracts by creator.
  function getContractCount(address creator) public constant returns (uint) {
    return contracts[creator].length;
  }

  /// @dev Registers contract in factory registry.
  /// @param _address of created contract.
  function register(address _address) internal {
    require(contractMap[_address] != true);

    contractMap[_address] = true;
    contracts[msg.sender].push(_address);
    ContractCreated(msg.sender, _address);
  }

  /// @dev Withdraw collected fees
  function withdraw() public onlyOwner {
    uint balance = this.balance;
    owner.transfer(this.balance);
    FundWithdraw(balance);
  }
}
