"use client";
import { useMemo, useState } from "react";
import clsx from "clsx";
import type { EconomicEvent, MarketCandle } from "@/lib/types";

const UP = "#34d399";
const DOWN = "#f87171";
const GOLD = "#d8b56d";
const FONT = "var(--font-num), monospace";

function ticks(min: number, max: number, count = 5) {
  const span = Math.max(0.000001, max - min);
  const raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const normalized = raw / mag;
  const step = (normalized < 1.5 ? 1 : normalized < 3 ? 2 : normalized < 7 ? 5 : 10) * mag;
  const start = Math.floor(min / step) * step;
  const result: number[] = [];
  for (let value = start; value <= max + step * 0.5; value += step) result.push(Number(value.toPrecision(12)));
  return { result, lo: result[0], hi: result[result.length - 1] };
}

const price = (value: number) => {
  if (value >= 1000) return value.toFixed(1);
  if (value >= 100) return value.toFixed(2);
  if (value >= 10) return value.toFixed(3);
  return value.toFixed(5);
};

export default function MarketChart({
  candles,
  events = [],
  height = 380,
}: {
  candles: MarketCandle[];
  events?: EconomicEvent[];
  height?: number;
}) {
  const [selectedEvent, setSelectedEvent] = useState<EconomicEvent | null>(null);
  const W = 1000;
  const H = 460;
  const ML = 64;
  const MR = 18;
  const MT = 26;
  const MB = 50;
  const iw = W - ML - MR;
  const ih = H - MT - MB;

  const model = useMemo(() => {
    const visible = candles.slice(-180);
    if (!visible.length) return null;
    const min = Math.min(...visible.map((c) => c.low));
    const max = Math.max(...visible.map((c) => c.high));
    const pad = (max - min || Math.abs(max) * 0.002 || 1) * 0.08;
    const y = ticks(min - pad, max + pad);
    const sy = (v: number) => MT + ih - ((v - y.lo) / (y.hi - y.lo || 1)) * ih;
    const sx = (index: number) => ML + (index + 0.5) * (iw / visible.length);
    const from = new Date(visible[0].ts).getTime();
    const to = new Date(visible[visible.length - 1].ts).getTime();
    const eventItems = events.filter((event) => {
      const t = new Date(event.scheduledAt).getTime();
      return t >= from && t <= to;
    });
    return { visible, y, sy, sx, from, to, eventItems };
  }, [candles, events, ih, iw]);

  if (!model) {
    return <div className="flex h-[380px] items-center justify-center rounded-2xl border border-dashed border-line text-[13px] text-mut">Importez des données M1 validées pour afficher le graphique.</div>;
  }

  const candleWidth = Math.max(1.4, (iw / model.visible.length) * 0.62);
  const labels = Array.from({ length: Math.min(6, model.visible.length) }, (_, i) => Math.round((i / Math.max(1, Math.min(6, model.visible.length) - 1)) * (model.visible.length - 1)));
  const eventX = (event: EconomicEvent) => {
    const ratio = (new Date(event.scheduledAt).getTime() - model.from) / Math.max(1, model.to - model.from);
    return ML + Math.max(0, Math.min(1, ratio)) * iw;
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-[#090711]/30 p-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} role="img" aria-label="Trading chart with price and time axes">
        <defs>
          <linearGradient id="chart-background" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="rgba(216,181,109,0.05)" />
            <stop offset="1" stopColor="rgba(0,0,0,0)" />
          </linearGradient>
        </defs>
        <rect x={ML} y={MT} width={iw} height={ih} fill="url(#chart-background)" />

        {/* Price axis */}
        {model.y.result.map((value) => (
          <g key={value}>
            <line x1={ML} y1={model.sy(value)} x2={W - MR} y2={model.sy(value)} stroke="var(--color-line)" strokeDasharray="3 4" />
            <text x={ML - 9} y={model.sy(value) + 4} textAnchor="end" fontSize="11" fontFamily={FONT} fill="var(--color-mut)">
              {price(value)}
            </text>
          </g>
        ))}

        {/* Time axis labels */}
        {labels.map((index) => {
          const candle = model.visible[index];
          const date = new Date(candle.ts);
          return (
            <text key={candle.ts} x={model.sx(index)} y={H - 27} textAnchor="middle" fontSize="10.5" fontFamily={FONT} fill="var(--color-mut)">
              {date.toLocaleString("en-GB", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })}
            </text>
          );
        })}
        <line x1={ML} y1={MT} x2={ML} y2={MT + ih} stroke="var(--color-line)" />
        <line x1={ML} y1={MT + ih} x2={W - MR} y2={MT + ih} stroke="var(--color-line)" />
        <text x={ML + iw / 2} y={H - 6} textAnchor="middle" fontSize="10" fontWeight="600" letterSpacing="1.4" fill="var(--color-mut)">TEMPS (UTC)</text>
        <text transform={`translate(14 ${MT + ih / 2}) rotate(-90)`} textAnchor="middle" fontSize="10" fontWeight="600" letterSpacing="1.4" fill="var(--color-mut)">PRIX</text>

        {/* Economic event markers */}
        {model.eventItems.map((event) => {
          const x = eventX(event);
          const color = event.importance === "high" ? DOWN : event.importance === "medium" ? GOLD : "#7aa2f7";
          return (
            <g key={event.id} className="cursor-pointer" onClick={() => setSelectedEvent(event)}>
              <line x1={x} y1={MT} x2={x} y2={MT + ih} stroke={color} strokeWidth="1.2" strokeDasharray="4 3" opacity="0.85" />
              <circle cx={x} cy={MT + 8} r="5" fill={color} />
              <text x={x} y={MT + 23} textAnchor="middle" fontSize="9" fontWeight="700" fill={color}>{event.currency || "NEWS"}</text>
            </g>
          );
        })}

        {/* Candles */}
        {model.visible.map((candle, index) => {
          const x = model.sx(index);
          const bullish = candle.close >= candle.open;
          const color = bullish ? UP : DOWN;
          const bodyY = Math.min(model.sy(candle.open), model.sy(candle.close));
          const bodyH = Math.max(1.3, Math.abs(model.sy(candle.open) - model.sy(candle.close)));
          return (
            <g key={candle.ts}>
              <line x1={x} y1={model.sy(candle.high)} x2={x} y2={model.sy(candle.low)} stroke={color} strokeWidth="1.1" />
              <rect x={x - candleWidth / 2} y={bodyY} width={candleWidth} height={bodyH} fill={color} rx="0.7">
                <title>{new Date(candle.ts).toISOString()}\nO {price(candle.open)} · H {price(candle.high)} · L {price(candle.low)} · C {price(candle.close)}</title>
              </rect>
            </g>
          );
        })}
      </svg>

      {selectedEvent && (
        <div className="absolute right-4 top-4 z-10 w-64 rounded-xl border border-gold/40 bg-panel/95 p-3 shadow-2xl backdrop-blur">
          <button className="absolute right-2 top-1 text-mut hover:text-white" onClick={() => setSelectedEvent(null)}>×</button>
          <p className="pr-4 text-[13px] font-bold text-white">{selectedEvent.title}</p>
          <p className="mt-1 text-[11px] text-gold">{selectedEvent.currency} · {selectedEvent.importance.toUpperCase()}</p>
          <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10.5px]">
            <span className="rounded bg-white/[0.04] p-1 text-mut">Prev.<b className="block text-white">{selectedEvent.previous ?? "—"}</b></span>
            <span className="rounded bg-white/[0.04] p-1 text-mut">Fcst.<b className="block text-white">{selectedEvent.forecast ?? "—"}</b></span>
            <span className="rounded bg-white/[0.04] p-1 text-mut">Act.<b className="block text-white">{selectedEvent.actual ?? "—"}</b></span>
          </div>
        </div>
      )}
    </div>
  );
}
