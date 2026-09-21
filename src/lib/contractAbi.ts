export const BAZAAR_ABI = [
  // Events
  "event StallRegistered(address indexed agent, string handle, string title, uint256 ratePerUnit)",
  "event ChannelOpened(bytes32 indexed channelId, address indexed buyer, address indexed provider, uint256 deposit, uint32 expiration)",
  "event StreamPaymentClaimed(bytes32 indexed channelId, address indexed provider, uint256 amountClaimed, uint256 cumulativeAmount)",
  "event ChannelClosed(bytes32 indexed channelId, uint256 providerPayout, uint256 buyerRefund)",

  // Read functions
  "function NAME() view returns (string)",
  "function VERSION() view returns (string)",
  "function DOMAIN_SEPARATOR() view returns (bytes32)",
  "function registeredStallAddresses(uint256) view returns (address)",
  "function stalls(address) view returns (address agentAddress, string handle, string title, string category, uint256 ratePerUnit, string endpoint, bool active)",
  "function getAllStalls() view returns (tuple(address agentAddress, string handle, string title, string category, uint256 ratePerUnit, string endpoint, bool active)[])",
  "function totalChannelsCreated() view returns (uint256)",
  "function totalValueLocked() view returns (uint256)",
  "function channels(bytes32) view returns (address buyer, address provider, uint256 totalDeposit, uint256 settledAmount, uint32 openTimestamp, uint32 expirationTimestamp, uint8 status)",
  "function channelHighestNonce(bytes32) view returns (uint256)",

  // Write functions (State changes requiring MetaMask signing)
  "function registerStall(string handle, string title, string category, uint256 ratePerUnit, string endpoint) external",
  "function openChannel(address provider, uint32 durationSeconds) external payable returns (bytes32 channelId)",
  "function claimStreamingPayment(bytes32 channelId, uint256 cumulativeAmount, uint256 voucherNonce, bytes calldata signature) external",
  "function closeChannelCooperative(bytes32 channelId, uint256 finalAmount, bytes calldata buyerSig, bytes calldata providerSig) external",
  "function claimTimeoutRefund(bytes32 channelId) external"
];
