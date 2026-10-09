import { useState } from "react";
import type { ValidatorStatus } from "../types/staking";
import { useValidators } from "../state/ValidatorsContext";

export default function ImportPanel() {
  const { importText, loadDemo, clearImported, refresh, canRefresh, loading, dataset } = useValidators();
  const [text, setText] = useState("");
  const [status, setStatus] = useState<ValidatorStatus>("unknown");
  const [message, setMessage] = useState<{ ok: boolean; text: string; warnings: string[] } | null>(null);

  const submit = () => {
    const out = importText(text, status);
    setMessage({ ok: out.ok, text: out.message, warnings: out.warnings });
    if (out.ok) setText("");
  };

  return (
    <details className="card disclosure">
      <summary>Import or change validator data</summary>
      <div className="stack">
        <p className="small">
          Paste JSON or the output of GenLayer CLI commands such as <code>genlayer staking active-validators</code>. Anything
          you import is labelled "Imported" because this app cannot verify it. Stake values must be plain numbers in GEN.
        </p>
        <label htmlFor="import-text">Validator data</label>
        <textarea
          id="import-text"
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='[{"address":"0x…","name":"My validator","status":"active","totalStake":1000}]'
          spellCheck={false}
        />
        <label htmlFor="import-status">Status for plain address lists</label>
        <select id="import-status" value={status} onChange={(e) => setStatus(e.target.value as ValidatorStatus)}>
          <option value="unknown">Unknown</option>
          <option value="active">Active</option>
          <option value="quarantined">Quarantined</option>
          <option value="banned">Banned</option>
        </select>
        {message && (
          <div className={message.ok ? "notice" : "notice notice-danger"} role="status">
            <p>{message.text}</p>
            {message.warnings.map((w) => (
              <p key={w} className="small muted">
                {w}
              </p>
            ))}
          </div>
        )}
        <div className="btn-row">
          <button type="button" className="btn btn-primary" onClick={submit}>
            Import data
          </button>
          {canRefresh && (
            <button type="button" className="btn btn-secondary" onClick={() => void refresh()} disabled={loading}>
              {loading ? "Loading…" : "Reload snapshot"}
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={loadDemo} disabled={dataset.source === "demo"}>
            Use demo data
          </button>
          <button type="button" className="btn btn-ghost" onClick={clearImported}>
            Clear saved data
          </button>
        </div>
      </div>
    </details>
  );
}
