import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { ARC_MAINNET } from '../lib/arcConfig';
import ARTIFACT from '../../contracts/ArcAgentBazaar.json';
import { X, Rocket, CheckCircle2, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';

interface DeployContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContractDeployed: (address: string) => void;
}

export const DeployContractModal: React.FC<DeployContractModalProps> = ({
  isOpen,
  onClose,
  onContractDeployed,
}) => {
  if (!isOpen) return null;

  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [balanceUSDC, setBalanceUSDC] = useState<string>('0.0');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      provider.listAccounts().then((accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0].address);
          refreshAccountData(accounts[0].address);
        }
      }).catch(() => {});
    }
  }, []);

  const refreshAccountData = async (userAddress: string) => {
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const network = await provider.getNetwork();
      setChainId(Number(network.chainId));

      const bal = await provider.getBalance(userAddress);
      setBalanceUSDC(ethers.formatUnits(bal, 18));
    } catch (e: any) {
      console.error(e);
    }
  };

  const connectWallet = async () => {
    setErrorMessage(null);
    try {
      if (!(window as any).ethereum) {
        setErrorMessage('MetaMask is not installed.');
        return;
      }
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        await refreshAccountData(accounts[0]);
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Failed to connect MetaMask');
    }
  };

  const switchToArc = async () => {
    setErrorMessage(null);
    try {
      const eth = (window as any).ethereum;
      try {
        await eth.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: ARC_MAINNET.chainIdHex }],
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await eth.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: ARC_MAINNET.chainIdHex,
                chainName: ARC_MAINNET.name,
                nativeCurrency: ARC_MAINNET.currency,
                rpcUrls: ARC_MAINNET.rpcUrls,
                blockExplorerUrls: ARC_MAINNET.blockExplorerUrls,
              },
            ],
          });
        } else {
          throw switchError;
        }
      }
      if (account) {
        await refreshAccountData(account);
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Failed to switch network');
    }
  };

  const handleDeploy = async () => {
    setErrorMessage(null);
    setIsDeploying(true);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();

      const factory = new ethers.ContractFactory(ARTIFACT.abi, ARTIFACT.bytecode, signer);
      const contract = await factory.deploy();
      setTxHash(contract.deploymentTransaction()?.hash || null);

      await contract.waitForDeployment();
      const targetAddress = await contract.getAddress();

      setDeployedAddress(targetAddress);
      onContractDeployed(targetAddress);
    } catch (e: any) {
      setErrorMessage(e.message || 'Deployment rejected or failed.');
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0b0f1e] border border-cyan-500/50 rounded-2xl w-full max-w-lg p-6 shadow-[0_0_50px_rgba(0,242,254,0.2)] relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-cyan-400" />
            <h2 className="font-orbitron font-bold text-lg text-slate-100">
              Deploy ArcAgentBazaar to Circle Arc
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 flex items-start gap-2 text-rose-300 text-xs font-mono">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="break-all">{errorMessage}</span>
          </div>
        )}

        {deployedAddress ? (
          <div className="mt-6 space-y-4">
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-mono space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <span>Contract Deployed Successfully!</span>
              </div>
              <div>
                <span className="text-slate-500">Contract Address: </span>
                <span className="text-cyan-300 font-bold break-all">{deployedAddress}</span>
              </div>
              {txHash && (
                <div>
                  <span className="text-slate-500">Tx Hash: </span>
                  <a
                    href={`${ARC_MAINNET.blockExplorerUrls[0]}/tx/${txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-300 hover:underline inline-flex items-center gap-1"
                  >
                    <span>{txHash.slice(0, 18)}...</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
              <div>
                <span className="text-slate-500">Deployer (Owner): </span>
                <span className="text-slate-300 font-bold">{account}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-black font-bold font-sans text-sm tracking-wider"
            >
              Done & View Bazaar
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-4 text-xs font-mono">
            {/* Step 1: Wallet Connection */}
            <div className="p-3.5 bg-black/50 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">1. DEPLOYER WALLET</span>
                {account ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                  </span>
                ) : (
                  <span className="text-amber-400">Not Connected</span>
                )}
              </div>
              {account ? (
                <div className="text-slate-200">
                  <div className="text-slate-400 text-[11px]">Address:</div>
                  <div className="font-bold text-cyan-300 truncate">{account}</div>
                  <div className="mt-1 flex items-center justify-between text-slate-400 text-[11px]">
                    <span>Arc Gas Balance:</span>
                    <span className="text-emerald-400 font-bold">{balanceUSDC} USDC</span>
                  </div>
                </div>
              ) : (
                <button
                  onClick={connectWallet}
                  className="w-full py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-black font-bold rounded-lg text-xs"
                >
                  Connect MetaMask
                </button>
              )}
            </div>

            {/* Step 2: Target Network */}
            <div className="p-3.5 bg-black/50 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">2. TARGET NETWORK</span>
                {chainId === ARC_MAINNET.chainId ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Circle Arc Mainnet
                  </span>
                ) : (
                  <span className="text-amber-400">Wrong Network (ID: {chainId || 'None'})</span>
                )}
              </div>
              {chainId !== ARC_MAINNET.chainId && (
                <button
                  onClick={switchToArc}
                  className="w-full py-2 bg-purple-900/60 hover:bg-purple-800/80 border border-purple-500/50 text-purple-200 font-bold rounded-lg text-xs"
                >
                  Switch MetaMask to Arc Mainnet (5042)
                </button>
              )}
            </div>

            {/* Gas Fee Notice */}
            <div className="p-3 bg-cyan-950/40 border border-cyan-900/50 rounded-xl text-[11px] text-slate-400 leading-relaxed">
              <span className="text-cyan-300 font-bold">💡 Gas Fee Notice: </span>
              Arc uses native <span className="text-emerald-400 font-bold">USDC</span> for gas. Deploying this contract consumes approx <span className="text-white font-bold">~0.025 USDC</span> (under $0.03).
            </div>

            {/* Step 3: Deploy Button */}
            <div className="pt-2">
              <button
                onClick={handleDeploy}
                disabled={!account || chainId !== ARC_MAINNET.chainId || isDeploying}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold font-sans text-sm tracking-wider border border-cyan-400/50 shadow-[0_0_20px_rgba(0,242,254,0.3)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                {isDeploying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    <span>Deploying to Arc Layer-1...</span>
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4 text-black" />
                    <span>Deploy Contract with My Wallet</span>
                  </>
                )}
              </button>
            </div>

            {/* Alternative Remix Option */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
              <span>Or prefer Remix IDE?</span>
              <a
                href="https://remix.ethereum.org"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:underline flex items-center gap-1"
              >
                <span>Open Remix IDE</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
