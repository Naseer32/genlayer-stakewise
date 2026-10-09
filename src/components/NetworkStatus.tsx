import { useEffect, useMemo, useState } from "react";
import type { NetworkStatusInfo } from "../types/staking";
import { LIVE_NETWORKS, toNetworkConfig } from "../services/liveNetworks";
import { networkConfig } from "../services/networkConfig";
import { checkNetwork } from "../services/networkService";
import { formatDateTime, shortAddress } from "../lib/format";
import { useValidators } from "../state/ValidatorsContext";

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
        message: 'No network selected. Open Validators and choose Bradbury or Studio under "Read from a network".',
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

  const stakingText =
    networkKey === "studio"
      ? "Not available on Studio"
      : config.stakingAddress
        ? shortAddress(config.stakingAddress)
        : "Not configured";

  const verifiedText = networkKey
    ? "Yes, confirmed from the GenLayer CLI and SDK"
    : config.verified
      ? "Marked as verified by operator"
      : "No";

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
          <dd>{networkKey ? config.label : "None selected"}</dd>
        </div>
        <div>
          <dt>RPC endpoint</dt>
          <dd>{config.rpcUrl ? host(config.rpcUrl) : "Not configured"}</dd>
        </div>
        <div>
          <dt>Chain ID</dt>
          <dd>
            {info.chainId ?? "Not checked"}
            {config.expectedChainId !== undefined && ` (expected ${config.expectedChainId})`}
          </dd>
        </div>
        <div>
          <dt>Staking contract</dt>
          <dd>{stakingText}</dd>
        </div>
        <div>
          <dt>Settings verified</dt>
          <dd>{verifiedText}</dd>
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
    </section>
  );
}
