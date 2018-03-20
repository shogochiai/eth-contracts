pragma solidity 0.4.19;

import "../lib/ECVerify.sol";
import "../lib/SafeMath.sol";
import "../lib/BytesLib.sol";


contract MultiSigWallet {
  using SafeMath for uint256;
  using ECVerify for bytes32;

  uint constant public MAX_OWNER_COUNT = 50;

  event Execution(address indexed destination, uint256 value, bytes data, uint256 nonce);
  event Deposit(address indexed sender, uint256 value);
  event OwnerAddition(address indexed _owner);
  event OwnerRemoval(address indexed _owner);
  event ThresholdChanged(uint256 _threshold);

  uint256 public nonce;
  mapping (address => bool) public isOwner;
  address[] public owners;
  uint256 public threshold;

  modifier onlyWallet() {
    require(msg.sender == address(this));
    _;
  }

  modifier ownerDoesNotExist(address owner) {
    require(!isOwner[owner]);
    _;
  }

  modifier ownerExists(address owner) {
    require(isOwner[owner]);
    _;
  }

  modifier notNull(address _address) {
    require(_address != 0);
    _;
  }

  modifier validRequirement(uint _ownerCount, uint _threshold) {
    require(_threshold > 0 && _ownerCount > 0);
    require(_ownerCount <= MAX_OWNER_COUNT);
    require(_threshold <= _ownerCount);
    _;
  }

  /// @dev Contract constructor sets initial owners and required number of confirmations.
  /// @param _owners List of initial owners.
  /// @param _threshold Number of required confirmations.
  function MultiSigWallet(
    address[] _owners,
    uint256 _threshold
  ) public
    validRequirement(_owners.length, _threshold)
  {
    for (uint i=0; i < _owners.length; i++) {
      if (isOwner[_owners[i]] || _owners[i] == 0) {
        revert();
      }
      isOwner[_owners[i]] = true;
    }
    owners = _owners;
    threshold = _threshold;
  }

  /// @dev Fallback function allows to deposit ether.
  function() public payable {
    if (msg.value > 0) {
      Deposit(msg.sender, msg.value);
    }
  }

  /// @dev Allows to add a new owner. Transaction has to be sent by wallet.
  /// @param owner Address of new owner.
  function addOwner(
    address owner
  ) public
    onlyWallet
    ownerDoesNotExist(owner)
    notNull(owner)
    validRequirement(owners.length + 1, threshold)
  {
    isOwner[owner] = true;
    owners.push(owner);
    OwnerAddition(owner);
  }

  /// @dev Allows to remove an owner. Transaction has to be sent by wallet.
  /// @param owner Address of owner.
  function removeOwner(
    address owner
  ) public onlyWallet ownerExists(owner) {
    isOwner[owner] = false;
    for (uint i = 0; i < owners.length - 1; i++) {
      if (owners[i] == owner) {
        owners[i] = owners[owners.length - 1];
        break;
      }
    }
    owners.length -= 1;
    if (threshold > owners.length) {
      changeThreshold(owners.length);
    }
    OwnerRemoval(owner);
  }

  /// @dev Allows to replace an owner with a new owner. Transaction has to be sent by wallet.
  /// @param owner Address of owner to be replaced.
  /// @param owner Address of new owner.
  function replaceOwner(
    address owner,
    address newOwner
  ) public
    onlyWallet
    ownerExists(owner)
    ownerDoesNotExist(newOwner)
  {
    for (uint i = 0; i < owners.length; i++) {
      if (owners[i] == owner) {
        owners[i] = newOwner;
        break;
      }
    }
    isOwner[owner] = false;
    isOwner[newOwner] = true;
    OwnerRemoval(owner);
    OwnerAddition(newOwner);
  }

  /// @dev Allows to change the number of required confirmations. Transaction has to be sent by wallet.
  /// @param _threshold Number of required confirmations.
  function changeThreshold(
    uint _threshold
  ) public
    onlyWallet
    validRequirement(owners.length, _threshold)
  {
    threshold = _threshold;
    ThresholdChanged(_threshold);
  }

  /// @dev Returns list of owners.
  /// @return List of owner addresses.
  function getOwners() public constant returns (address[]) {
    return owners;
  }

  /// @dev Execute transaction
  /// @param destination Transaction target address.
  /// @param value Transaction ether value.
  /// @param data Transaction data payload.
  /// @param sigs List of signatures from owners.
  function execute(
    address destination,
    uint256 value,
    bytes data,
    bytes sigs
  ) public {
    // check if threshold
    require(sigs.length / 65 >= threshold);

    // Follows EIP712 signed data scheme: https://github.com/ethereum/EIPs/pull/712
    bytes32 txHash = keccak256(
      keccak256("address wallet", "address destination", "uint256 value", "uint256 nonce", "bytes data"),
      keccak256(address(this), destination, value, nonce, data)
    );

    bytes memory sigElement;
    address lastAdd = address(0); // cannot have address(0) as an owner
    for (uint64 i = 0; i < sigs.length; i += 65) {
      sigElement = BytesLib.slice(sigs, i, 65);
      address recovered = ECVerify.ecrecovery(txHash, sigElement);
      require(recovered > lastAdd && isOwner[recovered]);
      lastAdd = recovered;
    }

    // If we make it here all signatures are accounted for
    nonce = nonce.add(1);

    // Make actual call
    // solhint-disable-next-line
    require(destination.call.value(value)(data));

    // broadcast event
    Execution(destination, value, data, nonce.sub(1));
  }
}
