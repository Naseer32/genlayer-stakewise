import { useMemo, useState } from "react";
import AllocationChart, { PALETTE, UNALLOCATED_COLOR, type ChartSegment } from "../components/AllocationChart";
import DataBadge from "../components/DataBadge";
import StatusPill from "../components/StatusPill";
import { formatGen, formatNumber, formatPercent, shortAddress } from "../lib/format";
import { validatorHref } from "../lib/router";
import { protocolParams } from "../services/networkConfig";
import { buildScenario, estimateRewards, evenSplit } from "../services/simulation";
import { displayName, suggestComparisonPool } from "../services/validatorService";
import { useStrategy } from "../state/StrategyContext";
import { useValidators } from "../state/ValidatorsContext";
import type { Scenario, Validator } from "../types/staking";
import { statusMessage } from "./strategyText";

export default function StrategySimulator() {
  const { dataset } = useValidators();
  const { state, result, dispatch } = useStrategy();
  const [pick, setPick] = useState("");

  const byId = useMemo(() => new Map(dataset.validators.map((v) => [v.id, v])), [dataset.validators]);
  const available = dataset.validators.filter((v) => !state.rows.some((r) => r.validatorId === v.id));
  const nameOf = (id: string) => {
    const v = byId.get(id);
    return v ? displayName(v) : shortAddress(id);
  };

  const hasTotal = result.total !== null;
  const percentMode = state.mode === "percent";

  /* ---- chart ---- */
  const segments: ChartSegment[] = [];
  result.rows.forEach((r, i) => {
    if (r.amount !== null && r.amount > 0) {
      segments.push({ label: nameOf(r.validatorId), value: r.amount, color: PALETTE[i % PALETTE.length] });
    }
  });
  if (hasTotal && result.remaining !== null && result.remaining > 0) {
    segments.push({ label: "Unallocated", value: result.remaining, color: UNALLOCATED_COLOR });
  }
  const chartDenominator = segments.reduce((a, s) => a + s.value, 0);

  /* ---- comparison scenarios ---- */
  const usingOwnPool = state.rows.length >= 2;
  const pool: Validator[] = usingOwnPool
    ? state.rows.map((r) => byId.get(r.validatorId)).filter((v): v is Validator => Boolean(v))
    : suggestComparisonPool(dataset.validators, 3);

  const scenarios: Scenario[] = [];
  if (result.total !== null && pool.length >= 2) {
    scenarios.push(
      buildScenario("one", "Concentrated", "Everything in one validator.", result.total, [
        { validatorId: pool[0].id, percent: 100 },
      ]),
    );
    const even = evenSplit(pool.length, 100, "percent").map(Number);
    scenarios.push(
      buildScenario("even", "Even split", `Split equally across ${pool.length} validators.`, result.total, pool.map((v, i) => ({ validatorId: v.id, percent: even[i] }))),
    );
  }
  const customReady = result.total !== null && result.rows.some((r) => r.amount !== null);
  if (customReady && result.total !== null) {
    scenarios.push(
      buildScenario(
        "custom",
        "Your custom split",
        "The percentages you entered above.",
        result.total,
        result.rows.filter((r) => r.amount !== null).map((r) => ({ validatorId: r.validatorId, percent: ((r.amount ?? 0) / (result.total as number)) * 100 })),
      ),
    );
  }

  const rewards = estimateRewards(protocolParams, result.allocated);

  const addPicked = () => {
    if (!pick) return;
    dispatch({ type: "add", validatorId: pick });
    setPick("");
  };

  return (
    <div className="page">
      <h1>Strategy simulator</h1>
      <p className="lead">
        Try different ways to spread a hypothetical amount of GEN. This is a what-if tool: no real GEN, wallet or
        delegation is involved.
      </p>

      {dataset.source !== "unavailable" && (
        <p className="small">
          Validators come from: <DataBadge source={dataset.source} /> {dataset.sourceLabel}
        </p>
      )}
      {dataset.source === "demo" && (
        <div className="notice notice-warn">
          <p>Demo data: the validators below are fictional, so the results only illustrate how the tool works.</p>
        </div>
      )}

      <section className="card" aria-labelledby="s1">
        <h2 id="s1">1. Hypothetical amount</h2>
        <div className="field">
          <label htmlFor="total">Amount of GEN to simulate</label>
          <input
            id="total"
            inputMode="decimal"
            autoComplete="off"
            value={state.totalInput}
            onChange={(e) => dispatch({ type: "setTotal", value: e.target.value })}
            placeholder="e.g. 1000"
            aria-invalid={result.totalError !== null && state.totalInput.trim() !== ""}
            aria-describedby="total-msg"
          />
          <p id="total-msg" className={state.totalInput.trim() !== "" && result.totalError ? "field-error" : "hint"}>
            {result.totalError ?? `Simulating ${formatGen(result.total ?? undefined)}.`}
          </p>
        </div>
        <fieldset className="segmented">
          <legend>Enter allocations as</legend>
          <label>
            <input type="radio" name="mode" checked={percentMode} onChange={() => dispatch({ type: "setMode", mode: "percent" })} />
            <span>Percent</span>
          </label>
          <label>
            <input type="radio" name="mode" checked={!percentMode} onChange={() => dispatch({ type: "setMode", mode: "amount" })} />
            <span>GEN amount</span>
          </label>
        </fieldset>
      </section>

      <section className="card" aria-labelledby="s2">
        <h2 id="s2">2. Validators and allocations</h2>

        {dataset.validators.length === 0 ? (
          <div className="empty-inline">
            <p>There are no validators to choose from yet.</p>
            <a className="btn btn-secondary" href="#/validators">
              Load validator data
            </a>
          </div>
        ) : (
          <div className="add-row">
            <div className="field grow">
              <label htmlFor="pick">Add a validator</label>
              <select id="pick" value={pick} onChange={(e) => setPick(e.target.value)} disabled={available.length === 0}>
                <option value="">{available.length === 0 ? "All validators added" : "Choose a validator…"}</option>
                {available.map((v) => (
                  <option key={v.id} value={v.id}>
                    {displayName(v)} ({shortAddress(v.address)})
                  </option>
                ))}
              </select>
            </div>
            <button type="button" className="btn btn-primary" onClick={addPicked} disabled={!pick}>
              Add
            </button>
          </div>
        )}

        {state.rows.length === 0 ? (
          <p className="muted">No allocations yet. Add at least one validator.</p>
        ) : (
          <ul className="alloc-list">
            {state.rows.map((row, i) => {
              const computed = result.rows[i];
              const v = byId.get(row.validatorId);
              const inputId = `alloc-${i}`;
              const errId = `alloc-msg-${i}`;
              const belowMin =
                protocolParams.minDelegationGen !== undefined &&
                computed.amount !== null &&
                computed.amount < protocolParams.minDelegationGen;
              return (
                <li key={row.validatorId} className="alloc-row">
                  <div className="alloc-head">
                    <span className="swatch" style={{ background: PALETTE[i % PALETTE.length] }} aria-hidden="true" />
                    <div className="alloc-name">
                      {v ? <a href={validatorHref(v.id)}>{displayName(v)}</a> : <span>{shortAddress(row.validatorId)}</span>}
                      {v ? <StatusPill status={v.status} /> : <span className="pill pill-unknown">Not in loaded data</span>}
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => dispatch({ type: "remove", validatorId: row.validatorId })}
                      aria-label={`Remove ${nameOf(row.validatorId)}`}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="alloc-input">
                    <label htmlFor={inputId}>{percentMode ? "Percent of total" : "Amount in GEN"}</label>
                    <input
                      id={inputId}
                      inputMode="decimal"
                      autoComplete="off"
                      value={row.raw}
                      onChange={(e) => dispatch({ type: "update", validatorId: row.validatorId, raw: e.target.value })}
                      aria-invalid={computed.error !== null}
                      aria-describedby={errId}
                      disabled={!hasTotal}
                    />
                    <span className="alloc-computed">
                      {computed.amount !== null && computed.percent !== null
                        ? percentMode
                          ? `= ${formatGen(computed.amount)}`
                          : `= ${formatPercent(computed.percent)}`
                        : ""}
                    </span>
                  </div>
                  <p id={errId} className={computed.error ? "field-error" : "hint"}>
                    {computed.error ?? (!hasTotal ? "Enter the hypothetical amount first." : "")}
                  </p>
                  {v && (v.status === "quarantined" || v.status === "banned") && (
                    <p className="warn-text small">This validator is {v.status} in the loaded data.</p>
                  )}
                  {belowMin && (
                    <p className="warn-text small">
                      Below the minimum delegation you configured ({formatGen(protocolParams.minDelegationGen)}).
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="btn-row">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => dispatch({ type: "splitEvenly" })}
            disabled={state.rows.length < 2 || (!percentMode && !hasTotal)}
          >
            Split evenly
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => dispatch({ type: "reset" })}>
            Reset simulation
          </button>
        </div>
      </section>

      <section className="card" aria-labelledby="s3">
        <h2 id="s3">3. Result</h2>
        <div className={`notice ${result.status === "complete" ? "notice-ok" : result.status === "over" || result.status === "incomplete" ? "notice-danger" : "notice-warn"}`} role="status">
          <p>{statusMessage(result)}</p>
        </div>
        <div className="result-grid">
          <div className="chart-box">
            <AllocationChart
              segments={segments}
              size={200}
              centerTitle={hasTotal ? `${result.allocatedPercent}%` : "—"}
              centerSubtitle="allocated"
              ariaLabel={
                hasTotal
                  ? `Donut chart. ${result.allocatedPercent} percent of ${result.total} GEN is allocated.`
                  : "Donut chart with no data yet"
              }
            />
          </div>
          <div>
            <dl className="facts">
              <div>
                <dt>Hypothetical total</dt>
                <dd>{formatGen(result.total ?? undefined)}</dd>
              </div>
              <div>
                <dt>Allocated</dt>
                <dd>
                  {formatGen(result.allocated)} ({formatPercent(result.allocatedPercent)})
                </dd>
              </div>
              <div>
                <dt>{result.status === "over" ? "Over-allocated by" : "Remaining unallocated"}</dt>
                <dd>{formatGen(result.remaining === null ? undefined : Math.abs(result.remaining))}</dd>
              </div>
            </dl>
            {segments.length > 0 && (
              <ul className="legend">
                {segments.map((s) => (
                  <li key={s.label}>
                    <span className="swatch" style={{ background: s.color }} aria-hidden="true" />
                    <span className="legend-name">{s.label}</span>
                    <span className="legend-val">
                      {formatPercent(chartDenominator > 0 ? Math.round((s.value / chartDenominator) * 10000) / 100 : 0)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {result.status === "over" && (
              <p className="small muted">The chart shows relative shares because the allocations add up to more than the total.</p>
            )}
          </div>
        </div>
      </section>

      <section className="card" aria-labelledby="s4">
        <h2 id="s4">Compare approaches</h2>
        {scenarios.length === 0 ? (
          <p className="muted">
            Enter a valid amount and have at least two validators available to see concentrated, even and custom splits side
            by side.
          </p>
        ) : (
          <>
            <p className="small">
              {usingOwnPool
                ? "Using the validators in your allocation."
                : "Using example validators from the loaded data (highest stake first, excluding quarantined and banned)."}
            </p>
            <div className="scenarios">
              {scenarios.map((s) => (
                <article key={s.key} className="scenario">
                  <h3>{s.label}</h3>
                  <p className="small muted">{s.description}</p>
                  <ul className="mini-bars">
                    {s.shares.map((sh) => (
                      <li key={sh.validatorId}>
                        <span className="mini-label">{nameOf(sh.validatorId)}</span>
                        <span className="mini-track" aria-hidden="true">
                          <span className="mini-fill" style={{ width: `${Math.min(100, sh.percent)}%` }} />
                        </span>
                        <span className="mini-val">
                          {formatPercent(sh.percent)} · {formatGen(sh.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <dl className="facts">
                    <div>
                      <dt>Largest single share</dt>
                      <dd>{formatPercent(s.largestSharePercent)}</dd>
                    </div>
                    <div>
                      <dt>Spread (equal-weight equivalent)</dt>
                      <dd>{formatNumber(s.effectiveCount)} {s.effectiveCount === 1 ? "validator" : "validators"}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </>
        )}
        <div className="notice">
          <p>
            Spreading GEN across several validators can reduce concentration risk, because one validator's problem affects a
            smaller share. It does not remove validator penalties, and it does not guarantee higher rewards.
          </p>
        </div>
      </section>

      <section className="card" aria-labelledby="s5">
        <h2 id="s5">Rewards</h2>
        {rewards.available ? (
          <>
            <dl className="facts">
              <div>
                <dt>Yearly gross, before commission (configured rate)</dt>
                <dd>{formatGen(rewards.annualGross)}</dd>
              </div>
              <div>
                <dt>Yearly after commission (configured)</dt>
                <dd>{formatGen(rewards.annualNet)}</dd>
              </div>
            </dl>
            <p className="small muted">
              Based only on the parameters you configured and marked as verified. It is an illustration, not a prediction or a
              promise.
            </p>
          </>
        ) : (
          <>
            <p>No reward estimate is shown, because it would require information this app does not have:</p>
            <ul className="plain-list">
              {rewards.missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
            <p className="small muted">
              Check the current values with the official GenLayer CLI (for example <code>genlayer staking epoch-info</code>)
              and the documentation.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
