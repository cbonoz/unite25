// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EthereumHTLC
 * @dev Hash Time Lock Contract for Ethereum side of cross-chain swaps with Stellar
 * Extends 1inch Fusion+ with bidirectional Ethereum ↔ Stellar swaps
 */
contract EthereumHTLC is ReentrancyGuard, Ownable {
    struct HTLCData {
        address sender;
        address receiver;
        address token;
        uint256 amount;
        bytes32 hashlock;
        uint256 timelock;
        bool withdrawn;
        bool refunded;
        uint256 createdAt;
        string stellarTxHash; // For tracking corresponding Stellar transaction
    }

    mapping(bytes32 => HTLCData) public htlcs;
    mapping(address => uint256) public userHTLCCount;

    // Events for tracking cross-chain operations
    event HTLCCreated(
        bytes32 indexed htlcId,
        address indexed sender,
        address indexed receiver,
        address token,
        uint256 amount,
        bytes32 hashlock,
        uint256 timelock,
        string stellarAddress
    );

    event HTLCWithdrawn(
        bytes32 indexed htlcId,
        bytes32 indexed secret,
        address indexed receiver
    );

    event HTLCRefunded(
        bytes32 indexed htlcId,
        address indexed sender
    );

    // For 1inch Fusion+ integration
    event FusionPlusOrder(
        bytes32 indexed htlcId,
        bytes32 indexed fusionOrderHash,
        address indexed maker
    );

    constructor() {}

    /**
     * @dev Create HTLC for Ethereum → Stellar swap
     * @param _receiver Ethereum address that can claim with secret
     * @param _token ERC20 token address (or ETH if address(0))
     * @param _amount Amount to lock
     * @param _hashlock Hash of the secret
     * @param _timelock Unix timestamp when timelock expires
     * @param _stellarAddress Destination Stellar address
     * @param _stellarTxHash Optional Stellar transaction hash for tracking
     */
    function createHTLC(
        address _receiver,
        address _token,
        uint256 _amount,
        bytes32 _hashlock,
        uint256 _timelock,
        string memory _stellarAddress,
        string memory _stellarTxHash
    ) external payable nonReentrant returns (bytes32) {
        require(_timelock > block.timestamp, "Timelock must be in future");
        require(_amount > 0, "Amount must be greater than 0");
        require(_receiver != address(0), "Invalid receiver address");
        require(bytes(_stellarAddress).length > 0, "Stellar address required");

        bytes32 htlcId = keccak256(
            abi.encodePacked(
                msg.sender,
                _receiver,
                _token,
                _amount,
                _hashlock,
                _timelock,
                block.timestamp,
                userHTLCCount[msg.sender]++
            )
        );

        require(htlcs[htlcId].sender == address(0), "HTLC already exists");

        // Handle ETH vs ERC20
        if (_token == address(0)) {
            require(msg.value == _amount, "Incorrect ETH amount");
        } else {
            require(msg.value == 0, "ETH not expected for ERC20");
            IERC20(_token).transferFrom(msg.sender, address(this), _amount);
        }

        htlcs[htlcId] = HTLCData({
            sender: msg.sender,
            receiver: _receiver,
            token: _token,
            amount: _amount,
            hashlock: _hashlock,
            timelock: _timelock,
            withdrawn: false,
            refunded: false,
            createdAt: block.timestamp,
            stellarTxHash: _stellarTxHash
        });

        emit HTLCCreated(
            htlcId,
            msg.sender,
            _receiver,
            _token,
            _amount,
            _hashlock,
            _timelock,
            _stellarAddress
        );

        return htlcId;
    }

    /**
     * @dev Withdraw funds by revealing the secret
     * @param _htlcId HTLC identifier
     * @param _secret The secret that hashes to hashlock
     */
    function withdraw(bytes32 _htlcId, string memory _secret) external nonReentrant {
        HTLCData storage htlc = htlcs[_htlcId];

        require(htlc.receiver == msg.sender, "Only receiver can withdraw");
        require(!htlc.withdrawn, "Already withdrawn");
        require(!htlc.refunded, "Already refunded");
        require(block.timestamp <= htlc.timelock, "Timelock expired");

        bytes32 secretHash = keccak256(abi.encodePacked(_secret));
        require(secretHash == htlc.hashlock, "Invalid secret");

        htlc.withdrawn = true;

        // Transfer funds
        if (htlc.token == address(0)) {
            payable(htlc.receiver).transfer(htlc.amount);
        } else {
            IERC20(htlc.token).transfer(htlc.receiver, htlc.amount);
        }

        emit HTLCWithdrawn(_htlcId, secretHash, htlc.receiver);
    }

    /**
     * @dev Refund funds after timelock expires
     * @param _htlcId HTLC identifier
     */
    function refund(bytes32 _htlcId) external nonReentrant {
        HTLCData storage htlc = htlcs[_htlcId];

        require(htlc.sender == msg.sender, "Only sender can refund");
        require(!htlc.withdrawn, "Already withdrawn");
        require(!htlc.refunded, "Already refunded");
        require(block.timestamp > htlc.timelock, "Timelock not yet expired");

        htlc.refunded = true;

        // Transfer funds back
        if (htlc.token == address(0)) {
            payable(htlc.sender).transfer(htlc.amount);
        } else {
            IERC20(htlc.token).transfer(htlc.sender, htlc.amount);
        }

        emit HTLCRefunded(_htlcId, htlc.sender);
    }

    /**
     * @dev Link HTLC with 1inch Fusion+ order for tracking
     * @param _htlcId HTLC identifier
     * @param _fusionOrderHash 1inch Fusion+ order hash
     */
    function linkFusionOrder(bytes32 _htlcId, bytes32 _fusionOrderHash) external {
        HTLCData storage htlc = htlcs[_htlcId];
        require(htlc.sender == msg.sender, "Only HTLC creator can link");

        emit FusionPlusOrder(_htlcId, _fusionOrderHash, msg.sender);
    }

    /**
     * @dev Get HTLC details
     */
    function getHTLC(bytes32 _htlcId) external view returns (HTLCData memory) {
        return htlcs[_htlcId];
    }

    /**
     * @dev Check if HTLC can be withdrawn
     */
    function canWithdraw(bytes32 _htlcId) external view returns (bool) {
        HTLCData storage htlc = htlcs[_htlcId];
        return !htlc.withdrawn && !htlc.refunded && block.timestamp <= htlc.timelock;
    }

    /**
     * @dev Check if HTLC can be refunded
     */
    function canRefund(bytes32 _htlcId) external view returns (bool) {
        HTLCData storage htlc = htlcs[_htlcId];
        return !htlc.withdrawn && !htlc.refunded && block.timestamp > htlc.timelock;
    }

    // Emergency functions (onlyOwner)
    function emergencyWithdraw(address _token, uint256 _amount) external onlyOwner {
        if (_token == address(0)) {
            payable(owner()).transfer(_amount);
        } else {
            IERC20(_token).transfer(owner(), _amount);
        }
    }
}
