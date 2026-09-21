import { describe, it, expect } from 'vitest';
import { ethers } from 'ethers';
import { computeChannelId, signMicropayVoucher, verifyMicropayVoucher } from '../src/lib/eip712';
import { ARC_MAINNET } from '../src/lib/arcConfig';

describe('ArcAgentBazaar Cryptographic & Channel Protocol', () => {
  const buyerWallet = ethers.Wallet.createRandom();
  const providerWallet = ethers.Wallet.createRandom();
  const attackerWallet = ethers.Wallet.createRandom();

  it('computes deterministic channelId based on buyer, provider, nonce and Arc Chain ID (5042)', () => {
    const channelId1 = computeChannelId(buyerWallet.address, providerWallet.address, 1, 5042);
    const channelId2 = computeChannelId(buyerWallet.address, providerWallet.address, 1, 5042);
    const channelIdOther = computeChannelId(buyerWallet.address, providerWallet.address, 2, 5042);

    expect(channelId1).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(channelId1).toBe(channelId2);
    expect(channelId1).not.toBe(channelIdOther);
  });

  it('signs and verifies valid EIP-712 micropayment vouchers on Arc', async () => {
    const channelId = computeChannelId(buyerWallet.address, providerWallet.address, 1, 5042);
    const cumulativeAmount = ethers.parseUnits('0.25', 18); // 0.25 native USDC
    const nonce = 1;

    const signature = await signMicropayVoucher(buyerWallet, channelId, cumulativeAmount, nonce);
    expect(signature).toMatch(/^0x[a-fA-F0-9]{130}$/);

    const recoveredSigner = verifyMicropayVoucher(channelId, cumulativeAmount, nonce, signature);
    expect(recoveredSigner.toLowerCase()).toBe(buyerWallet.address.toLowerCase());
  });

  it('detects tampered cumulativeAmount in voucher signature verification', async () => {
    const channelId = computeChannelId(buyerWallet.address, providerWallet.address, 1, 5042);
    const originalAmount = ethers.parseUnits('0.10', 18);
    const tamperedAmount = ethers.parseUnits('1.00', 18);
    const nonce = 2;

    const signature = await signMicropayVoucher(buyerWallet, channelId, originalAmount, nonce);

    // Verifying with tampered amount must NOT recover buyer address
    const recoveredSigner = verifyMicropayVoucher(channelId, tamperedAmount, nonce, signature);
    expect(recoveredSigner.toLowerCase()).not.toBe(buyerWallet.address.toLowerCase());
  });

  it('rejects vouchers signed by unauthorized attacker wallet', async () => {
    const channelId = computeChannelId(buyerWallet.address, providerWallet.address, 1, 5042);
    const amount = ethers.parseUnits('0.50', 18);
    const nonce = 3;

    // Attacker tries to forge a voucher
    const fakeSignature = await signMicropayVoucher(attackerWallet, channelId, amount, nonce);
    const recovered = verifyMicropayVoucher(channelId, amount, nonce, fakeSignature);

    expect(recovered.toLowerCase()).toBe(attackerWallet.address.toLowerCase());
    expect(recovered.toLowerCase()).not.toBe(buyerWallet.address.toLowerCase());
  });

  it('correctly calculates streaming delta payouts and remainder balances', () => {
    const totalDeposit = ethers.parseUnits('5.00', 18);
    let settledAmount = 0n;

    // Step 1: Claim 1.20 USDC
    const voucher1 = ethers.parseUnits('1.20', 18);
    const payout1 = voucher1 - settledAmount;
    settledAmount = voucher1;
    expect(payout1).toBe(ethers.parseUnits('1.20', 18));
    expect(totalDeposit - settledAmount).toBe(ethers.parseUnits('3.80', 18));

    // Step 2: Stream additional 0.80 USDC (cumulative 2.00 USDC)
    const voucher2 = ethers.parseUnits('2.00', 18);
    const payout2 = voucher2 - settledAmount;
    settledAmount = voucher2;
    expect(payout2).toBe(ethers.parseUnits('0.80', 18));
    expect(totalDeposit - settledAmount).toBe(ethers.parseUnits('3.00', 18));
  });

  it('verifies Arc mainnet parameters match official specifications', () => {
    expect(ARC_MAINNET.chainId).toBe(5042);
    expect(ARC_MAINNET.currency.symbol).toBe('USDC');
    expect(ARC_MAINNET.currency.decimals).toBe(18);
    expect(ARC_MAINNET.rpcUrls[0]).toBe('https://rpc.mainnet.arc.io');
  });
});
