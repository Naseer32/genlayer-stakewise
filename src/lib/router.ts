import { useEffect, useState } from "react";

export type Route =
  | { name: "dashboard" }
  | { name: "validators" }
  | { name: "validator"; id: string }
  | { name: "simulator" }
  | { name: "learn" }
  | { name: "notfound" };

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, "") || "/";
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) return { name: "dashboard" };
  if (parts[0] === "validators" && parts.length === 1) return { name: "validators" };
  if (parts[0] === "validators" && parts.length === 2) {
    try {
      return { name: "validator", id: decodeURIComponent(parts[1]) };
    } catch {
      return { name: "notfound" };
    }
  }
  if (parts[0] === "simulator" && parts.length === 1) return { name: "simulator" };
  if (parts[0] === "learn" && parts.length === 1) return { name: "learn" };
  return { name: "notfound" };
}

export function validatorHref(id: string): string {
  return `#/validators/${encodeURIComponent(id)}`;
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parseRoute(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}
