import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { ARC_MAINNET } from '../lib/arcConfig';
import { BAZAAR_ABI } from '../lib/contractAbi';

interface ArcWalletContextType {
  account: string | null;
  chainId: number | null;
  isArc: boolean;
  balanceUSDC: string;
  isConnecting: boolean;
  error: string | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  connectMetaMask: () => Promise<string | null>;
  switchToArc: () => Promise<boolean>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  getBazaarContract: (withSigner?: boolean) => Promise<ethers.Contract | null>;
}

const ArcWalletContext = createContext<ArcWalletContextType>({} as any);

export const ArcWalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [balanceUSDC, setBalanceUSDC] = useState<string>('0.0000');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);

  const isArc = chainId === ARC_MAINNET.chainId;

  // Refresh balance from on-chain
  const refreshBalance = useCallback(async () => {
    if (!account) return;
    try {
      // Use fallback JsonRpcProvider if browser provider isn't on Arc
      const queryProvider = isArc && provider
        ? provider
        : new ethers.JsonRpcProvider(ARC_MAINNET.rpcUrls[0]);
      
      const bal = await queryProvider.getBalance(account);
      setBalanceUSDC(parseFloat(ethers.formatUnits(bal, 18)).toFixed(4));
    } catch (err) {
      console.warn('Failed to refresh balance:', err);
    }
  }, [account, isArc, provider]);

  // Handle Ethereum provider initialization
  const initEthereum = useCallback(async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      return;
    }
    const eth = (window as any).ethereum;
    const browserProvider = new ethers.BrowserProvider(eth);
    setProvider(browserProvider);

    try {
      const accounts = await eth.request({ method: 'eth_accounts' });
      const network = await browserProvider.getNetwork();
      const currentChainId = Number(network.chainId);
      setChainId(currentChainId);

      if (accounts && accounts.length > 0) {
        const userAccount = accounts[0];
        setAccount(userAccount);
        const userSigner = await browserProvider.getSigner();
        setSigner(userSigner);

        const bal = await browserProvider.getBalance(userAccount);
        setBalanceUSDC(parseFloat(ethers.formatUnits(bal, 18)).toFixed(4));
      }
    } catch (e: any) {
      console.warn('Error during eth initialization:', e);
    }
  }, []);

  useEffect(() => {
    initEthereum();

    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const eth = (window as any).ethereum;

      const handleAccountsChanged = async (accounts: string[]) => {
        if (accounts.length === 0) {
          setAccount(null);
          setSigner(null);
          setBalanceUSDC('0.0000');
        } else {
          setAccount(accounts[0]);
          if (provider) {
            const userSigner = await provider.getSigner();
            setSigner(userSigner);
            refreshBalance();
          }
        }
      };

      const handleChainChanged = (_chainIdHex: string) => {
        // Reload or update state
        initEthereum();
      };

      eth.on('accountsChanged', handleAccountsChanged);
      eth.on('chainChanged', handleChainChanged);

      return () => {
        eth.removeListener('accountsChanged', handleAccountsChanged);
        eth.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [initEthereum, provider, refreshBalance]);

  // Connect MetaMask
  const connectMetaMask = async (): Promise<string | null> => {
    setError(null);
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      setError('MetaMask is not detected. Please install MetaMask to interact on Circle Arc.');
      return null;
    }
    setIsConnecting(true);
    try {
      const eth = (window as any).ethereum;
      const browserProvider = new ethers.BrowserProvider(eth);
      setProvider(browserProvider);

      const accounts = await eth.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts.length > 0) {
        const userAccount = accounts[0];
        setAccount(userAccount);
        const userSigner = await browserProvider.getSigner();
        setSigner(userSigner);

        const network = await browserProvider.getNetwork();
        const curChainId = Number(network.chainId);
        setChainId(curChainId);

        // Check if network is Arc, if not prompt switch
        if (curChainId !== ARC_MAINNET.chainId) {
          await switchToArc();
        } else {
          const bal = await browserProvider.getBalance(userAccount);
          setBalanceUSDC(parseFloat(ethers.formatUnits(bal, 18)).toFixed(4));
        }

        setIsConnecting(false);
        return userAccount;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect MetaMask');
    } finally {
      setIsConnecting(false);
    }
    return null;
  };

  // Switch to Circle Arc Mainnet
  const switchToArc = async (): Promise<boolean> => {
    setError(null);
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      setError('MetaMask is not available.');
      return false;
    }
    const eth = (window as any).ethereum;
    try {
      await eth.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ARC_MAINNET.chainIdHex }],
      });
      await initEthereum();
      return true;
    } catch (switchError: any) {
      // 4902 means the chain has not been added to MetaMask
      if (switchError.code === 4902 || switchError.data?.originalError?.code === 4902) {
        try {
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
          await initEthereum();
          return true;
        } catch (addError: any) {
          setError(addError.message || 'Failed to add Arc network to MetaMask.');
          return false;
        }
      } else {
        setError(switchError.message || 'Failed to switch network.');
        return false;
      }
    }
  };

  const disconnect = () => {
    setAccount(null);
    setSigner(null);
    setBalanceUSDC('0.0000');
  };

  const getBazaarContract = async (withSigner: boolean = false): Promise<ethers.Contract | null> => {
    if (withSigner) {
      if (!signer) {
        // Try connecting
        await connectMetaMask();
      }
      if (!signer) return null;
      return new ethers.Contract(ARC_MAINNET.contractAddress, BAZAAR_ABI, signer);
    } else {
      const readProvider = provider || new ethers.JsonRpcProvider(ARC_MAINNET.rpcUrls[0]);
      return new ethers.Contract(ARC_MAINNET.contractAddress, BAZAAR_ABI, readProvider);
    }
  };

  return (
    <ArcWalletContext.Provider
      value={{
        account,
        chainId,
        isArc,
        balanceUSDC,
        isConnecting,
        error,
        provider,
        signer,
        connectMetaMask,
        switchToArc,
        disconnect,
        refreshBalance,
        getBazaarContract,
      }}
    >
      {children}
    </ArcWalletContext.Provider>
  );
};

export const useArcWallet = () => useContext(ArcWalletContext);
