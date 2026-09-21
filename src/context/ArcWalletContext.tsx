import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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

const DISCONNECT_STORAGE_KEY = 'arc_wallet_user_disconnected';

export const ArcWalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [balanceUSDC, setBalanceUSDC] = useState<string>('0.0000');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const providerRef = useRef<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);

  const isArc = chainId === ARC_MAINNET.chainId;

  // Helper to get or create BrowserProvider once
  const getBrowserProvider = useCallback(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      if (!providerRef.current) {
        providerRef.current = new ethers.BrowserProvider((window as any).ethereum);
      }
      return providerRef.current;
    }
    return null;
  }, []);

  // Refresh balance from on-chain (uses direct rpc fallback to avoid extra browser calls)
  const refreshBalance = useCallback(async () => {
    if (!account) return;
    try {
      const queryProvider = isArc && providerRef.current
        ? providerRef.current
        : new ethers.JsonRpcProvider(ARC_MAINNET.rpcUrls[0]);

      const bal = await queryProvider.getBalance(account);
      setBalanceUSDC(parseFloat(ethers.formatUnits(bal, 18)).toFixed(4));
    } catch (err) {
      console.warn('Failed to refresh balance:', err);
    }
  }, [account, isArc]);

  // Initial load: check if already authorized WITHOUT infinite loops
  useEffect(() => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      return;
    }

    const eth = (window as any).ethereum;
    const browserProvider = getBrowserProvider();
    if (!browserProvider) return;

    // Check user disconnect state
    const userDisconnected = sessionStorage.getItem(DISCONNECT_STORAGE_KEY) === 'true';

    const checkInitialAccounts = async () => {
      try {
        const network = await browserProvider.getNetwork();
        setChainId(Number(network.chainId));

        if (!userDisconnected) {
          const accounts = await eth.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0) {
            const userAccount = accounts[0];
            setAccount(userAccount);
            const userSigner = await browserProvider.getSigner();
            setSigner(userSigner);

            const bal = await browserProvider.getBalance(userAccount);
            setBalanceUSDC(parseFloat(ethers.formatUnits(bal, 18)).toFixed(4));
          }
        }
      } catch (e: any) {
        console.warn('Error during initial eth check:', e);
      }
    };

    checkInitialAccounts();

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        setAccount(null);
        setSigner(null);
        setBalanceUSDC('0.0000');
        sessionStorage.setItem(DISCONNECT_STORAGE_KEY, 'true');
      } else {
        const isManualDisconnect = sessionStorage.getItem(DISCONNECT_STORAGE_KEY) === 'true';
        if (!isManualDisconnect) {
          setAccount(accounts[0]);
          const userSigner = await browserProvider.getSigner();
          setSigner(userSigner);
          const bal = await browserProvider.getBalance(accounts[0]);
          setBalanceUSDC(parseFloat(ethers.formatUnits(bal, 18)).toFixed(4));
        }
      }
    };

    const handleChainChanged = async () => {
      try {
        const network = await browserProvider.getNetwork();
        setChainId(Number(network.chainId));
        if (account) {
          const bal = await browserProvider.getBalance(account);
          setBalanceUSDC(parseFloat(ethers.formatUnits(bal, 18)).toFixed(4));
        }
      } catch (err) {
        console.warn(err);
      }
    };

    eth.on('accountsChanged', handleAccountsChanged);
    eth.on('chainChanged', handleChainChanged);

    return () => {
      eth.removeListener('accountsChanged', handleAccountsChanged);
      eth.removeListener('chainChanged', handleChainChanged);
    };
  }, [getBrowserProvider]); // Run only once on mount

  // Explicit Connect MetaMask
  const connectMetaMask = async (): Promise<string | null> => {
    setError(null);
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      setError('MetaMask is not detected. Please install MetaMask to interact on Circle Arc.');
      return null;
    }
    setIsConnecting(true);
    try {
      sessionStorage.removeItem(DISCONNECT_STORAGE_KEY);
      const eth = (window as any).ethereum;
      const browserProvider = getBrowserProvider()!;

      const accounts = await eth.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts.length > 0) {
        const userAccount = accounts[0];
        setAccount(userAccount);
        const userSigner = await browserProvider.getSigner();
        setSigner(userSigner);

        const network = await browserProvider.getNetwork();
        const curChainId = Number(network.chainId);
        setChainId(curChainId);

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
    const browserProvider = getBrowserProvider()!;
    try {
      await eth.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ARC_MAINNET.chainIdHex }],
      });
      const network = await browserProvider.getNetwork();
      setChainId(Number(network.chainId));
      if (account) {
        const bal = await browserProvider.getBalance(account);
        setBalanceUSDC(parseFloat(ethers.formatUnits(bal, 18)).toFixed(4));
      }
      return true;
    } catch (switchError: any) {
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
          const network = await browserProvider.getNetwork();
          setChainId(Number(network.chainId));
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

  // Disconnect function: instantly and persistently disconnects
  const disconnect = useCallback(() => {
    sessionStorage.setItem(DISCONNECT_STORAGE_KEY, 'true');
    setAccount(null);
    setSigner(null);
    setBalanceUSDC('0.0000');
  }, []);

  const getBazaarContract = async (withSigner: boolean = false): Promise<ethers.Contract | null> => {
    const browserProvider = getBrowserProvider();
    if (withSigner) {
      let currentSigner = signer;
      if (!currentSigner && browserProvider) {
        await connectMetaMask();
        currentSigner = await browserProvider.getSigner();
      }
      if (!currentSigner) return null;
      return new ethers.Contract(ARC_MAINNET.contractAddress, BAZAAR_ABI, currentSigner);
    } else {
      const readProvider = browserProvider || new ethers.JsonRpcProvider(ARC_MAINNET.rpcUrls[0]);
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
        provider: providerRef.current,
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
