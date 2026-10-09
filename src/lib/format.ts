const NUMBER = new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 });

export const NOT_AVAILABLE = "Not available";

export function formatGen(n: number | undefined | null): string {
  return n === undefined || n === null ? NOT_AVAILABLE : `${NUMBER.format(n)} GEN`;
}

export function formatNumber(n: number | undefined | null): string {
  return n === undefined || n === null ? NOT_AVAILABLE : NUMBER.format(n);
}

export function formatPercent(n: number | undefined | null): string {
  return n === undefined || n === null ? NOT_AVAILABLE : `${NUMBER.format(n)}%`;
}

export function shortAddress(address: string): string {
  return address.length > 14 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

export function formatDateTime(iso: string | undefined): string {
  if (!iso) return NOT_AVAILABLE;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? NOT_AVAILABLE : d.toLocaleString();
}

export function isRealAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
