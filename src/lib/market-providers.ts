import "server-only";

/**
 * Provider capability registry. Credentials never leave the server and are read
 * only from environment variables. The importer remains provider-neutral.
 */
export type ProviderCapability = {
  key: string;
  name: string;
  kind: "market" | "economic" | "hybrid";
  envKey: string;
  supportsHistorical: boolean;
  supportsLive: boolean;
  supportsM1: boolean;
  retentionRequiresApproval: boolean;
  notes: string;
};

export const PROVIDERS: ProviderCapability[] = [
  {
    key: "twelve-data",
    name: "Twelve Data",
    kind: "market",
    envKey: "TWELVE_DATA_API_KEY",
    supportsHistorical: true,
    supportsLive: true,
    supportsM1: true,
    retentionRequiresApproval: true,
    notes:
      "Requires a subscription and data entitlements compatible with internal display, storage and the intended market regions. Do not use Free Trial data for production.",
  },
  {
    key: "trading-economics",
    name: "Trading Economics",
    kind: "economic",
    envKey: "TRADING_ECONOMICS_API_KEY",
    supportsHistorical: true,
    supportsLive: true,
    supportsM1: false,
    retentionRequiresApproval: true,
    notes:
      "Requires a paid API subscription and written confirmation that the selected plan permits storage, internal display and historical replay/backtest use.",
  },
  {
    key: "manual-csv-market",
    name: "Import CSV validé",
    kind: "market",
    envKey: "",
    supportsHistorical: true,
    supportsLive: false,
    supportsM1: true,
    retentionRequiresApproval: false,
    notes: "The importing operator is responsible for ensuring the data licence allows storage and internal use.",
  },
  {
    key: "manual-economic",
    name: "Saisie / import économique validé",
    kind: "economic",
    envKey: "",
    supportsHistorical: true,
    supportsLive: false,
    supportsM1: false,
    retentionRequiresApproval: false,
    notes: "The importing operator is responsible for source provenance, timestamps and usage rights.",
  },
];

export function configuredProviders() {
  return PROVIDERS.map((provider) => ({
    ...provider,
    configured: provider.envKey ? Boolean(process.env[provider.envKey]) : true,
  }));
}

/**
 * A deliberately disabled-by-default provider fetcher. It is intentionally
 * never called without its server-only API key and an approved data source.
 */
export async function fetchTwelveDataM1(input: {
  symbol: string;
  start: Date;
  end: Date;
}) {
  const key = process.env.TWELVE_DATA_API_KEY;
  if (!key) throw new Error("TWELVE_DATA_API_KEY n'est pas configurée");
  const url = new URL("https://api.twelvedata.com/time_series");
  url.searchParams.set("symbol", input.symbol);
  url.searchParams.set("interval", "1min");
  url.searchParams.set("start_date", input.start.toISOString());
  url.searchParams.set("end_date", input.end.toISOString());
  url.searchParams.set("timezone", "UTC");
  url.searchParams.set("apikey", key);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Twelve Data error: ${res.status}`);
  return res.json() as Promise<unknown>;
}
