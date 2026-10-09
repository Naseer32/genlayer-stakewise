import type { DataSource } from "../types/staking";
import { SOURCE_LABELS } from "../services/validatorService";

const HINTS: Record<DataSource, string> = {
  live: "Read directly from the network",
  cached: "Saved earlier in this browser; may be out of date",
  imported: "Provided by you or a snapshot URL; not verified by this app",
  demo: "Fictional example data",
  unavailable: "No data could be loaded",
};

export default function DataBadge({ source }: { source: DataSource }) {
  return (
    <span className={`badge badge-${source}`} title={HINTS[source]}>
      {SOURCE_LABELS[source]}
    </span>
  );
}
