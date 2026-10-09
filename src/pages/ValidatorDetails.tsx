import SourceBanner from "../components/SourceBanner";
import StatusPill from "../components/StatusPill";
import { formatGen, formatPercent, isRealAddress } from "../lib/format";
import { displayName } from "../services/validatorService";
import { useStrategy } from "../state/StrategyContext";
import { useValidators } from "../state/ValidatorsContext";

export default function ValidatorDetails({ id }: { id: string }) {
  const { dataset } = useValidators();
  const { state, dispatch } = useStrategy();
  const v = dataset.validators.find((x) => x.id === id);

  if (!v) {
    return (
      <div className="page">
        <div className="empty">
          <h1>Validator not found</h1>
          <p>It is not in the data that is currently loaded. The data source may have changed.</p>
          <a className="btn btn-primary" href="#/validators">
            Back to validators
          </a>
        </div>
      </div>
    );
  }

  const inSim = state.rows.some((r) => r.validatorId === v.id);

  return (
    <div className="page">
      <p>
        <a href="#/validators">← All validators</a>
      </p>
      <div className="title-row">
        <h1>{displayName(v)}</h1>
        <StatusPill status={v.status} />
      </div>
      <SourceBanner dataset={dataset} />

      <section className="card" aria-labelledby="d-title">
        <h2 id="d-title">Details</h2>
        <dl className="facts facts-wide">
          <div>
            <dt>Wallet address</dt>
            <dd className="mono wrap">{v.address}</dd>
          </div>
          <div>
            <dt>Name or identity</dt>
            <dd>{v.name ?? "Not available"}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{v.status === "unknown" ? "Not available" : v.status}</dd>
          </div>
          <div>
            <dt>Total stake</dt>
            <dd>{formatGen(v.totalStake)}</dd>
          </div>
          <div>
            <dt>Delegated stake</dt>
            <dd>{formatGen(v.delegatedStake)}</dd>
          </div>
          <div>
            <dt>Voting power</dt>
            <dd>{formatPercent(v.votingPower)}</dd>
          </div>
          <div>
            <dt>Uptime</dt>
            <dd>{formatPercent(v.uptime)}</dd>
          </div>
          <div>
            <dt>Performance history</dt>
            <dd>Not available in this app</dd>
          </div>
        </dl>
        {(v.status === "quarantined" || v.status === "banned") && (
          <div className="notice notice-warn">
            <p>
              This validator is {v.status} in the loaded data. Check its current state before relying on it in any real
              decision.
            </p>
          </div>
        )}
        <div className="btn-row">
          <button type="button" className="btn btn-primary" onClick={() => dispatch({ type: "add", validatorId: v.id })} disabled={inSim}>
            {inSim ? "Already in simulation" : "Add to simulation"}
          </button>
          {inSim && (
            <a className="btn btn-secondary" href="#/simulator">
              Open simulator
            </a>
          )}
        </div>
      </section>

      {isRealAddress(v.address) && (
        <section className="card" aria-labelledby="v-title">
          <h2 id="v-title">Check it yourself</h2>
          <p className="small">
            To confirm these details on the network, use the official GenLayer CLI (after selecting the right network):
          </p>
          <pre className="code">{`genlayer staking validator-info --validator ${v.address}`}</pre>
        </section>
      )}
    </div>
  );
}
