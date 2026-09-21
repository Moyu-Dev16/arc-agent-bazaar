// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IArcAgentBazaar.sol";

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

    function openChannel(address provider, uint32 durationSeconds)
        external
        payable
        override
        nonReentrant
        returns (bytes32 channelId)
    {
        require(msg.value > 0, "Deposit required");
        require(provider != address(0) && provider != msg.sender, "Invalid provider");
        require(durationSeconds >= 60, "Duration too short");

        totalChannelsCreated++;
        channelId = keccak256(
            abi.encodePacked(msg.sender, provider, totalChannelsCreated, block.chainid)
        );

        uint32 expiration = uint32(block.timestamp) + durationSeconds;

        channels[channelId] = MicropayChannel({
            buyer: msg.sender,
            provider: provider,
            totalDeposit: msg.value,
            settledAmount: 0,
            openTimestamp: uint32(block.timestamp),
            expirationTimestamp: expiration,
            status: ChannelStatus.Open
        });

        totalValueLocked += msg.value;

        emit ChannelOpened(channelId, msg.sender, provider, msg.value, expiration);
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
        require(cumulativeAmount <= ch.totalDeposit, "Exceeds channel deposit");
        require(cumulativeAmount > ch.settledAmount, "No new funds to claim");
        require(voucherNonce > channelHighestNonce[channelId], "Nonce already used");

        // Verify EIP-712 signature from Buyer
        bytes32 structHash = keccak256(
            abi.encode(VOUCHER_TYPEHASH, channelId, cumulativeAmount, voucherNonce)
        );
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
        );

        address signer = recoverSigner(digest, signature);
        require(signer == ch.buyer, "Invalid voucher signature");

        // Calculate incremental payout
        uint256 payout = cumulativeAmount - ch.settledAmount;
        ch.settledAmount = cumulativeAmount;
        channelHighestNonce[channelId] = voucherNonce;
        totalValueLocked -= payout;

        // On Arc, msg.value and native transfers are in native USDC
        (bool success, ) = payable(ch.provider).call{value: payout}("");
        require(success, "USDC transfer failed");

        emit StreamPaymentClaimed(channelId, ch.provider, payout, cumulativeAmount);

        // If 100% of deposit is settled, close channel automatically
        if (ch.settledAmount == ch.totalDeposit) {
            ch.status = ChannelStatus.Closed;
            emit ChannelClosed(channelId, ch.totalDeposit, 0);
        }
    }

    function closeChannelCooperative(
        bytes32 channelId,
        uint256 finalAmount,
        bytes calldata buyerSig,
        bytes calldata providerSig
    ) external override nonReentrant {
        MicropayChannel storage ch = channels[channelId];
        require(ch.status == ChannelStatus.Open, "Channel not open");
        require(finalAmount <= ch.totalDeposit, "Exceeds deposit");
        require(finalAmount >= ch.settledAmount, "Below already settled");

        // Verify mutual agreement signatures
        bytes32 closeHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", keccak256(abi.encode(channelId, finalAmount, "CLOSE")))
        );

        require(recoverSigner(closeHash, buyerSig) == ch.buyer, "Invalid buyer close sig");
        require(recoverSigner(closeHash, providerSig) == ch.provider, "Invalid provider close sig");

        ch.status = ChannelStatus.Closed;

        uint256 providerPayout = finalAmount - ch.settledAmount;
        uint256 buyerRefund = ch.totalDeposit - finalAmount;

        totalValueLocked -= (providerPayout + buyerRefund);

        if (providerPayout > 0) {
            (bool success1, ) = payable(ch.provider).call{value: providerPayout}("");
            require(success1, "Provider payout failed");
        }

        if (buyerRefund > 0) {
            (bool success2, ) = payable(ch.buyer).call{value: buyerRefund}("");
            require(success2, "Buyer refund failed");
        }

        emit ChannelClosed(channelId, finalAmount, buyerRefund);
    }

    function claimTimeoutRefund(bytes32 channelId) external override nonReentrant {
        MicropayChannel storage ch = channels[channelId];
        require(ch.status == ChannelStatus.Open, "Channel not open");
        require(msg.sender == ch.buyer, "Only buyer can claim timeout refund");
        require(block.timestamp > ch.expirationTimestamp, "Channel has not expired");

        ch.status = ChannelStatus.Closed;

        uint256 refundAmount = ch.totalDeposit - ch.settledAmount;
        totalValueLocked -= refundAmount;

        if (refundAmount > 0) {
            (bool success, ) = payable(ch.buyer).call{value: refundAmount}("");
            require(success, "Refund failed");
        }

        emit ChannelClosed(channelId, ch.settledAmount, refundAmount);
    }

    // --- Cryptographic Helper ---

    function recoverSigner(bytes32 hash, bytes memory signature) internal pure returns (address) {
        if (signature.length != 65) return address(0);

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }

        if (v < 27) {
            v += 27;
        }

        if (v != 27 && v != 28) {
            return address(0);
        }

        return ecrecover(hash, v, r, s);
    }

    // Fallback to receive native USDC
    receive() external payable {}
}
