import { shortAddress } from "../lib/format";
import { useWallet } from "../state/WalletContext";

/** Compact wallet control for the top bar. Connecting only shares the public address. */
export default function WalletButton() {
  const { available, address, onBradbury, busy, connect, switchNetwork } = useWallet();

  if (!address) {
    return (
      <button
        type="button"
        className="btn btn-primary btn-sm wallet-btn"
        onClick={() => void connect()}
        disabled={busy || !available}
        title={available ? "Connect your wallet" : "No wallet found. Open this page in the MetaMask app browser."}
      >
        {busy ? "Connecting…" : "Connect wallet"}
      </button>
    );
  }

  if (!onBradbury) {
    return (
      <button
        type="button"
        className="btn btn-sm wallet-btn wallet-warn"
        onClick={() => void switchNetwork()}
        disabled={busy}
        title="Your wallet is on another network"
      >
        {busy ? "Waiting…" : "Switch to Bradbury"}
      </button>
    );
  }

  return (
    <a className="wallet-chip" href="#/delegate" title={`${address} (tap to manage)`}>
      <span className="wallet-dot" aria-hidden="true" />
      {shortAddress(address)}
    </a>
  );
}
