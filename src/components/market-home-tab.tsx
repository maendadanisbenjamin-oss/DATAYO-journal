"use client";

import { useEffect, useState } from "react";
import { BarChart3, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import type { Dict, Lang } from "@/lib/i18n";
import type { EconomicEvent, Instrument, MarketCandle, TradeInput } from "@/lib/types";
import MarketChart from "./market-chart";

const frames = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"] as const;

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Erreur de chargement");
  return body as T;
}

export default function MarketHomeTab({
  d,
  lang,
  onCreateJournalTrade,
}: {
  d: Dict;
  lang: Lang;
  onCreateJournalTrade: (preset: Partial<TradeInput>) => void;
}) {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [instrumentId, setInstrumentId] = useState("");
  const [timeframe, setTimeframe] = useState<(typeof frames)[number]>("15m");
  const [candles, setCandles] = useState<MarketCandle[]>([]);
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null);
  const [direction, setDirection] = useState<"long" | "short">("long");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [loadingInstruments, setLoadingInstruments] = useState(true);
  const [loadingCandles, setLoadingCandles] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void fetchJson<Instrument[]>("/api/market/instruments")
        .then((rows) => {
          if (!active) return;
          setInstruments(rows);
          setInstrumentId((current) => current || rows[0]?.id || "");
        })
        .catch((cause: unknown) => {
          if (active) setError(cause instanceof Error ? cause.message : "Erreur marché");
        })
        .finally(() => {
          if (active) setLoadingInstruments(false);
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!instrumentId) {
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      setLoadingCandles(true);
      setError("");
      const query = new URLSearchParams({ instrumentId, timeframe, limit: "800" });
      void fetchJson<{ candles: MarketCandle[] }>(`/api/market/candles?${query}`)
        .then(async ({ candles: rows }) => {
          if (!active) return;
          setCandles(rows);
          setSelectedPrice(rows.at(-1)?.close ?? null);
          if (!rows.length) {
            setEvents([]);
            return;
          }
          const eventQuery = new URLSearchParams({
            from: rows[0].ts,
            to: rows.at(-1)!.ts,
            limit: "300",
          });
          const eventData = await fetchJson<{ events: EconomicEvent[] }>(`/api/economic-events?${eventQuery}`);
          if (active) setEvents(eventData.events);
        })
        .catch((cause: unknown) => {
          if (active) setError(cause instanceof Error ? cause.message : "Erreur de chargement du marché");
        })
        .finally(() => {
          if (active) setLoadingCandles(false);
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [instrumentId, timeframe, reloadKey]);

  const instrument = instruments.find((item) => item.id === instrumentId);
  const currentPrice = candles.at(-1)?.close ?? null;
  const updatedAt = candles.at(-1)?.ts;
  const canPrepareTrade = Boolean(instrument && selectedPrice && selectedPrice > 0);

  const prepareJournalTrade = () => {
    if (!instrument || !selectedPrice) return;
    onCreateJournalTrade({
      symbol: instrument.symbol,
      direction,
      entryPrice: selectedPrice,
      stopLoss: stopLoss ? Number(stopLoss) : null,
      takeProfit: takeProfit ? Number(takeProfit) : null,
      date: new Date().toISOString().slice(0, 10),
      openedAt: new Date().toISOString(),
      tradeOutcome: "En cours",
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="yj-label">DATAYO · MARKET</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-white">{d.market}</h2>
          <p className="mt-1 text-sm text-mut">Cours M1 stockés en UTC, agrégés à la période choisie.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="market-instrument">{d.selectInstrument}</label>
          <select
            id="market-instrument"
            className="yj-select min-w-48"
            value={instrumentId}
            disabled={loadingInstruments || instruments.length === 0}
            onChange={(event) => setInstrumentId(event.target.value)}
          >
            {instruments.map((item) => <option key={item.id} value={item.id}>{item.symbol} · {item.displayName}</option>)}
          </select>
          <label className="sr-only" htmlFor="market-timeframe">{d.timeframe}</label>
          <select id="market-timeframe" className="yj-select" value={timeframe} onChange={(event) => setTimeframe(event.target.value as (typeof frames)[number])}>
            {frames.map((frame) => <option key={frame} value={frame}>{frame}</option>)}
          </select>
          <button type="button" className="yj-btn yj-btn-ghost" onClick={() => setReloadKey((value) => value + 1)} disabled={loadingCandles}>
            <RefreshCw size={15} className={loadingCandles ? "animate-spin" : ""} />{d.refreshMarket}
          </button>
        </div>
      </div>

      {error && <div role="alert" className="yj-card border-down/30 p-3 text-sm text-down">{error}</div>}
      {loadingInstruments ? (
        <div className="yj-card flex h-64 items-center justify-center text-sm text-mut">{d.marketLoading}</div>
      ) : instruments.length === 0 ? (
        <div className="yj-card flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
          <BarChart3 size={28} className="text-gold" /><p className="max-w-lg text-sm text-mut">{d.noMarketInstruments}</p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <section className="yj-card min-w-0 p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white">{instrument?.symbol ?? "—"}</h3>
                <p className="text-xs text-mut">{instrument?.displayName} · {instrument?.assetClass}</p>
              </div>
              <div className="text-right">
                <p className="mono text-xl font-bold text-white">{currentPrice?.toLocaleString(lang === "fr" ? "fr-FR" : "en-US", { maximumFractionDigits: 6 }) ?? "—"}</p>
                <p className="text-[11px] text-mut">{updatedAt ? new Date(updatedAt).toLocaleString(lang === "fr" ? "fr-FR" : "en-GB", { timeZone: "UTC", dateStyle: "short", timeStyle: "short" }) + " UTC" : "UTC"}</p>
              </div>
            </div>
            {loadingCandles && !candles.length ? <div className="flex h-[380px] items-center justify-center text-sm text-mut">{d.marketLoading}</div> : candles.length ? (
              <MarketChart candles={candles} events={events} onPriceSelect={setSelectedPrice} />
            ) : <div className="flex h-[380px] items-center justify-center rounded-2xl border border-dashed border-line px-6 text-center text-sm text-mut">{d.noMarketCandles}</div>}
            <p className="mt-2 text-[11px] text-mut">Un clic sur le graphique sélectionne un prix d’entrée. Les repères économiques restent visibles lorsqu’ils existent dans la période affichée.</p>
          </section>

          <aside className="yj-card h-fit space-y-4 p-5">
            <div>
              <p className="yj-label">{lang === "fr" ? "TICKET DE TRADE" : "TRADE TICKET"}</p>
              <p className="mt-1 text-xs text-mut">{d.journalTradeFromChart}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setDirection("long")} className={`yj-btn justify-center ${direction === "long" ? "yj-btn-primary" : "yj-btn-ghost"}`}><TrendingUp size={15} />{d.buy}</button>
              <button type="button" onClick={() => setDirection("short")} className={`yj-btn justify-center ${direction === "short" ? "yj-btn-primary" : "yj-btn-ghost"}`}><TrendingDown size={15} />{d.sell}</button>
            </div>
            <label className="block text-xs text-mut">{d.entry} · {lang === "fr" ? "cliquer sur le graphique pour choisir" : "click chart to select"}
              <input type="number" step="any" className="yj-input mono mt-1" value={selectedPrice ?? ""} onChange={(event) => setSelectedPrice(event.target.value ? Number(event.target.value) : null)} />
            </label>
            <label className="block text-xs text-mut">{d.stopLoss}<input type="number" step="any" className="yj-input mono mt-1" value={stopLoss} onChange={(event) => setStopLoss(event.target.value)} /></label>
            <label className="block text-xs text-mut">{d.takeProfit}<input type="number" step="any" className="yj-input mono mt-1" value={takeProfit} onChange={(event) => setTakeProfit(event.target.value)} /></label>
            <button type="button" className="yj-btn yj-btn-primary w-full" disabled={!canPrepareTrade} onClick={prepareJournalTrade}>{lang === "fr" ? "Continuer dans le journal" : "Continue in journal"}</button>
            <p className="rounded-xl border border-gold/20 bg-gold/[0.04] p-3 text-[11px] leading-relaxed text-mut">{d.brokerExecutionUnavailable}</p>
          </aside>
        </div>
      )}
    </div>
  );
}
