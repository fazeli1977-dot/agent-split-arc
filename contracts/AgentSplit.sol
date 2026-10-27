// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title AgentSplit
 * @notice Micropayment splitter for AI agent services. Accepts a USDC deposit,
 *         instantly splits it 95/5 between a recipient and the platform treasury,
 *         and records the settlement keyed by (payer, taskId) to prevent front-running.
 */
contract AgentSplit is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant MAX_FEE_BPS = 1_000;
    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant DEFAULT_FEE_BPS = 500;

    /// @notice The USDC ERC-20 contract (immutable, set in constructor).
    address public immutable usdc;
    /// @notice Receives the platform fee on every settlement.
    address public treasury;
    /// @notice Fee in basis points (default 500 = 5 %, capped at 1 000 = 10 %).
    uint256 public feeBps;

    IERC20 private immutable i_usdcToken;

    struct Settlement {
        bytes32 taskId;
        address payer;
        address recipient;
        uint256 totalAmount;
        uint256 recipientAmount;
        uint256 platformFee;
        uint256 timestamp;
    }

    /**
     * @notice Settlements keyed by keccak256(payer, taskId).
     *         Namespacing by payer prevents any third party from squatting a task ID
     *         and blocking the legitimate payer's settlement.
     */
    mapping(bytes32 => Settlement) public settlements;

    error ZeroAddress();
    error InvalidAmount();
    error FeeTooHigh(uint256 feeBps, uint256 maxFeeBps);
    error DuplicateTaskId(bytes32 taskId);

    event Settled(
        bytes32 indexed taskId,
        address indexed payer,
        address indexed recipient,
        uint256 totalAmount,
        uint256 recipientAmount,
        uint256 platformFee,
        address treasury
    );
    event TreasuryUpdated(address newTreasury);
    event FeeBpsUpdated(uint256 newFeeBps);

    constructor(address _usdc, address _treasury, address _owner) Ownable(_owner) {
        if (_usdc == address(0) || _treasury == address(0) || _owner == address(0)) {
            revert ZeroAddress();
        }
        usdc = _usdc;
        i_usdcToken = IERC20(_usdc);
        treasury = _treasury;
        feeBps = DEFAULT_FEE_BPS;
    }

    // -------------------------------------------------------------------------
    // Core

    /**
     * @notice Deposit USDC for a task, split it immediately between the recipient
     *         (amount * (BPS_DENOMINATOR - feeBps) / BPS_DENOMINATOR) and treasury.
     * @param taskId   Caller-chosen identifier for this task/invoice.
     * @param recipient Address that receives the agent service payment.
     * @param amount   Total USDC amount (6-decimal units); caller must pre-approve.
     */
    function deposit(bytes32 taskId, address recipient, uint256 amount) external nonReentrant {
        // --- Checks ---
        if (recipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert InvalidAmount();

        // Composite key: only msg.sender can settle under their own (payer, taskId) pair.
        bytes32 key = _settlementKey(msg.sender, taskId);
        if (settlements[key].payer != address(0)) revert DuplicateTaskId(taskId);

        uint256 platformFee = (amount * feeBps) / BPS_DENOMINATOR;
        uint256 recipientAmount = amount - platformFee;

        // --- Effects ---
        settlements[key] = Settlement({
            taskId: taskId,
            payer: msg.sender,
            recipient: recipient,
            totalAmount: amount,
            recipientAmount: recipientAmount,
            platformFee: platformFee,
            timestamp: block.timestamp
        });

        // --- Interactions ---
        i_usdcToken.safeTransferFrom(msg.sender, address(this), amount);
        i_usdcToken.safeTransfer(recipient, recipientAmount);
        if (platformFee > 0) {
            i_usdcToken.safeTransfer(treasury, platformFee);
        }

        emit Settled(taskId, msg.sender, recipient, amount, recipientAmount, platformFee, treasury);
    }

    /**
     * @notice Look up a settlement by payer + taskId.
     */
    function getSettlement(address payer, bytes32 taskId) external view returns (Settlement memory) {
        return settlements[_settlementKey(payer, taskId)];
    }

    // -------------------------------------------------------------------------
    // Admin

    /// @notice Update the platform fee treasury address.
    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    /// @notice Update the fee in basis points (max 1 000 = 10 %).
    function setFeeBps(uint256 newFeeBps) external onlyOwner {
        if (newFeeBps > MAX_FEE_BPS) revert FeeTooHigh(newFeeBps, MAX_FEE_BPS);
        feeBps = newFeeBps;
        emit FeeBpsUpdated(newFeeBps);
    }

    // -------------------------------------------------------------------------
    // Internal

    function _settlementKey(address payer, bytes32 taskId) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(payer, taskId));
    }
}
