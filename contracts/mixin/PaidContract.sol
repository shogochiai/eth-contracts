pragma solidity 0.4.19;

import "./Ownable.sol";


contract PaidContract is Ownable {
  // Fee
  uint public fee;

  // Events
  event FeeChanged(uint newFee);
  event FundWithdraw(uint amount);

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

  /// @dev Withdraw collected fees
  function withdraw() public onlyOwner {
    uint balance = this.balance;
    owner.transfer(this.balance);
    FundWithdraw(balance);
  }
}
