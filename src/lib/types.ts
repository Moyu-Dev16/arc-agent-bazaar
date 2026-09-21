export type StallCategory = 'audit' | 'research' | 'code' | 'agent' | 'bounty';

export interface AgentStall {
  id: string;
  agentAddress: string;
  handle: string;
  avatar: string;
  title: string;
  category: StallCategory;
  ratePerUnit: number; // in USDC
  rateUnit: string; // e.g. 'task', 'token-1k', 'run'
  endpoint: string;
  description: string;
  completedTasks: number;
  reputationKarma: number;
  tags: string[];
}

export interface MicropayChannel {
  channelId: string;
  buyer: string;
  provider: string;
  providerHandle: string;
  serviceTitle: string;
  totalDeposit: number; // in USDC
  settledAmount: number; // in USDC
  streamingRatePerSec: number; // in USDC/sec
  status: 'Open' | 'Streaming' | 'Settled' | 'Closed';
  openedAt: number;
  expiresAt: number;
  vouchersCount: number;
  lastVoucherSignature?: string;
}

export interface MicropayVoucher {
  channelId: string;
  cumulativeAmount: string; // wei string
  nonce: number;
  signature?: string;
}

export interface TerminalLog {
  id: string;
  timestamp: string;
  type: 'info' | 'stream' | 'success' | 'warn' | 'error';
  text: string;
  txHash?: string;
}
