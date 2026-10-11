import { shortAddress } from "../lib/format";
import { BRADBURY_CHAIN_ID } from "../services/wallet";
import { useWallet } from "../state/WalletContext";

export default function WalletPanel() {
  const { available, address, chainId, onBradbury, busy, error, connect, switchNetwork, disconnect } = useWallet();

  return (
    <section className="card" aria-labelledby="wallet-title">
      <h2 id="wallet-title">Wallet</h2>

      {!address && (
        <>
          <p className="small">
            Connect your wallet to delegate on Bradbury testnet. Connecting only shares your public address. The app never sees
            your keys or seed phrase, and nothing is sent until you approve it in your wallet.
          </p>
          {!available && (
            <div className="notice notice-warn" role="status">
              <p>No wallet detected in this browser. Open this page inside the MetaMask app browser, then try again.</p>
            </div>
          )}
          <button type="button" className="btn btn-primary" onClick={() => void connect()} disabled={busy || !available}>
            {busy ? "Waiting for wallet…" : "Connect wallet"}
          </button>
        </>
      )}

      {address && (
        <>
          <div className="net-hero">
            <div className="net-name-row">
              <span className="net-name" title={address}>
                {shortAddress(address)}
              </span>
              <span className={onBradbury ? "state state-connected" : "state state-mismatch"}>
                {onBradbury ? "Bradbury" : chainId === null ? "Network unknown" : `Wrong network (${chainId})`}
              </span>
            </div>
            <p className="net-msg">
              {onBradbury
                ? "Your wallet is on Bradbury testnet. Test GEN has no real value."
                : `Switch to Bradbury testnet (chain ${BRADBURY_CHAIN_ID}) before delegating.`}
            </p>
          </div>
          <div className="btn-row">
            {!onBradbury && (
              <button type="button" className="btn btn-primary" onClick={() => void switchNetwork()} disabled={busy}>
                {busy ? "Waiting for wallet…" : "Switch to Bradbury"}
              </button>
            )}
            <button type="button" className="btn btn-ghost" onClick={disconnect}>
              Disconnect
            </button>
          </div>
        </>
      )}

      {error && (
        <div className="notice notice-danger" role="alert">
          <p>{error}</p>
        </div>
      )}
    </section>
  );
}
