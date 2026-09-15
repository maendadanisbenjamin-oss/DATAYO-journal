"use client";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { fmtMoney, fmtR } from "@/lib/stats";

const GOLD = "#d8b56d";
const UP = "#34d399";
const DOWN = "#f87171";
const AXIS = "var(--color-mut)";
const GRID = "var(--color-line)";
const FONT = "var(--font-num), monospace";

function niceTicks(min: number, max: number, count = 5) {
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const span = max - min;
  const raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 0.5; v += step) ticks.push(Number(v.toFixed(10)));
  return { ticks, lo: ticks[0], hi: ticks[ticks.length - 1] };
}

const fmtNum = (v: number) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(Math.abs(v) >= 10000 ? 0 : 1)}k` : v.toFixed(0));

export function EquityChart({
  data,
  xLabel = "Date",
  yLabel = "Capital ($)",
  currency = "$",
}: {
  data: { date: string; value: number }[];
  xLabel?: string;
  yLabel?: string;
  currency?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 760, H = 280, ML = 60, MR = 20, MT = 20, MB = 44;
  const iw = W - ML - MR, ih = H - MT - MB;

  const { pts, yT, xIdx, area, line, zeroY } = useMemo(() => {
    if (!data.length) return { pts: [], yT: { ticks: [0], lo: 0, hi: 1 }, xIdx: [] as number[], area: "", line: "", zeroY: 0 };
    const vals = data.map((p) => p.value);
    const minVal = Math.min(...vals);
    const maxVal = Math.max(...vals);
    const yT = niceTicks(minVal, maxVal, 5);
    const sy = (v: number) => MT + ih - ((v - yT.lo) / (yT.hi - yT.lo || 1)) * ih;
    const sx = (i: number) => ML + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw);
    const pts = data.map((p, i) => ({ x: sx(i), y: sy(p.value), ...p }));
    const line = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const zeroY = sy(data[0]?.value ?? 0);
    const area = `${line} L${pts[pts.length - 1].x},${MT + ih} L${pts[0].x},${MT + ih} Z`;

    const n = Math.min(6, data.length);
    const xIdx = Array.from({ length: n }, (_, k) => Math.round((k / Math.max(1, n - 1)) * (data.length - 1)));
    return { pts, yT, xIdx, area, line, zeroY };
  }, [data, ih, iw]);

  if (!data.length) return <Empty label="Aucun point sur la courbe" />;
  const sy = (v: number) => MT + ih - ((v - yT.lo) / (yT.hi - yT.lo || 1)) * ih;
  const last = pts[pts.length - 1];
  const first = pts[0];
  const isUp = last ? last.value >= (first?.value ?? 0) : true;
  const col = isUp ? UP : DOWN;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-[280px] w-full"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - r.left) / r.width) * W;
          let best = 0, bd = Infinity;
          pts.forEach((p, i) => {
            const d = Math.abs(p.x - x);
            if (d < bd) {
              bd = d;
              best = i;
            }
          });
          setHover(best);
        }}
      >
        <defs>
          <linearGradient id="eq-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={col} stopOpacity="0.3" />
            <stop offset="100%" stopColor={col} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines and Y-axis tick labels */}
        {yT.ticks.map((t) => (
          <g key={t}>
            <line x1={ML} x2={W - MR} y1={sy(t)} y2={sy(t)} stroke={GRID} strokeDasharray={t === 0 ? "" : "3 4"} />
            <text x={ML - 10} y={sy(t) + 3.5} textAnchor="end" fontSize="10.5" fill={AXIS} fontFamily={FONT}>
              {currency}{fmtNum(t)}
            </text>
          </g>
        ))}

        {/* X-axis tick labels */}
        {xIdx.map((i) => (
          <text key={i} x={pts[i].x} y={H - MB + 16} textAnchor="middle" fontSize="10" fill={AXIS} fontFamily={FONT}>
            {pts[i].date.slice(5)}
          </text>
        ))}

        {/* Main axes lines */}
        <line x1={ML} x2={ML} y1={MT} y2={MT + ih} stroke={GRID} strokeWidth="1" />
        <line x1={ML} x2={W - MR} y1={MT + ih} y2={MT + ih} stroke={GRID} strokeWidth="1" />

        {/* Axis Names / Legends */}
        <text x={ML + iw / 2} y={H - 6} textAnchor="middle" fontSize="10" fill={AXIS} fontWeight="600" letterSpacing="1.5">
          {xLabel.toUpperCase()}
        </text>
        <text transform={`translate(13 ${MT + ih / 2}) rotate(-90)`} textAnchor="middle" fontSize="10" fill={AXIS} fontWeight="600" letterSpacing="1.5">
          {yLabel.toUpperCase()}
        </text>

        {/* Filled Area and Curve Line */}
        <path d={area} fill="url(#eq-gradient)" />
        <path d={line} fill="none" stroke={col} strokeWidth="2.4" strokeLinejoin="round" />

        {/* Zero or starting balance reference line */}
        <line x1={ML} x2={W - MR} y1={zeroY} y2={zeroY} stroke={GOLD} strokeOpacity="0.4" strokeDasharray="2 3" />

        {/* Hover Crosshair & Point */}
        {hover !== null && (
          <g>
            <line x1={pts[hover].x} x2={pts[hover].x} y1={MT} y2={MT + ih} stroke={GOLD} strokeOpacity="0.7" strokeDasharray="3 3" />
            <line x1={ML} x2={W - MR} y1={pts[hover].y} y2={pts[hover].y} stroke={GOLD} strokeOpacity="0.3" strokeDasharray="3 3" />
            <circle cx={pts[hover].x} cy={pts[hover].y} r="5" fill={col} stroke="var(--color-panel)" strokeWidth="2.5" />
          </g>
        )}
      </svg>

      {hover !== null && (
        <div
          className="pointer-events-none absolute z-20 rounded-xl border border-line px-3 py-2 text-[12px] text-white shadow-2xl backdrop-blur-md"
          style={{
            left: `${Math.min(85, Math.max(15, (pts[hover].x / W) * 100))}%`,
            top: 8,
            transform: "translateX(-50%)",
            background: "var(--tooltip-bg)",
          }}
        >
          <span className="text-mut">{pts[hover].date}</span> ·{" "}
          <span className="mono font-bold text-white">
            {currency}{pts[hover].value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      )}
    </div>
  );
}

export function RBarChart({
  values,
  xLabel = "Numéro du Trade",
  yLabel = "Return R",
}: {
  values: number[];
  xLabel?: string;
  yLabel?: string;
}) {
  const W = 760, H = 240, ML = 52, MR = 16, MT = 16, MB = 42;
  const iw = W - ML - MR, ih = H - MT - MB;
  if (!values.length) return <Empty label="Aucun trade à afficher" />;

  const minV = Math.min(0, ...values);
  const maxV = Math.max(0, ...values);
  const yT = niceTicks(minV, maxV, 4);
  const sy = (v: number) => MT + ih - ((v - yT.lo) / (yT.hi - yT.lo || 1)) * ih;
  const bw = iw / values.length;
  const zero = sy(0);
  const step = Math.max(1, Math.ceil(values.length / 10));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[240px] w-full">
      {/* Y-axis grid and labels */}
      {yT.ticks.map((t) => (
        <g key={t}>
          <line x1={ML} x2={W - MR} y1={sy(t)} y2={sy(t)} stroke={GRID} strokeDasharray={t === 0 ? "" : "3 4"} />
          <text x={ML - 8} y={sy(t) + 3.5} textAnchor="end" fontSize="10.5" fill={AXIS} fontFamily={FONT}>
            {t > 0 ? `+${t}` : t}R
          </text>
        </g>
      ))}

      {/* Bars */}
      {values.map((v, i) => {
        const barH = Math.max(2, Math.abs(zero - sy(v)));
        const barY = v >= 0 ? sy(v) : zero;
        const col = v >= 0 ? UP : DOWN;
        return (
          <g key={i}>
            <rect
              x={ML + i * bw + bw * 0.12}
              width={Math.max(2, bw * 0.76)}
              y={barY}
              height={barH}
              rx="2"
              fill={col}
              opacity="0.88"
            >
              <title>
                Trade #{i + 1}: {v >= 0 ? `+${v.toFixed(2)}` : v.toFixed(2)}R
              </title>
            </rect>
            {(i % step === 0 || i === values.length - 1) && (
              <text x={ML + i * bw + bw / 2} y={H - MB + 16} textAnchor="middle" fontSize="10" fill={AXIS} fontFamily={FONT}>
                {i + 1}
              </text>
            )}
          </g>
        );
      })}

      {/* Axes and legends */}
      <line x1={ML} x2={ML} y1={MT} y2={MT + ih} stroke={GRID} />
      <line x1={ML} x2={W - MR} y1={zero} y2={zero} stroke={GOLD} strokeOpacity="0.4" />
      <text x={ML + iw / 2} y={H - 6} textAnchor="middle" fontSize="10" fill={AXIS} fontWeight="600" letterSpacing="1.5">
        {xLabel.toUpperCase()}
      </text>
      <text transform={`translate(13 ${MT + ih / 2}) rotate(-90)`} textAnchor="middle" fontSize="10" fill={AXIS} fontWeight="600" letterSpacing="1.5">
        {yLabel.toUpperCase()}
      </text>
    </svg>
  );
}

export function WinRateGauge({
  winRate,
  wins,
  losses,
}: {
  winRate: number;
  wins: number;
  losses: number;
}) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const fillLen = (winRate / 100) * c;

  return (
    <div className="flex flex-col items-center justify-center p-3">
      <div className="relative flex items-center justify-center">
        <svg viewBox="0 0 110 110" className="h-32 w-32">
          <circle cx="55" cy="55" r={r} fill="none" stroke="var(--color-line)" strokeWidth="12" />
          <circle
            cx="55"
            cy="55"
            r={r}
            fill="none"
            stroke={UP}
            strokeWidth="12"
            strokeDasharray={`${fillLen} ${c - fillLen}`}
            strokeDashoffset="0"
            strokeLinecap="round"
            transform="rotate(-90 55 55)"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="mono text-2xl font-extrabold text-white">{winRate.toFixed(1)}%</span>
          <span className="text-[10px] uppercase tracking-wider text-mut">Win Rate</span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-6 text-[12.5px]">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-up" />
          <span className="text-mut">Gains :</span>
          <span className="mono font-bold text-white">{wins}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-down" />
          <span className="text-mut">Pertes :</span>
          <span className="mono font-bold text-white">{losses}</span>
        </div>
      </div>
    </div>
  );
}

export function ProfitLossCard({
  gross,
  grossLoss,
  net,
  currency = "USD",
  lang = "fr",
}: {
  gross: number;
  grossLoss: number;
  net: number;
  currency?: string;
  lang?: "fr" | "en";
}) {
  const total = gross + grossLoss || 1;
  const grossPct = (gross / total) * 100;

  return (
    <div className="flex flex-col justify-between p-3">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="yj-label block text-up">Profit Brut</span>
          <span className="mono text-[19px] font-bold text-up">+{fmtMoney(gross, currency, lang)}</span>
        </div>
        <div>
          <span className="yj-label block text-down">Perte Brute</span>
          <span className="mono text-[19px] font-bold text-down">-{fmtMoney(grossLoss, currency, lang)}</span>
        </div>
      </div>

      <div className="my-4">
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/[0.05]">
          <div className="h-full bg-up transition-all" style={{ width: `${grossPct}%` }} />
          <div className="h-full bg-down transition-all" style={{ width: `${100 - grossPct}%` }} />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-line pt-3">
        <span className="yj-label">Résultat Net</span>
        <span className={clsx("mono text-[18px] font-extrabold", net >= 0 ? "text-up" : "text-down")}>
          {net >= 0 ? "+" : ""}{fmtMoney(net, currency, lang)}
        </span>
      </div>
    </div>
  );
}

export function SharpeRatioGauge({ sharpe }: { sharpe: number }) {
  // Sharpe scale: 0 to 3+
  const clamped = Math.max(0, Math.min(sharpe, 3.5));
  const pct = (clamped / 3.5) * 100;

  const getLabel = () => {
    if (sharpe < 1.0) return { text: "Faible (< 1.0)", col: "text-down" };
    if (sharpe < 2.0) return { text: "Acceptable (1.0 - 1.99)", col: "text-gold" };
    if (sharpe < 3.0) return { text: "Bon (2.0 - 2.99)", col: "text-up" };
    return { text: "Excellent (3.0+)", col: "text-emerald-400" };
  };

  const status = getLabel();

  return (
    <div className="flex flex-col justify-between p-3">
      <div className="flex items-baseline justify-between">
        <div>
          <span className="mono text-3xl font-extrabold text-white">{sharpe.toFixed(2)}</span>
          <span className="ml-2 text-[12px] font-medium text-mut">/ 3.00+</span>
        </div>
        <span className={clsx("text-[12px] font-bold", status.col)}>{status.text}</span>
      </div>

      <div className="relative my-4">
        {/* Color bar */}
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/[0.05]">
          <div className="h-full w-[28.5%] bg-down/60" />
          <div className="h-full w-[28.5%] bg-gold/70" />
          <div className="h-full w-[28.5%] bg-up/80" />
          <div className="h-full w-[14.5%] bg-emerald-400" />
        </div>
        {/* Pointer indicator */}
        <div
          className="absolute -top-1 h-5 w-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all duration-500"
          style={{ left: `calc(${pct}% - 3px)` }}
        />
      </div>

      <div className="flex justify-between text-[11px] font-mono text-mut">
        <span>0.0</span>
        <span>1.0</span>
        <span>2.0</span>
        <span>3.0+</span>
      </div>
    </div>
  );
}

export function WinningBreakdownCard({
  title,
  items,
  currency = "USD",
  lang = "fr",
}: {
  title: string;
  items: { label: string; winRate: number; netPnl: number; rTotal: number; count: number }[];
  currency?: string;
  lang?: "fr" | "en";
}) {
  const maxR = Math.max(1, ...items.map((it) => Math.abs(it.rTotal)));

  return (
    <div className="yj-card p-5">
      <h4 className="mb-4 text-[14px] font-bold text-white">{title}</h4>
      {items.length === 0 ? (
        <p className="py-6 text-center text-[12.5px] text-mut">Aucune donnée</p>
      ) : (
        <div className="space-y-3.5">
          {items.slice(0, 5).map((it) => {
            const barPct = (Math.max(0, it.rTotal) / maxR) * 100;
            return (
              <div key={it.label} className="group">
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="font-semibold text-white group-hover:text-gold transition truncate max-w-[160px]">
                    {it.label}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="yj-badge yj-badge-up !text-[10px] !py-0.5">
                      {it.winRate.toFixed(0)}% WR
                    </span>
                    <span className="mono text-[11px] text-mut">{it.count} trd</span>
                    <span className={clsx("mono font-bold text-[12px]", it.netPnl >= 0 ? "text-up" : "text-down")}>
                      {fmtR(it.rTotal)}
                    </span>
                  </div>
                </div>
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-white/[0.05]">
                  <div
                    className={clsx("h-full rounded-full transition-all duration-500", it.rTotal >= 0 ? "bg-up" : "bg-down")}
                    style={{ width: `${Math.max(4, Math.min(100, barPct))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Donut({
  parts,
  size = 150,
}: {
  parts: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  const r = 42, c = 2 * Math.PI * r;
  let off = 0;
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 100 100" style={{ width: size, height: size }}>
        <circle cx="50" cy="50" r={r} fill="none" stroke={GRID} strokeWidth="12" />
        {total > 0 &&
          parts.map((p) => {
            const len = (p.value / total) * c;
            const el = (
              <circle
                key={p.label}
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke={p.color}
                strokeWidth="12"
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-off}
                transform="rotate(-90 50 50)"
              />
            );
            off += len;
            return el;
          })}
        <text x="50" y="54" textAnchor="middle" fontSize="16" fontWeight="700" fill="var(--color-white)" fontFamily={FONT}>
          {total}
        </text>
      </svg>
      <ul className="space-y-2 text-[12.5px]">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
            <span className="text-mut">{p.label}</span>
            <span className="mono font-semibold text-white">{p.value}</span>
            <span className="mono text-mut">{total ? `${((p.value / total) * 100).toFixed(0)}%` : "0%"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HBar({
  rows,
  fmt,
}: {
  rows: { label: string; value: number; sub?: string }[];
  fmt: (v: number) => string;
}) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.value)));
  if (!rows.length) return <Empty />;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[90px_1fr_80px] items-center gap-3 text-[12.5px]">
          <span className="truncate font-semibold text-white">{r.label}</span>
          <div className="flex h-2 items-center">
            <div className="h-full w-1/2 flex justify-end">
              {r.value < 0 && <div className="h-full rounded-l" style={{ width: `${(Math.abs(r.value) / max) * 100}%`, background: DOWN }} />}
            </div>
            <div className="h-full w-px bg-line" />
            <div className="h-full w-1/2">
              {r.value > 0 && <div className="h-full rounded-r" style={{ width: `${(r.value / max) * 100}%`, background: UP }} />}
            </div>
          </div>
          <span className="text-right">
            <span className="mono font-semibold" style={{ color: r.value >= 0 ? UP : DOWN }}>
              {fmt(r.value)}
            </span>
            {r.sub && <span className="ml-1 text-[10.5px] text-mut">{r.sub}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Empty({ label = "—" }: { label?: string }) {
  return <div className="flex h-[200px] items-center justify-center text-[13px] text-mut">{label}</div>;
}
