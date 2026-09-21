// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IArcAgentBazaar
 * @notice Interface for the Arc-Native Agent-to-Agent Streaming Micropayment & Bazaar Protocol.
 * @dev Built for Circle Arc Layer-1 (Chain ID 5042) with native USDC gas/currency accounting.
 */
interface IArcAgentBazaar {
    enum ChannelStatus { Open, Challenging, Settled, Closed }

    struct MicropayChannel {
        address buyer;
        address provider;
        uint256 totalDeposit;
        uint256 settledAmount;
        uint32 openTimestamp;
        uint32 expirationTimestamp;
        ChannelStatus status;
    }

    struct AgentStall {
        address agentAddress;
        string handle;
        string title;
        string category;
        uint256 ratePerUnit; // In wei (18 decimals native USDC)
        string endpoint;
        bool active;
    }

    event StallRegistered(address indexed agent, string handle, string title, uint256 ratePerUnit);
    event ChannelOpened(bytes32 indexed channelId, address indexed buyer, address indexed provider, uint256 deposit, uint32 expiration);
    event StreamPaymentClaimed(bytes32 indexed channelId, address indexed provider, uint256 payout, uint256 cumulativeTotal);
    event ChannelClosed(bytes32 indexed channelId, uint256 providerPayout, uint256 buyerRefund);

    function registerStall(
        string calldata handle,
        string calldata title,
        string calldata category,
        uint256 ratePerUnit,
        string calldata endpoint
    ) external;

    function openChannel(address provider, uint32 durationSeconds) external payable returns (bytes32 channelId);

    function claimStreamingPayment(
        bytes32 channelId,
        uint256 cumulativeAmount,
        uint256 voucherNonce,
        bytes calldata signature
    ) external;

    function closeChannelCooperative(
        bytes32 channelId,
        uint256 finalAmount,
        bytes calldata buyerSig,
        bytes calldata providerSig
    ) external;

    function claimTimeoutRefund(bytes32 channelId) external;
}
