import AllocationChart, { PALETTE, UNALLOCATED_COLOR } from "../components/AllocationChart";
import NetworkStatus from "../components/NetworkStatus";
import SourceBanner from "../components/SourceBanner";
import { formatGen, formatNumber } from "../lib/format";
import { countByStatus } from "../services/validatorService";
import { useStrategy } from "../state/StrategyContext";
import { useValidators } from "../state/ValidatorsContext";
import { statusMessage } from "./strategyText";

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

export default function Dashboard() {
  const { dataset, loading, error } = useValidators();
  const { state, result } = useStrategy();
  const counts = countByStatus(dataset.validators);
  const statusCount = (n: number) => (counts.statusSupported ? formatNumber(n) : "Not provided");
  const stakeValues = dataset.validators.map((v) => v.totalStake).filter((n): n is number => n !== undefined);
  const delegatedValues = dataset.validators.map((v) => v.delegatedStake).filter((n): n is number => n !== undefined);
  const sumOf = (list: number[]) => list.reduce((x, y) => x + y, 0);
  const sourceTag = dataset.source === "live" ? " (live)" : dataset.source === "demo" ? " (demo)" : "";
  const stakeMissing = counts.total - stakeValues.length;

  const segments = result.rows
    .map((r, i) => ({ label: r.validatorId, value: r.amount ?? 0, color: PALETTE[i % PALETTE.length] }))
    .filter((s) => s.value > 0);
  if (result.total !== null && result.remaining !== null && result.remaining > 0) {
    segments.push({ label: "Unallocated", value: result.remaining, color: UNALLOCATED_COLOR });
  }

  return (
    <div className="page">
      <h1>Dashboard</h1>
      <p className="lead">
        Explore GenLayer validators and test how you might spread a hypothetical amount of GEN. The simulator is hypothetical. Real delegation is a separate page and works on Bradbury testnet only.
      </p>

      <div className="grid">
        <NetworkStatus />

        <section className="card" aria-labelledby="val-title">
          <div className="card-head">
            <h2 id="val-title">Validator data</h2>
          </div>
          {loading && <p role="status">Loading validators…</p>}
          {error && (
            <div className="notice notice-danger" role="alert">
              <p>{error}</p>
            </div>
          )}
          <SourceBanner dataset={dataset} />
          {dataset.validators.length === 0 ? (
            <div className="empty-inline">
              <p>No validators are loaded.</p>
              <a className="btn btn-secondary" href="#/validators">
                Import data or use demo data
              </a>
            </div>
          ) : (
            <div className="stats">
              <Stat value={formatNumber(counts.total)} label={dataset.source === "demo" ? "Validators (demo)" : "Validators loaded"} />
              <Stat value={statusCount(counts.active)} label="Active" />
              <Stat value={statusCount(counts.quarantined)} label="Quarantined" />
              <Stat value={statusCount(counts.banned)} label="Banned" />
              <Stat value={stakeValues.length > 0 ? formatGen(sumOf(stakeValues)) : "Not provided"} label={"Total stake" + sourceTag} />
              <Stat value={delegatedValues.length > 0 ? formatGen(sumOf(delegatedValues)) : "Not provided"} label={"Delegated stake" + sourceTag} />
            </div>
          )}
          {dataset.validators.length > 0 && stakeValues.length > 0 && (
            <p className="muted small">
              Stake totals cover all loaded validators, including quarantined and banned ones.
              {stakeMissing > 0 && " " + stakeValues.length + " of " + counts.total + " validators report stake."}
            </p>
          )}
          {dataset.validators.length > 0 && !counts.statusSupported && (
            <p className="muted small">This data source does not include validator status.</p>
          )}
        </section>

        <section className="card" aria-labelledby="strat-title">
          <div className="card-head">
            <h2 id="strat-title">Your simulated strategy</h2>
          </div>
          {state.rows.length === 0 ? (
            <div className="empty-inline">
              <p>You have not added any allocations yet.</p>
              <a className="btn btn-primary" href="#/simulator">
                Open the simulator
              </a>
            </div>
          ) : (
            <div className="strategy-summary">
              <AllocationChart
                segments={segments}
                size={132}
                centerTitle={result.total !== null ? `${result.allocatedPercent}%` : "—"}
                centerSubtitle="allocated"
                ariaLabel={`Simulated allocation: ${result.allocatedPercent} percent of the hypothetical amount is allocated`}
              />
              <dl className="facts">
                <div>
                  <dt>Hypothetical total</dt>
                  <dd>{formatGen(result.total ?? undefined)}</dd>
                </div>
                <div>
                  <dt>Allocated</dt>
                  <dd>{formatGen(result.allocated)}</dd>
                </div>
                <div>
                  <dt>Unallocated</dt>
                  <dd>{formatGen(result.remaining ?? undefined)}</dd>
                </div>
                <div>
                  <dt>Validators</dt>
                  <dd>{state.rows.length}</dd>
                </div>
              </dl>
            </div>
          )}
          {state.rows.length > 0 && <p className="small">{statusMessage(result)}</p>}
          {state.rows.length > 0 && (
            <a className="btn btn-secondary" href="#/simulator">
              Edit in simulator
            </a>
          )}
        </section>
      </div>
    </div>
  );
}
