/**
 * Converts a GEN amount typed by the user into wei (bigint) with no floating point.
 * Returns null for anything that is not a plain decimal with at most 18 decimal places.
 * genlayer-js treats an unsuffixed string as WEI, so callers must always pass the bigint from here.
 */
export function genToWei(input: string): bigint | null {
  const t = input.trim().replace(/,/g, "");
  if (!/^(\d+\.?\d*|\.\d+)$/.test(t)) return null;
  const [whole, frac = ""] = t.split(".");
  if (frac.length > 18) return null;
  const digits = (whole === "" ? "0" : whole) + frac.padEnd(18, "0");
  return BigInt(digits);
}

export function weiToGenString(wei: bigint): string {
  const s = wei.toString().padStart(19, "0");
  const whole = s.slice(0, -18);
  const frac = s.slice(-18).replace(/0+$/, "");
  return frac === "" ? whole : `${whole}.${frac}`;
}
