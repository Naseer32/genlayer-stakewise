import { useMemo, useState } from "react";
import ImportPanel from "../components/ImportPanel";
import LiveNetworkPanel from "../components/LiveNetworkPanel";
import SourceBanner from "../components/SourceBanner";
import StatusPill from "../components/StatusPill";
import ValidatorCard from "../components/ValidatorCard";
import { formatGen, formatPercent, shortAddress } from "../lib/format";
import { validatorHref } from "../lib/router";
import {
  displayName,
  filterValidators,
  type SortKey,
  type StatusFilter,
} from "../services/validatorService";
import { useStrategy } from "../state/StrategyContext";
import { useValidators } from "../state/ValidatorsContext";

export default function ValidatorExplorer() {
  const { dataset, loading, error } = useValidators();
  const { state, dispatch } = useStrategy();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("stake-desc");

  const list = useMemo(
    () => filterValidators(dataset.validators, query, status, sort),
    [dataset.validators, query, status, sort],
  );
  const inSim = (id: string) => state.rows.some((r) => r.validatorId === id);
  const add = (id: string) => dispatch({ type: "add", validatorId: id });
  const filtering = query.trim() !== "" || status !== "all";

  return (
    <div className="page">
      <h1>Validator explorer</h1>
      <p className="lead">Search validators and open one to see exactly which fields are available.</p>

      {loading && <p role="status">Loading validators…</p>}
      {error && (
        <div className="notice notice-danger" role="alert">
          <p>{error}</p>
        </div>
      )}
      <SourceBanner dataset={dataset} />
      <LiveNetworkPanel />
      <ImportPanel />

      <div className="filters" role="search">
        <div className="field grow">
          <label htmlFor="q">Search by name or address</label>
          <input
            id="q"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Alpha or 0x1234"
            autoComplete="off"
          />
        </div>
        <div className="field">
          <label htmlFor="status">Status</label>
          <select id="status" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="quarantined">Quarantined</option>
            <option value="banned">Banned</option>
            <option value="unknown">Status unknown</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="sort">Sort by</label>
          <select id="sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="stake-desc">Total stake, high to low</option>
            <option value="stake-asc">Total stake, low to high</option>
            <option value="power-desc">Voting power, high to low</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      <p className="muted small" aria-live="polite">
        Showing {list.length} of {dataset.validators.length} validators
      </p>

      {dataset.validators.length === 0 && (
        <div className="empty">
          <h2>No validators loaded</h2>
          <p>Import validator data above, or switch to the clearly labelled demo dataset to explore the app.</p>
        </div>
      )}

      {dataset.validators.length > 0 && list.length === 0 && (
        <div className="empty">
          <h2>No matching validators</h2>
          <p>{filtering ? "Try a different search or clear the status filter." : "Nothing to show."}</p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setQuery("");
              setStatus("all");
            }}
          >
            Clear filters
          </button>
        </div>
      )}

      {list.length > 0 && (
        <>
          <div className="table-wrap only-wide">
            <table>
              <caption className="sr-only">Validators</caption>
              <thead>
                <tr>
                  <th scope="col">Validator</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="num">Total stake</th>
                  <th scope="col" className="num">Delegated</th>
                  <th scope="col" className="num">Voting power</th>
                  <th scope="col" className="num">Uptime</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((v) => (
                  <tr key={v.id}>
                    <th scope="row">
                      <a href={validatorHref(v.id)}>{displayName(v)}</a>
                      <div className="mono small muted" title={v.address}>
                        {shortAddress(v.address)}
                      </div>
                    </th>
                    <td>
                      <StatusPill status={v.status} />
                    </td>
                    <td className="num">{formatGen(v.totalStake)}</td>
                    <td className="num">{formatGen(v.delegatedStake)}</td>
                    <td className="num">{formatPercent(v.votingPower)}</td>
                    <td className="num">{formatPercent(v.uptime)}</td>
                    <td className="actions">
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => add(v.id)} disabled={inSim(v.id)}>
                        {inSim(v.id) ? "In simulation" : "Add to simulation"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="cards only-narrow">
            {list.map((v) => (
              <ValidatorCard key={v.id} validator={v} inSimulation={inSim(v.id)} onAdd={add} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
