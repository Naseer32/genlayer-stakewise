import { useState } from "react";
import type { NetworkStatusInfo } from "../types/staking";
import { LIVE_NETWORKS, toNetworkConfig, type NetworkKey } from "../services/liveNetworks";
import { checkNetwork } from "../services/networkService";
import { useValidators } from "../state/ValidatorsContext";

const ORDER: NetworkKey[] = ["bradbury", "studio"];

export default function LiveNetworkPanel() {
  const { loadLive, loading, networkKey } = useValidators();
  const [check, setCheck] = useState<{ key: NetworkKey; info: NetworkStatusInfo } | null>(null);

  const choose = async (key: NetworkKey) => {
    setCheck(null);
    const [info] = await Promise.all([checkNetwork(toNetworkConfig(LIVE_NETWORKS[key])), loadLive(key)]);
    setCheck({ key, info });
  };

  const selected = networkKey ? LIVE_NETWORKS[networkKey] : null;

  return (
    <section className="card" aria-labelledby="live-title">
      <h2 id="live-title">Read from a network</h2>
      <p className="small">
        Choose a network to read validators directly from it. This is read-only: no wallet is used and no transaction is sent.
      </p>
      <div className="btn-row">
        {ORDER.map((key) => {
          const n = LIVE_NETWORKS[key];
          return (
            <button
              key={key}
              type="button"
              className={networkKey === key ? "btn btn-primary" : "btn btn-secondary"}
              aria-pressed={networkKey === key}
              onClick={() => void choose(key)}
              disabled={loading}
            >
              {n.label} ({n.chainId})
            </button>
          );
        })}
      </div>
      {loading && <p role="status">Reading from the network…</p>}
      {selected && !loading && <p className="small">{selected.note}</p>}
      {check && !loading && (
        <div className={check.info.state === "connected" ? "notice notice-ok" : "notice notice-warn"} role="status">
          <p>
            Connection check for {LIVE_NETWORKS[check.key].label}: {check.info.message}
          </p>
        </div>
      )}
    </section>
  );
}
