import { ethers } from 'ethers';
import { ARC_MAINNET, CONTRACT_NAME, CONTRACT_VERSION } from './arcConfig';

export const EIP712_DOMAIN_TYPE = {
  name: CONTRACT_NAME,
  version: CONTRACT_VERSION,
  chainId: ARC_MAINNET.chainId,
  verifyingContract: ARC_MAINNET.contractAddress,
};

export const VOUCHER_TYPES = {
  MicropayVoucher: [
    { name: 'channelId', type: 'bytes32' },
    { name: 'cumulativeAmount', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
  ],
};

/**
 * Creates and signs an off-chain micro-payment voucher on Circle Arc.
 */
export async function signMicropayVoucher(
  signer: ethers.Signer,
  channelId: string,
  cumulativeAmountWei: bigint,
  nonce: number
): Promise<string> {
  const value = {
    channelId,
    cumulativeAmount: cumulativeAmountWei.toString(),
    nonce,
  };

  // Uses EIP-712 typed signing
  return await signer.signTypedData(EIP712_DOMAIN_TYPE, VOUCHER_TYPES, value);
}

/**
 * Recovers the signer address from an EIP-712 signed voucher.
 */
export function verifyMicropayVoucher(
  channelId: string,
  cumulativeAmountWei: bigint,
  nonce: number,
  signature: string
): string {
  const value = {
    channelId,
    cumulativeAmount: cumulativeAmountWei.toString(),
    nonce,
  };

  return ethers.verifyTypedData(EIP712_DOMAIN_TYPE, VOUCHER_TYPES, value, signature);
}

/**
 * Generates a deterministic channelId for an Arc micro-payment stream.
 */
export function computeChannelId(
  buyer: string,
  provider: string,
  nonce: number,
  chainId: number = ARC_MAINNET.chainId
): string {
  return ethers.solidityPackedKeccak256(
    ['address', 'address', 'uint256', 'uint256'],
    [buyer, provider, nonce, chainId]
  );
}
