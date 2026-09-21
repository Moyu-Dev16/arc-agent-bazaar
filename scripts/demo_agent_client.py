"""
ARC-STREAM: Autonomous AI Agent Client Daemon
Demonstrates Machine-to-Machine (M2M) Continuous USDC Micropayments on Circle Arc L1 (Chain ID: 5042)
Using EIP-712 Structured Typed Data for Zero-Gas Off-Chain Payment Streaming.
"""

import time
import json
from decimal import Decimal
from eth_account import Account
from eth_account.messages import encode_typed_data
from web3 import Web3

# 1. Circle Arc Mainnet Configuration
ARC_RPC_URL = "https://rpc.mainnet.arc.io"
ARC_CHAIN_ID = 5042
CONTRACT_ADDRESS = "0x8b5Cf6731b26a238a4Fe9d3EFa1259A5A43c3963"

# 2. EIP-712 Domain Specification
DOMAIN_DATA = {
    "name": "ArcAgentBazaar",
    "version": "1.0.0",
    "chainId": ARC_CHAIN_ID,
    "verifyingContract": CONTRACT_ADDRESS,
}

TYPES = {
    "EIP712Domain": [
        {"name": "name", "type": "string"},
        {"name": "version", "type": "string"},
        {"name": "chainId", "type": "uint256"},
        {"name": "verifyingContract", "type": "address"},
    ],
    "PaymentClaim": [
        {"name": "channelId", "type": "bytes32"},
        {"name": "payer", "type": "address"},
        {"name": "recipient", "type": "address"},
        {"name": "cumulativeAmount", "type": "uint256"},
        {"name": "nonce", "type": "uint256"},
    ],
}


class AutonomousAgentClient:
    def __init__(self, private_key: str):
        self.account = Account.from_key(private_key)
        self.w3 = Web3(Web3.HTTPProvider(ARC_RPC_URL))
        print(f"[*] Autonomous Agent Initialized: {self.account.address}")
        print(f"[*] Connected to Circle Arc L1 (Chain ID: {ARC_CHAIN_ID})")

    def check_network_status(self):
        try:
            block = self.w3.eth.block_number
            gas_price = self.w3.eth.gas_price
            print(f"[+] Arc Mainnet Block Height: #{block:,}")
            print(f"[+] Current USDC Gas Price: {self.w3.from_wei(gas_price, 'gwei')} Gwei")
            return True
        except Exception as e:
            print(f"[-] RPC Warning: {e}")
            return False

    def compute_channel_id(self, recipient: str, channel_index: int = 1) -> bytes:
        # Keccak256(abi.encodePacked(payer, recipient, channel_index))
        packed = Web3.solidity_keccak(
            ['address', 'address', 'uint256'],
            [self.account.address, recipient, channel_index]
        )
        return packed

    def sign_micropayment_stream(self, channel_id: bytes, recipient: str, cumulative_usdc: Decimal, nonce: int):
        # Native Arc USDC has 18 decimals
        amount_wei = int(cumulative_usdc * Decimal(10**18))

        message = {
            "channelId": channel_id,
            "payer": self.account.address,
            "recipient": recipient,
            "cumulativeAmount": amount_wei,
            "nonce": nonce,
        }

        structured_data = {
            "types": TYPES,
            "primaryType": "PaymentClaim",
            "domain": DOMAIN_DATA,
            "message": message,
        }

        encoded = encode_typed_data(full_message=structured_data)
        signed = self.account.sign_message(encoded)
        return signed.signature.hex(), encoded

    def run_streaming_job(self, vendor_address: str, duration_sec: int = 5, rate_per_second: Decimal = Decimal('0.0005')):
        channel_id = self.compute_channel_id(vendor_address)
        print(f"\n=======================================================")
        print(f"[*] OPENING OFF-CHAIN STREAM TO VENDOR: {vendor_address}")
        print(f"[*] Channel ID: 0x{channel_id.hex()}")
        print(f"[*] Streaming Rate: {rate_per_second} USDC/sec")
        print(f"=======================================================")

        cumulative_paid = Decimal('0.0')
        nonce = 0

        for i in range(1, duration_sec + 1):
            time.sleep(1.0)
            nonce += 1
            cumulative_paid += rate_per_second
            sig, _ = self.sign_micropayment_stream(channel_id, vendor_address, cumulative_paid, nonce)

            print(f"[T+{i}s] Nonce #{nonce:03d} | Cumulative: ${cumulative_paid:.6f} USDC | Sig: {sig[:20]}...")

        print(f"\n[+] Stream Complete. Total Streamed: ${cumulative_paid:.6f} USDC.")
        print(f"[+] Final State Claim Ready for On-Chain Settlement on Arc Contract: {CONTRACT_ADDRESS}")
        return cumulative_paid, nonce, sig


if __name__ == "__main__":
    # Test client using ephemeral private key
    test_key = "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d"
    vendor_sample = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"

    agent = AutonomousAgentClient(test_key)
    agent.check_network_status()
    agent.run_streaming_job(vendor_sample, duration_sec=5)
