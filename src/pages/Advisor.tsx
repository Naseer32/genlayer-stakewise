import { useState } from "react";
import { shortAddress } from "../lib/format";
import { ADVISOR_ADDRESS, ADVISOR_EXPLORER_URL, lookupAdvisor, type AdvisorLookup } from "../services/advisor";
import { useValidators } from "../state/ValidatorsContext";
import { useWallet } from "../state/WalletContext";
import { displayName } from "../services/validatorService";

const RISK_CLASS: Record<string, string> = { LOW: "pill pill-active", MEDIUM: "pill pill-quarantined", HIGH: "pill pill-banned" };

const percent = (bps: number) => `${Math.floor(bps / 100)}.${String(bps % 100).padStart(2, "0")}%`;

export default function Advisor() {
  const { dataset } = useValidators();
  const wallet = useWallet();
  const [owner, setOwner] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AdvisorLookup | null>(null);

  const nameOf = (address: string) => {
    const v = dataset.validators.find((x) => x.address.toLowerCase() === address.toLowerCase());
    return v ? displayName(v) : shortAddress(address);
  };

  const run = async (who: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await lookupAdvisor(who.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read the contract.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h1>Advisor</h1>
      <p className="lead">
        Look up a staking plan and its risk analysis stored on the StakeWise Advisor Intelligent Contract on Bradbury. This page
        only reads: it needs no wallet and costs no gas.
      </p>

      <section className="card" aria-labelledby="adv-about">
        <h2 id="adv-about">About the contract</h2>
        <p className="small">
          The Advisor is non-custodial: it never receives or holds GEN. It stores a plan (validators and shares) for each wallet.
          The risk level is calculated by fixed rules. GenLayer validators reach consensus on an AI-written explanation, which the
          contract stores with the plan.
        </p>
        <dl className="facts">
          <div>
            <dt>Contract</dt>
            <dd className="mono wrap">{ADVISOR_ADDRESS}</dd>
          </div>
          <div>
            <dt>Network</dt>
            <dd>Bradbury testnet</dd>
          </div>
        </dl>
        <a className="btn btn-secondary" href={ADVISOR_EXPLORER_URL} target="_blank" rel="noopener noreferrer">
          View contract on the explorer
        </a>
      </section>

      <section className="card" aria-labelledby="adv-look">
        <h2 id="adv-look">Look up a wallet</h2>
        <div className="field">
          <label htmlFor="adv-owner">Wallet address</label>
          <input
            id="adv-owner"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            placeholder="0x…"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="btn-row">
          <button type="button" className="btn btn-primary" onClick={() => void run(owner)} disabled={loading || owner.trim() === ""}>
            {loading ? "Reading the contract…" : "Look up"}
          </button>
          {wallet.address && (
            <button
              type="button"
              className="btn btn-secondary"
              disabled={loading}
              onClick={() => {
                setOwner(wallet.address as string);
                void run(wallet.address as string);
              }}
            >
              Use my connected wallet
            </button>
          )}
        </div>

        {error && (
          <div className="notice notice-danger" role="alert">
            <p>{error}</p>
          </div>
        )}

        {result && !result.found && (
          <div className="empty-inline">
            <p>No plan is stored for this wallet. The contract holds {result.planCount} plan(s) in total.</p>
          </div>
        )}

        {result && result.found && (
          <div className="scenario">
            <h3>{result.plan.name}</h3>
            <ul className="mini-bars">
              {result.plan.allocations.map((a) => (
                <li key={a.validator}>
                  <span className="mini-label">{nameOf(a.validator)}</span>
                  <span className="mini-track" aria-hidden="true">
                    <span className="mini-fill" style={{ width: `${Math.min(100, a.bps / 100)}%` }} />
                  </span>
                  <span className="mini-val">{percent(a.bps)}</span>
                </li>
              ))}
            </ul>
            {result.analysis ? (
              <>
                <p>
                  Concentration risk: <span className={RISK_CLASS[result.analysis.risk] ?? "pill pill-unknown"}>{result.analysis.risk}</span>
                </p>
                <dl className="facts">
                  <div>
                    <dt>Largest single share</dt>
                    <dd>{percent(result.analysis.largest_bps)}</dd>
                  </div>
                  <div>
                    <dt>Equal-weight equivalent</dt>
                    <dd>{(result.analysis.effective_x100 / 100).toFixed(2)} validators</dd>
                  </div>
                </dl>
                <p>{result.analysis.summary}</p>
                <p className="small">
                  <strong>Suggestion:</strong> {result.analysis.suggestion}
                </p>
                <p className="small muted">Written by AI through GenLayer consensus. It is not financial advice.</p>
              </>
            ) : (
              <p className="small muted">This plan has no analysis stored yet.</p>
            )}
          </div>
        )}
      </section>

      <section className="card" aria-labelledby="adv-write">
        <h2 id="adv-write">Saving a plan</h2>
        <p className="small">
          Saving and analysing a plan sends transactions that change the contract. For now this is done with the GenLayer CLI, not
          from this page. Reading here works for any wallet.
        </p>
      </section>
    </div>
  );
}
