import type { SimulationResult } from "../types/staking";
import { formatGen } from "../lib/format";

export function statusMessage(r: SimulationResult): string {
  switch (r.status) {
    case "no-total":
      return "Enter a valid hypothetical amount to start.";
    case "empty":
      return "Add at least one validator to build an allocation.";
    case "incomplete":
      return "Incomplete: some allocations are empty or invalid. Fix the highlighted fields.";
    case "over":
      return `Over-allocated by ${formatGen(Math.abs(r.remaining ?? 0))}. Reduce one or more allocations.`;
    case "partial":
      return `Incomplete: ${formatGen(r.remaining ?? 0)} is still unallocated.`;
    case "complete":
      return "Complete: the full hypothetical amount is allocated.";
  }
}
