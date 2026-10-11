import { useEffect, useMemo, useState } from "react";
import type { NetworkStatusInfo } from "../types/staking";
import { LIVE_NETWORKS, toNetworkConfig } from "../services/liveNetworks";
import { networkConfig } from "../services/networkConfig";
import { checkNetwork } from "../services/networkService";
import { formatDateTime, shortAddress } from "../lib/format";
import { useValidators } from "../state/ValidatorsContext";

const LABELS: Record<NetworkStatusInfo["state"], string> = {
  unconfigured: "Not selected",
  checking: "Checking…",
  connected: "Connected",
  mismatch: "Chain ID mismatch",
  unreachable: "Unreachable",
};

function host(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard can be blocked; the full address is also in the tooltip */
    }
  };
  return (
    <button type="button" className="copy-btn" onClick={() => void copy()} aria-label={label}>
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function NetworkStatus() {
  const { networkKey } = useValidators();
  const [nonce, setNonce] = useState(0);

  const config = useMemo(
    () => (networkKey ? toNetworkConfig(LIVE_NETWORKS[networkKey]) : networkConfig),
    [networkKey],
  );

  const [info, setInfo] = useState<NetworkStatusInfo>({
    state: "unconfigured",
    message: "No network selected.",
  });

  useEffect(() => {
    let cancelled = false;
    if (!config.rpcUrl) {
      setInfo({
        state: "unconfigured",
        message: 'Open Validators and choose Bradbury or Studio under "Read from a network".',
      });
      return;
    }
    setInfo({ state: "checking", message: "Contacting the endpoint…" });
    void checkNetwork(config).then((result) => {
      if (!cancelled) setInfo(result);
    });
    return () => {
      cancelled = true;
    };
  }, [config, nonce]);

  const chainShown = info.chainId ?? config.expectedChainId;
  const chainMatches = info.state === "connected" && config.expectedChainId !== undefined && info.chainId === config.expectedChainId;

  const stakingValue =
    networkKey === "studio" ? "Not available on Studio" : config.stakingAddress ? shortAddress(config.stakingAddress) : "Not set";

  return (
    <section className="card" aria-labelledby="net-title">
      <h2 id="net-title" className="sr-only">
        Network
      </h2>

      <div className="net-hero">
        <div className="net-name-row">
          <span className="net-name">{networkKey ? config.label : "No network selected"}</span>
          <span className={`state state-${info.state}`}>{LABELS[info.state]}</span>
        </div>
        {networkKey && chainShown !== undefined && <span className="chip">Chain ID {chainShown}</span>}
        <p className="net-msg">{info.message}</p>
      </div>

      <details className="more">
        <summary>Show details</summary>
        <div className="more-body">
      <dl className="info-grid">
        <div className="info-tile">
          <dt className="info-label">RPC endpoint</dt>
          <dd className="info-value">{config.rpcUrl ? host(config.rpcUrl) : "Not set"}</dd>
        </div>
        <div className="info-tile">
          <dt className="info-label">Chain check</dt>
          <dd className="info-value">
            {chainMatches ? `${info.chainId} (matches)` : info.chainId !== undefined ? String(info.chainId) : "Not checked"}
          </dd>
        </div>
        <div className="info-tile">
          <dt className="info-label">Settings</dt>
          <dd className="info-value">{networkKey ? "Confirmed (CLI + SDK)" : "Not verified"}</dd>
        </div>
        <div className="info-tile wide">
          <dt className="info-label">Staking contract</dt>
          <dd className="info-value info-value-row">
            <span title={config.stakingAddress}>{stakingValue}</span>
            {networkKey !== "studio" && config.stakingAddress && (
              <CopyButton text={config.stakingAddress} label="Copy staking contract address" />
            )}
          </dd>
        </div>
        <div className="info-tile wide">
          <dt className="info-label">Last check</dt>
          <dd className="info-value">{formatDateTime(info.checkedAt)}</dd>
        </div>
      </dl>

      <p className="fineprint">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8h.01M11 12h1v5h1" />
        </svg>
        <span>
          A reachable endpoint does not mean the validator list is live; see the data source below. Reading data never needs a wallet. Transactions are sent only from the Delegate page, after you approve them in your wallet.
        </span>
      </p>

      {config.rpcUrl && (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setNonce((n) => n + 1)}
          disabled={info.state === "checking"}
        >
          Check connection again
        </button>
      )}
        </div>
      </details>
    </section>
  );
}
