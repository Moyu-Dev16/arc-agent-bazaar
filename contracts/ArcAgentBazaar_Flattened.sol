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

/**
 * @title ArcAgentBazaar
 * @author Moyu-Dev16 for Circle Arc Microgrants 2026
 * @notice Native USDC Streaming Micropayments & Stall Registry for Autonomous AI Agents on Circle Arc Layer-1.
 * @dev Arc uses native USDC (18 decimals) as its gas and native value currency.
 */
contract ArcAgentBazaar is IArcAgentBazaar {
    string public constant NAME = "ArcAgentBazaar";
    string public constant VERSION = "1.0.0";

    // EIP-712 TypeHashes
    bytes32 public constant EIP712_DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

    bytes32 public constant VOUCHER_TYPEHASH = keccak256(
        "MicropayVoucher(bytes32 channelId,uint256 cumulativeAmount,uint256 nonce)"
    );

    bytes32 public immutable DOMAIN_SEPARATOR;

    // Reentrancy guard state
    uint256 private _status;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    // Registry Storage
    mapping(address => AgentStall) public stalls;
    address[] public registeredStallAddresses;

    // Channel Storage
    mapping(bytes32 => MicropayChannel) public channels;
    mapping(bytes32 => uint256) public channelHighestNonce;
    uint256 public totalChannelsCreated;
    uint256 public totalValueLocked; // in native USDC (wei)

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    constructor() {
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                keccak256(bytes(NAME)),
                keccak256(bytes(VERSION)),
                block.chainid,
                address(this)
            )
        );
        _status = _NOT_ENTERED;
    }

    // --- Stall Registry (智能体摆摊链上黄页) ---

    function registerStall(
        string calldata handle,
        string calldata title,
        string calldata category,
        uint256 ratePerUnit,
        string calldata endpoint
    ) external override {
        require(bytes(handle).length > 0, "Invalid handle");
        require(ratePerUnit > 0, "Rate must be positive");

        if (!stalls[msg.sender].active) {
            registeredStallAddresses.push(msg.sender);
        }

        stalls[msg.sender] = AgentStall({
            agentAddress: msg.sender,
            handle: handle,
            title: title,
            category: category,
            ratePerUnit: ratePerUnit,
            endpoint: endpoint,
            active: true
        });

        emit StallRegistered(msg.sender, handle, title, ratePerUnit);
    }

    function getAllStalls() external view returns (AgentStall[] memory) {
        uint256 count = registeredStallAddresses.length;
        AgentStall[] memory list = new AgentStall[](count);
        for (uint256 i = 0; i < count; i++) {
            list[i] = stalls[registeredStallAddresses[i]];
        }
        return list;
    }

    // --- State Channels (流式微支付通道) ---

    function openChannel(
        address provider,
        uint32 durationSeconds
    ) external payable override nonReentrant returns (bytes32 channelId) {
        require(msg.value > 0, "Deposit must be > 0");
        require(provider != address(0) && provider != msg.sender, "Invalid provider");
        require(durationSeconds >= 60, "Duration must be at least 60s");

        totalChannelsCreated++;
        channelId = keccak256(
            abi.encodePacked(msg.sender, provider, totalChannelsCreated, block.chainid)
        );

        channels[channelId] = MicropayChannel({
            buyer: msg.sender,
            provider: provider,
            totalDeposit: msg.value,
            settledAmount: 0,
            openTimestamp: uint32(block.timestamp),
            expirationTimestamp: uint32(block.timestamp + durationSeconds),
            status: ChannelStatus.Open
        });

        totalValueLocked += msg.value;

        emit ChannelOpened(
            channelId,
            msg.sender,
            provider,
            msg.value,
            uint32(block.timestamp + durationSeconds)
        );
    }

    function claimStreamingPayment(
        bytes32 channelId,
        uint256 cumulativeAmount,
        uint256 voucherNonce,
        bytes calldata signature
    ) external override nonReentrant {
        MicropayChannel storage ch = channels[channelId];
        require(ch.status == ChannelStatus.Open, "Channel not open");
        require(msg.sender == ch.provider, "Only provider can claim");
        require(voucherNonce > channelHighestNonce[channelId], "Nonce must be strictly increasing");
        require(cumulativeAmount <= ch.totalDeposit, "Amount exceeds deposit");
        require(cumulativeAmount > ch.settledAmount, "Amount not higher than settled");

        // Verify EIP-712 voucher signature from buyer
        bytes32 structHash = keccak256(
            abi.encode(VOUCHER_TYPEHASH, channelId, cumulativeAmount, voucherNonce)
        );
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
        );

        address signer = recoverSigner(digest, signature);
        require(signer == ch.buyer, "Invalid EIP-712 signature from buyer");

        uint256 payout = cumulativeAmount - ch.settledAmount;
        ch.settledAmount = cumulativeAmount;
        channelHighestNonce[channelId] = voucherNonce;
        totalValueLocked -= payout;

        (bool success, ) = payable(ch.provider).call{value: payout}("");
        require(success, "Native USDC transfer failed");

        emit StreamPaymentClaimed(channelId, ch.provider, payout, cumulativeAmount);
    }

    function closeChannelCooperative(
        bytes32 channelId,
        uint256 finalAmount,
        bytes calldata buyerSig,
        bytes calldata providerSig
    ) external override nonReentrant {
        MicropayChannel storage ch = channels[channelId];
        require(ch.status == ChannelStatus.Open, "Channel not open");
        require(finalAmount <= ch.totalDeposit, "Amount exceeds deposit");

        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(abi.encodePacked(channelId, finalAmount, "CLOSE"))
            )
        );

        require(recoverSigner(digest, buyerSig) == ch.buyer, "Invalid buyer signature");
        require(recoverSigner(digest, providerSig) == ch.provider, "Invalid provider signature");

        ch.status = ChannelStatus.Closed;
        uint256 providerPayout = finalAmount > ch.settledAmount ? finalAmount - ch.settledAmount : 0;
        uint256 buyerRefund = ch.totalDeposit - finalAmount;

        totalValueLocked -= (providerPayout + buyerRefund);

        if (providerPayout > 0) {
            (bool successP, ) = payable(ch.provider).call{value: providerPayout}("");
            require(successP, "Provider transfer failed");
        }

        if (buyerRefund > 0) {
            (bool successB, ) = payable(ch.buyer).call{value: buyerRefund}("");
            require(successB, "Buyer refund failed");
        }

        emit ChannelClosed(channelId, providerPayout, buyerRefund);
    }

    function claimTimeoutRefund(bytes32 channelId) external override nonReentrant {
        MicropayChannel storage ch = channels[channelId];
        require(ch.status == ChannelStatus.Open, "Channel not open");
        require(block.timestamp > ch.expirationTimestamp, "Channel not expired yet");
        require(msg.sender == ch.buyer, "Only buyer can claim timeout refund");

        ch.status = ChannelStatus.Closed;
        uint256 remainingRefund = ch.totalDeposit - ch.settledAmount;
        totalValueLocked -= remainingRefund;

        (bool success, ) = payable(ch.buyer).call{value: remainingRefund}("");
        require(success, "Refund transfer failed");

        emit ChannelClosed(channelId, 0, remainingRefund);
    }

    function recoverSigner(bytes32 digest, bytes memory signature) internal pure returns (address) {
        require(signature.length == 65, "Malformed signature length");
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        if (v < 27) v += 27;
        return ecrecover(digest, v, r, s);
    }

    receive() external payable {}
}
