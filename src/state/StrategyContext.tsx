import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import type { AllocationMode, AllocationRow, SimulationResult } from "../types/staking";
import { computeSimulation, convertRaw, evenSplit, parseTotal } from "../services/simulation";

interface StrategyState {
  totalInput: string;
  mode: AllocationMode;
  rows: AllocationRow[];
}

type Action =
  | { type: "setTotal"; value: string }
  | { type: "setMode"; mode: AllocationMode }
  | { type: "add"; validatorId: string }
  | { type: "update"; validatorId: string; raw: string }
  | { type: "remove"; validatorId: string }
  | { type: "splitEvenly" }
  | { type: "reset" };

const initial: StrategyState = { totalInput: "", mode: "percent", rows: [] };

function reducer(state: StrategyState, action: Action): StrategyState {
  switch (action.type) {
    case "setTotal":
      return { ...state, totalInput: action.value };
    case "setMode": {
      if (action.mode === state.mode) return state;
      const total = parseTotal(state.totalInput).value;
      return {
        ...state,
        mode: action.mode,
        rows: state.rows.map((r) => ({ ...r, raw: convertRaw(r.raw, state.mode, action.mode, total) })),
      };
    }
    case "add":
      if (state.rows.some((r) => r.validatorId === action.validatorId)) return state;
      return { ...state, rows: [...state.rows, { validatorId: action.validatorId, raw: "" }] };
    case "update":
      return {
        ...state,
        rows: state.rows.map((r) => (r.validatorId === action.validatorId ? { ...r, raw: action.raw } : r)),
      };
    case "remove":
      return { ...state, rows: state.rows.filter((r) => r.validatorId !== action.validatorId) };
    case "splitEvenly": {
      const total = parseTotal(state.totalInput).value;
      const values = evenSplit(state.rows.length, total, state.mode);
      return { ...state, rows: state.rows.map((r, i) => ({ ...r, raw: values[i] ?? "" })) };
    }
    case "reset":
      return initial;
    default:
      return state;
  }
}

interface StrategyContextValue {
  state: StrategyState;
  result: SimulationResult;
  dispatch: Dispatch<Action>;
}

const Ctx = createContext<StrategyContextValue | null>(null);

export function StrategyProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const result = useMemo(
    () => computeSimulation(state.totalInput, state.mode, state.rows),
    [state.totalInput, state.mode, state.rows],
  );
  const value = useMemo(() => ({ state, result, dispatch }), [state, result]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStrategy(): StrategyContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStrategy must be used inside StrategyProvider");
  return v;
}
