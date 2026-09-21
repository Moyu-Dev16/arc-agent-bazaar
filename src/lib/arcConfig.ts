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
  contractAddress: '0xDf726AEEf70e33ed7DBCECdbb4d9ea9638dc46FB', // Live deployed contract on Arc Mainnet
};

export const CONTRACT_NAME = 'ArcAgentBazaar';
export const CONTRACT_VERSION = '1.0.0';
