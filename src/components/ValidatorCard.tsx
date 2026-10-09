import type { Validator } from "../types/staking";
import { formatGen, formatPercent, shortAddress } from "../lib/format";
import { validatorHref } from "../lib/router";
import { displayName } from "../services/validatorService";
import StatusPill from "./StatusPill";

interface Props {
  validator: Validator;
  inSimulation: boolean;
  onAdd: (id: string) => void;
}

export default function ValidatorCard({ validator: v, inSimulation, onAdd }: Props) {
  return (
    <article className="vcard">
      <header className="vcard-head">
        <div>
          <h3>
            <a href={validatorHref(v.id)}>{displayName(v)}</a>
          </h3>
          <p className="mono small muted" title={v.address}>
            {shortAddress(v.address)}
          </p>
        </div>
        <StatusPill status={v.status} />
      </header>
      <dl className="vcard-facts">
        <div>
          <dt>Total stake</dt>
          <dd>{formatGen(v.totalStake)}</dd>
        </div>
        <div>
          <dt>Delegated</dt>
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
      </dl>
      <div className="vcard-actions">
        <a className="btn btn-secondary" href={validatorHref(v.id)}>
          Details
        </a>
        <button type="button" className="btn btn-primary" onClick={() => onAdd(v.id)} disabled={inSimulation}>
          {inSimulation ? "In simulation" : "Add to simulation"}
        </button>
      </div>
    </article>
  );
}
