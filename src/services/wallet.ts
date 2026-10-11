/**
 * Wallet connection helpers (EIP-1193). The app never sees a private key or seed phrase:
 * the user's wallet app holds the keys and asks the user to approve every request.
 * This file only connects, reads the address and switches network. It sends no transaction.
 */

interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on?(event: string, handler: (arg: any) => void): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  removeListener?(event: string, handler: (arg: any) => void): void;
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

export const BRADBURY_CHAIN_ID = 4221;
export const BRADBURY_CHAIN_HEX = "0x107d";

/** Values taken from genlayer-js 1.1.8 (testnetBradbury). */
const BRADBURY_ADD_PARAMS = {
  chainId: BRADBURY_CHAIN_HEX,
  chainName: "GenLayer Bradbury Testnet",
  nativeCurrency: { name: "GEN Token", symbol: "GEN", decimals: 18 },
  rpcUrls: ["https://rpc.testnet-chain.genlayer.com", "https://rpc-bradbury.genlayer.com"],
  blockExplorerUrls: ["https://explorer-bradbury.genlayer.com/"],
};

export function getProvider(): Eip1193Provider | null {
  return typeof window !== "undefined" && window.ethereum ? window.ethereum : null;
}

export function hasWallet(): boolean {
  return getProvider() !== null;
}

export function walletErrorMessage(err: unknown): string {
  const e = err as { code?: number; message?: string } | undefined;
  if (e?.code === 4001) return "You rejected the request in your wallet.";
  if (e?.code === -32002) return "A request is already open in your wallet. Open the wallet and answer it.";
  return e?.message ? e.message : "The wallet returned an unknown error.";
}

export async function readChainId(): Promise<number | null> {
  const p = getProvider();
  if (!p) return null;
  const hex = (await p.request({ method: "eth_chainId" })) as string;
  return parseInt(hex, 16);
}

export async function connectWallet(): Promise<{ address: string; chainId: number | null }> {
  const p = getProvider();
  if (!p) throw new Error("No wallet found. Open this page inside the MetaMask app browser.");
  const accounts = (await p.request({ method: "eth_requestAccounts" })) as string[];
  if (!accounts || accounts.length === 0) throw new Error("The wallet did not share any account.");
  return { address: accounts[0], chainId: await readChainId() };
}

/** Asks the wallet to switch to Bradbury, adding the network first if the wallet does not know it. */
export async function switchToBradbury(): Promise<void> {
  const p = getProvider();
  if (!p) throw new Error("No wallet found.");
  try {
    await p.request({ method: "wallet_switchEthereumChain", params: [{ chainId: BRADBURY_CHAIN_HEX }] });
  } catch (err) {
    const e = err as { code?: number };
    if (e?.code === 4902 || e?.code === -32603) {
      await p.request({ method: "wallet_addEthereumChain", params: [BRADBURY_ADD_PARAMS] });
      return;
    }
    throw err;
  }
}

export function onWalletChange(handler: () => void): () => void {
  const p = getProvider();
  if (!p || !p.on) return () => undefined;
  p.on("accountsChanged", handler);
  p.on("chainChanged", handler);
  return () => {
    p.removeListener?.("accountsChanged", handler);
    p.removeListener?.("chainChanged", handler);
  };
}
