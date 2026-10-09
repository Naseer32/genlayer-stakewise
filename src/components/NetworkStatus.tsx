import { useCallback, useEffect, useState } from "react";
import type { NetworkStatusInfo } from "../types/staking";
import { networkConfig } from "../services/networkConfig";
import { checkNetwork } from "../services/networkService";
import { formatDateTime, shortAddress } from "../lib/format";

const LABELS: Record<NetworkStatusInfo["state"], string> = {
  unconfigured: "Not configured",
  checking: "Checking…",
  connected: "Endpoint reachable",
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

export default function NetworkStatus() {
  const [info, setInfo] = useState<NetworkStatusInfo>(() =>
    networkConfig.rpcUrl
      ? { state: "checking", message: "Contacting the configured endpoint…" }
      : {
          state: "unconfigured",
          message:
            "No RPC endpoint is configured. Set VITE_GENLAYER_RPC_URL after verifying it in the official GenLayer documentation.",
        },
  );

  const run = useCallback(async () => {
    setInfo({ state: "checking", message: "Contacting the configured endpoint…" });
    setInfo(await checkNetwork(networkConfig));
  }, []);

  useEffect(() => {
    if (networkConfig.rpcUrl) void run();
  }, [run]);

  return (
    <section className="card" aria-labelledby="net-title">
      <div className="card-head">
        <h2 id="net-title">Network</h2>
        <span className={`state state-${info.state}`}>{LABELS[info.state]}</span>
      </div>
      <p>{info.message}</p>
      <dl className="facts">
        <div>
          <dt>Network</dt>
          <dd>{networkConfig.label}</dd>
        </div>
        <div>
          <dt>RPC endpoint</dt>
          <dd>{networkConfig.rpcUrl ? host(networkConfig.rpcUrl) : "Not configured"}</dd>
        </div>
        <div>
          <dt>Chain ID</dt>
          <dd>
            {info.chainId ?? "Not checked"}
            {networkConfig.expectedChainId !== undefined && ` (expected ${networkConfig.expectedChainId})`}
          </dd>
        </div>
        <div>
          <dt>Staking contract</dt>
          <dd>{networkConfig.stakingAddress ? shortAddress(networkConfig.stakingAddress) : "Not configured"}</dd>
        </div>
        <div>
          <dt>Settings verified</dt>
          <dd>{networkConfig.verified ? "Marked as verified by operator" : "No"}</dd>
        </div>
        <div>
          <dt>Last check</dt>
          <dd>{formatDateTime(info.checkedAt)}</dd>
        </div>
      </dl>
      <p className="muted small">
        A reachable endpoint does not mean the validator list is live. See the data source below. This app is read-only:
        no wallet is connected and no transaction can be sent.
      </p>
      {networkConfig.rpcUrl && (
        <button type="button" className="btn btn-secondary" onClick={run} disabled={info.state === "checking"}>
          Check connection again
        </button>
      )}
    </section>
  );
}
