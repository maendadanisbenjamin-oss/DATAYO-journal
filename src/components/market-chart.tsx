"use client";
import { useId, useMemo, useState } from "react";
import clsx from "clsx";
import type { Lang } from "@/lib/i18n";
import type { EconomicEvent, MarketCandle } from "@/lib/types";

const UP = "#34d399";
const DOWN = "#f87171";
const GOLD = "var(--color-gold)";
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
  onPriceSelect,
  selectedPrice,
  lang = "fr",
  chartLabel = "Market price chart",
  keyboardHint = "Use the up and down arrow keys to adjust the selected price.",
  closeEventLabel = "Close event details",
  emptyLabel = "Import validated M1 data to display the chart.",
}: {
  candles: MarketCandle[];
  events?: EconomicEvent[];
  onPriceSelect?: (price: number) => void;
  selectedPrice?: number | null;
  lang?: Lang;
  chartLabel?: string;
  keyboardHint?: string;
  closeEventLabel?: string;
  emptyLabel?: string;
}) {
  const [selectedEvent, setSelectedEvent] = useState<EconomicEvent | null>(null);
  const hintId = useId();
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
    return <div className="flex h-[380px] items-center justify-center rounded-2xl border border-dashed border-line px-4 text-center text-[13px] text-mut">{emptyLabel}</div>;
  }

  const candleWidth = Math.max(1.4, (iw / model.visible.length) * 0.62);
  const labels = Array.from({ length: Math.min(6, model.visible.length) }, (_, i) => Math.round((i / Math.max(1, Math.min(6, model.visible.length) - 1)) * (model.visible.length - 1)));
  const eventX = (event: EconomicEvent) => {
    const ratio = (new Date(event.scheduledAt).getTime() - model.from) / Math.max(1, model.to - model.from);
    return ML + Math.max(0, Math.min(1, ratio)) * iw;
  };

  return (
    <div className="relative min-w-0 overflow-x-auto rounded-2xl border border-line bg-panel/30 p-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={clsx("block h-auto w-full min-w-[720px]", onPriceSelect && "cursor-crosshair")}
        style={{ height: "auto", aspectRatio: `${W} / ${H}` }}
        role="group"
        aria-label={chartLabel}
        aria-describedby={onPriceSelect ? hintId : undefined}
        aria-keyshortcuts={onPriceSelect ? "ArrowUp ArrowDown" : undefined}
        tabIndex={onPriceSelect ? 0 : undefined}
        onClick={(event) => {
          if (!onPriceSelect) return;
          const svg = event.currentTarget;
          const matrix = svg.getScreenCTM();
          if (!matrix) return;
          const point = svg.createSVGPoint();
          point.x = event.clientX;
          point.y = event.clientY;
          const { x, y } = point.matrixTransform(matrix.inverse());
          if (x < ML || x > W - MR || y < MT || y > MT + ih) return;
          const ratio = (MT + ih - y) / ih;
          onPriceSelect(Number((model.y.lo + ratio * (model.y.hi - model.y.lo)).toPrecision(8)));
        }}
        onKeyDown={(event) => {
          if (!onPriceSelect || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
          event.preventDefault();
          const step = Math.abs(model.y.result[1]! - model.y.result[0]!) || (model.y.hi - model.y.lo) / 100;
          const current = selectedPrice ?? model.visible.at(-1)!.close;
          const next = current + (event.key === "ArrowUp" ? step : -step);
          onPriceSelect(Number(Math.max(model.y.lo, Math.min(model.y.hi, next)).toPrecision(8)));
        }}
      >
        <defs>
          <linearGradient id="chart-background" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={GOLD} stopOpacity="0.08" />
            <stop offset="1" stopColor={GOLD} stopOpacity="0" />
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
              {date.toLocaleString(lang === "fr" ? "fr-FR" : "en-GB", { timeZone: "UTC", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })}
            </text>
          );
        })}
        <line x1={ML} y1={MT} x2={ML} y2={MT + ih} stroke="var(--color-line)" />
        <line x1={ML} y1={MT + ih} x2={W - MR} y2={MT + ih} stroke="var(--color-line)" />
        <text x={ML + iw / 2} y={H - 6} textAnchor="middle" fontSize="10" fontWeight="600" letterSpacing="1.4" fill="var(--color-mut)">{lang === "fr" ? "TEMPS (UTC)" : "TIME (UTC)"}</text>
        <text transform={`translate(14 ${MT + ih / 2}) rotate(-90)`} textAnchor="middle" fontSize="10" fontWeight="600" letterSpacing="1.4" fill="var(--color-mut)">{lang === "fr" ? "PRIX" : "PRICE"}</text>

        {/* Economic event markers */}
        {model.eventItems.map((event) => {
          const x = eventX(event);
          const color = event.importance === "high" ? DOWN : event.importance === "medium" ? GOLD : "#7aa2f7";
          return (
            <g
              key={event.id}
              className="cursor-pointer outline-none focus-visible:opacity-70"
              role="button"
              tabIndex={0}
              aria-label={`${event.currency || "NEWS"}: ${event.title}`}
              aria-expanded={selectedEvent?.id === event.id}
              onClick={(interaction) => { interaction.stopPropagation(); setSelectedEvent(event); }}
              onKeyDown={(interaction) => {
                if (interaction.key === "Enter" || interaction.key === " ") {
                  interaction.preventDefault();
                  interaction.stopPropagation();
                  setSelectedEvent(event);
                }
              }}
            >
              <line x1={x} y1={MT} x2={x} y2={MT + ih} stroke={color} strokeWidth="1.2" strokeDasharray="4 3" opacity="0.85" />
              <circle cx={x} cy={MT + 8} r="5" fill={color} />
              <text x={x} y={MT + 23} textAnchor="middle" fontSize="9" fontWeight="700" fill={color}>{event.currency || "NEWS"}</text>
            </g>
          );
        })}

        {selectedPrice != null && Number.isFinite(selectedPrice) && selectedPrice >= model.y.lo && selectedPrice <= model.y.hi && (
          <g aria-hidden="true">
            <line x1={ML} y1={model.sy(selectedPrice)} x2={W - MR} y2={model.sy(selectedPrice)} stroke={GOLD} strokeWidth="1.5" strokeDasharray="5 3" />
            <rect x={W - MR - 78} y={model.sy(selectedPrice) - 13} width="76" height="20" rx="4" fill="var(--color-gold)" />
            <text x={W - MR - 40} y={model.sy(selectedPrice) + 1} textAnchor="middle" fontSize="10" fontFamily={FONT} fill="var(--color-bg)">{price(selectedPrice)}</text>
          </g>
        )}

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

      {onPriceSelect && <p id={hintId} className="sr-only">{keyboardHint}</p>}
      {onPriceSelect && selectedPrice != null && (
        <p className="sr-only" aria-live="polite">
          {lang === "fr" ? "Prix d’entrée sélectionné" : "Selected entry price"}: {selectedPrice.toLocaleString(lang === "fr" ? "fr-FR" : "en-US", { maximumFractionDigits: 6 })}
        </p>
      )}

      {selectedEvent && (
        <div role="status" aria-live="polite" className="absolute right-4 top-4 z-10 w-64 rounded-xl border border-gold/40 bg-panel p-3 shadow-2xl">
          <button type="button" aria-label={closeEventLabel} className="absolute right-2 top-1 flex h-11 w-11 items-center justify-center rounded-lg text-lg text-mut hover:bg-white/5 hover:text-white" onClick={() => setSelectedEvent(null)}>×</button>
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
