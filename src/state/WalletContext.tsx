import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  BRADBURY_CHAIN_ID,
  connectWallet,
  getProvider,
  hasWallet,
  onWalletChange,
  readChainId,
  switchToBradbury,
  walletErrorMessage,
} from "../services/wallet";

interface WalletContextValue {
  available: boolean;
  address: string | null;
  chainId: number | null;
  onBradbury: boolean;
  busy: boolean;
  error: string | null;
  connect: () => Promise<void>;
  switchNetwork: () => Promise<void>;
  disconnect: () => void;
}

const Ctx = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await connectWallet();
      setAddress(result.address);
      setChainId(result.chainId);
    } catch (err) {
      setError(walletErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }, []);

  const switchNetwork = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await switchToBradbury();
      setChainId(await readChainId());
    } catch (err) {
      setError(walletErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
    setError(null);
  }, []);

  /* Keep in sync when the user changes account or network inside the wallet. No prompt is shown. */
  useEffect(() => {
    if (!address) return;
    return onWalletChange(() => {
      const p = getProvider();
      if (!p) return;
      void (async () => {
        try {
          const accounts = (await p.request({ method: "eth_accounts" })) as string[];
          setAddress(accounts && accounts.length > 0 ? accounts[0] : null);
          setChainId(await readChainId());
        } catch {
          /* ignore; the user can reconnect */
        }
      })();
    });
  }, [address]);

  const value = useMemo<WalletContextValue>(
    () => ({
      available: hasWallet(),
      address,
      chainId,
      onBradbury: chainId === BRADBURY_CHAIN_ID,
      busy,
      error,
      connect,
      switchNetwork,
      disconnect,
    }),
    [address, chainId, busy, error, connect, switchNetwork, disconnect],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallet(): WalletContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWallet must be used inside WalletProvider");
  return v;
}
