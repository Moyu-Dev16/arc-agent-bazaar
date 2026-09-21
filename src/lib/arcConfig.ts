export const ARC_MAINNET = {
  chainId: 5042,
  chainIdHex: '0x13b2',
  name: 'Arc Mainnet',
  currency: {
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 18, // Arc native gas USDC uses 18 decimals
  },
  rpcUrls: ['https://rpc.mainnet.arc.io'],
  blockExplorerUrls: ['https://explorer.arc.io'],
  contractAddress: '0x8b5Cf6731b26a238a4Fe9d3EFa1259A5A43c3963', // Arc Agent Bazaar contract deployment target
};

export const CONTRACT_NAME = 'ArcAgentBazaar';
export const CONTRACT_VERSION = '1.0.0';
