import { useState } from "react";
import { shortAddress } from "../lib/format";
import { claimFunds, exitAll, readPositions, type PositionsResult } from "../services/withdrawal";
import { delegationErrorMessage } from "../services/delegation";
import { displayName } from "../services/validatorService";
import { useValidators } from "../state/ValidatorsContext";
import { useWallet } from "../state/WalletContext";

const EXPLORER = "https://explorer-bradbury.genlayer.com/";
/** Estimate used by the official CLI (not read from the contract). The contract has the final say. */
const CLI_UNBONDING_ESTIMATE = 7n;

export default function PositionsCard() {
  const { dataset } = useValidators();
  const wallet = useWallet();
  const [result, setResult] = useState<PositionsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [understood, setUnderstood] = useState(false);

  const live = dataset.source === "live";
  const nameOf = (address: string) => {
    const v = dataset.validators.find((x) => x.address.toLowerCase() === address.toLowerCase());
    return v ? displayName(v) : shortAddress(address);
  };

  const refresh = async () => {
    if (!wallet.address) return;
    setLoading(true);
    setError(null);
    try {
      const addresses = dataset.validators.map((v) => v.address);
      setResult(await readPositions(wallet.address, addresses));
    } catch (err) {
      setError(delegationErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const run = async (key: string, action: () => Promise<{ transactionHash: string }>) => {
    setBusyKey(key);
    setError(null);
    setTxHash(null);
    try {
      const out = await action();
      setTxHash(out.transactionHash);
      setUnderstood(false);
      await refresh();
    } catch (err) {
      setError(delegationErrorMessage(err));
    } finally {
      setBusyKey(null);
    }
  };

  const ready = wallet.address !== null && wallet.onBradbury && live;

  return (
    <section className="card" aria-labelledby="pos-title">
      <h2 id="pos-title">Your delegation</h2>
      <p className="small">
        See what this wallet has delegated, withdraw it, and claim it after the waiting period. Withdrawing is two steps: start
        the withdrawal, wait, then claim. Funds are not returned until you claim.
      </p>

      {!ready && (
        <div className="notice notice-warn" role="status">
          <p>Connect your wallet on Bradbury and load live Bradbury data to check your delegation.</p>
        </div>
      )}

      <button type="button" className="btn btn-secondary" onClick={() => void refresh()} disabled={!ready || loading || busyKey !== null}>
        {loading ? "Checking the network…" : "Check my delegation"}
      </button>

      {result && result.positions.length === 0 && result.failed === 0 && (
        <div className="empty-inline">
          <p>This wallet has no delegation and no pending withdrawal on the validators loaded.</p>
        </div>
      )}
      {result && result.failed > 0 && (
        <div className="notice notice-warn" role="status">
          <p>{result.failed} validator(s) could not be checked. Try again in a moment. Results below may be incomplete.</p>
        </div>
      )}

      {result &&
        result.positions.map((p) => (
          <div key={p.validator} className="scenario">
            <h3>{nameOf(p.validator)}</h3>
            <p className="mono small muted" title={p.validator}>
              {shortAddress(p.validator)}
            </p>
            <dl className="facts">
              <div>
                <dt>Delegated now</dt>
                <dd>{p.stakeGen}</dd>
              </div>
              {p.pending.map((w) => (
                <div key={String(w.epoch)}>
                  <dt>Withdrawal started in epoch {String(w.epoch)}</dt>
                  <dd>
                    {w.stakeGen}
                    <br />
                    <span className="small muted">
                      Estimated claimable from epoch {String(w.epoch + CLI_UNBONDING_ESTIMATE)} (current: {String(result.currentEpoch)}).
                      This is an estimate only; the contract decides.
                    </span>
                  </dd>
                </div>
              ))}
            </dl>

            {p.shares > 0n && (
              <>
                <label className="check">
                  <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} />
                  <span>
                    I understand this starts the withdrawal of everything delegated to this validator, that I must wait before I
                    can claim, and that I approve it in my wallet.
                  </span>
                </label>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!understood || busyKey !== null || !ready}
                  onClick={() =>
                    void run("exit:" + p.validator, () =>
                      exitAll({ validator: p.validator, shares: p.shares, account: wallet.address as string, chainId: wallet.chainId }),
                    )
                  }
                >
                  {busyKey === "exit:" + p.validator ? "Waiting for your wallet…" : "Withdraw all"}
                </button>
              </>
            )}

            {p.pending.length > 0 && (
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busyKey !== null || !ready}
                  onClick={() =>
                    void run("claim:" + p.validator, () =>
                      claimFunds({ validator: p.validator, account: wallet.address as string, chainId: wallet.chainId }),
                    )
                  }
                >
                  {busyKey === "claim:" + p.validator ? "Waiting for your wallet…" : "Claim funds"}
                </button>
                <p className="small muted">If the waiting period is not over, the contract will refuse and nothing is sent.</p>
              </>
            )}
          </div>
        ))}

      {error && (
        <div className="notice notice-danger" role="alert">
          <p>{error}</p>
        </div>
      )}
      {txHash && (
        <div className="notice notice-ok" role="status">
          <p>
            Transaction sent: {shortAddress(txHash)}.{" "}
            <a href={`${EXPLORER}tx/${txHash}`} target="_blank" rel="noopener noreferrer">
              View on the Bradbury explorer
            </a>
          </p>
        </div>
      )}
    </section>
  );
}
