import React, { useState } from 'react';
import { ethers } from 'ethers';
import { ARC_MAINNET } from '../lib/arcConfig';
import ARTIFACT from '../../contracts/ArcAgentBazaar.json';
import { X, Rocket, CheckCircle2, AlertCircle, RefreshCw, Wallet } from 'lucide-react';
import { useArcWallet } from '../context/ArcWalletContext';

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

  const { account, isArc, balanceUSDC, connectMetaMask, switchToArc, signer, refreshBalance } = useArcWallet();

  const [isDeploying, setIsDeploying] = useState(false);
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDeploy = async () => {
    setErrorMessage(null);
    if (!account || !signer) {
      const acc = await connectMetaMask();
      if (!acc) return;
    }
    if (!isArc) {
      const switched = await switchToArc();
      if (!switched) return;
    }

    setIsDeploying(true);
    try {
      if (!signer) throw new Error('Signer not found. Please connect MetaMask.');

      const factory = new ethers.ContractFactory(ARTIFACT.abi, ARTIFACT.bytecode, signer);
      const contract = await factory.deploy({ gasLimit: 2500000 });
      const deployTx = contract.deploymentTransaction();
      if (deployTx) {
        setTxHash(deployTx.hash);
      }

      await contract.waitForDeployment();
      const targetAddress = await contract.getAddress();

      setDeployedAddress(targetAddress);
      onContractDeployed(targetAddress);
      refreshBalance();
    } catch (e: any) {
      if (e.code === 4001 || e.code === 'ACTION_REJECTED') {
        setErrorMessage('Deployment transaction cancelled in MetaMask.');
      } else {
        setErrorMessage(e.reason || e.message || 'Deployment failed.');
      }
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
              <div>Address: <span className="text-white font-bold">{deployedAddress}</span></div>
              {txHash && (
                <div className="truncate">
                  Tx: <a href={`https://explorer.arc.io/tx/${txHash}`} target="_blank" rel="noreferrer" className="underline text-cyan-400">{txHash}</a>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs cursor-pointer"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="p-4 rounded-xl bg-black/40 border border-slate-800 text-xs font-mono space-y-2.5">
              <div className="flex items-center justify-between text-slate-400">
                <span>Target Chain:</span>
                <span className="text-cyan-300 font-bold">{ARC_MAINNET.name} (Chain ID: {ARC_MAINNET.chainId})</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Native Gas Token:</span>
                <span className="text-emerald-400 font-bold">USDC (18 Decimals)</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Connected Wallet:</span>
                <span className="text-slate-200">{account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Not connected'}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Gas Balance:</span>
                <span className="text-emerald-300 font-bold">{balanceUSDC} USDC</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300 hover:text-white"
              >
                Cancel
              </button>

              {!account ? (
                <button
                  type="button"
                  onClick={connectMetaMask}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold font-sans text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Wallet className="w-4 h-4" />
                  <span>Connect MetaMask</span>
                </button>
              ) : !isArc ? (
                <button
                  type="button"
                  onClick={switchToArc}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold font-sans text-xs cursor-pointer"
                >
                  Switch to Arc ({ARC_MAINNET.chainId})
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDeploy}
                  disabled={isDeploying}
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold font-sans text-xs tracking-wider border border-purple-400/50 shadow-[0_0_15px_rgba(168,85,247,0.3)] cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isDeploying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Deploying via MetaMask...</span>
                    </>
                  ) : (
                    <span>Deploy Contract</span>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
