import type { ValidatorStatus } from "../types/staking";

const LABELS: Record<ValidatorStatus, string> = {
  active: "Active",
  quarantined: "Quarantined",
  banned: "Banned",
  unknown: "Status unknown",
};

export default function StatusPill({ status }: { status: ValidatorStatus }) {
  return <span className={`pill pill-${status}`}>{LABELS[status]}</span>;
}
