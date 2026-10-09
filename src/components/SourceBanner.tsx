import type { ValidatorDataset } from "../types/staking";
import { formatDateTime } from "../lib/format";
import DataBadge from "./DataBadge";

export default function SourceBanner({ dataset }: { dataset: ValidatorDataset }) {
  const tone = dataset.source === "demo" ? "notice notice-warn" : dataset.source === "unavailable" ? "notice notice-danger" : "notice";
  return (
    <div className={tone} role="status">
      <div className="notice-row">
        <DataBadge source={dataset.source} />
        <strong>{dataset.sourceLabel}</strong>
      </div>
      {dataset.source === "demo" && (
        <p>Demo data: these validators are fictional. Nothing here comes from a real network.</p>
      )}
      {dataset.note && dataset.source !== "demo" && <p>{dataset.note}</p>}
      <p className="muted small">Last updated: {formatDateTime(dataset.lastUpdated)}</p>
    </div>
  );
}
