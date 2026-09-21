"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  ChevronDown,
  CirclePause,
  CirclePlay,
  Database,
  Download,
  FastForward,
  FileUp,
  FlaskConical,
  Gauge,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  SkipForward,
  TrendingDown,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";
import type { Dict, Lang } from "@/lib/i18n";
import { computeStats, equitySeries, fmtMoney, fmtR } from "@/lib/stats";
import type {
  Account,
  Backtest,
  EconomicEvent,
  Instrument,
  MarketCandle,
  MarketDataGap,
  ReplaySession,
  ReplayTrade,
  Strategy,
  Trade,
} from "@/lib/types";
import { EquityChart } from "./charts";
import MarketChart from "./market-chart";

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error || "Erreur réseau");
  return json as T;
}

const frameOptions = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"];
const speedOptions = [0.5, 1, 2, 5, 10];

function importantClass(importance: string) {
  return importance === "high" ? "yj-badge-down" : importance === "medium" ? "yj-badge-gold" : "yj-badge-mut";
}

function asDatetimeInput(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIso(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Date invalide");
  return date.toISOString();
}

// ---------------------------------------------------------------------------
// Shared Market Data Library / import panel
// ---------------------------------------------------------------------------
function MarketDataLibrary({
  d,
  instruments,
  onInstrumentCreated,
  onImported,
}: {
  d: Dict;
  instruments: Instrument[];
  onInstrumentCreated: (instrument: Instrument) => void;
  onImported: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"instrument" | "csv">("instrument");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [instrumentForm, setInstrumentForm] = useState({
    symbol: "",
    displayName: "",
    assetClass: "forex",
    baseCurrency: "",
    quoteCurrency: "USD",
    marketHours: "weekday",
    availableFrom: "",
    qualityNotes: "",
  });
  const [importInstrumentId, setImportInstrumentId] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const createInstrument = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const instrument = await jsonFetch<Instrument>("/api/market/instruments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(instrumentForm),
      });
      onInstrumentCreated(instrument);
      setImportInstrumentId(instrument.id);
      setInstrumentForm({ symbol: "", displayName: "", assetClass: "forex", baseCurrency: "", quoteCurrency: "USD", marketHours: "weekday", availableFrom: "", qualityNotes: "" });
      setMessage("Instrument créé. Vous pouvez maintenant importer ses bougies M1.");
      setTab("csv");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible de créer l’instrument");
    } finally {
      setBusy(false);
    }
  };

  const uploadCsv = async (file: File) => {
    if (!importInstrumentId) {
      setMessage("Sélectionnez d’abord un instrument.");
      return;
    }
    if (file.size > 1_000_000) {
      setMessage("Importez au maximum 2 000 lignes par fichier/lots de moins de 1 Mo.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const csvText = await file.text();
      const response = await jsonFetch<{ accepted: number; rejected: number; deduplicated: number; gaps: unknown[] }>("/api/market/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instrumentId: importInstrumentId, csvText, mode: "historical" }),
      });
      setMessage(`${response.accepted} bougies validées · ${response.rejected} rejetées · ${response.deduplicated} doublons fusionnés · ${response.gaps.length} gap(s) détecté(s).`);
      onImported();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import impossible");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="yj-card overflow-hidden">
      <button onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-4 p-5 text-left hover:bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/15 text-gold"><Database size={18} /></span>
          <div>
            <h3 className="text-[14px] font-bold text-white">{d.marketData}</h3>
            <p className="text-[12px] text-mut">M1 canonique · validation OHLCV · déduplication · gaps · rétention 15 ans</p>
          </div>
        </div>
        <ChevronDown size={18} className={clsx("text-mut transition", open && "rotate-180")} />
      </button>

      {open && (
        <div className="border-t border-line p-5">
          <div className="mb-4 flex rounded-xl border border-line bg-white/[0.02] p-1 text-[12px] font-bold">
            <button onClick={() => setTab("instrument")} className={clsx("flex-1 rounded-lg px-3 py-2 transition", tab === "instrument" ? "bg-gold text-[#17130a]" : "text-mut hover:text-white")}>
              {d.createInstrument}
            </button>
            <button onClick={() => setTab("csv")} className={clsx("flex-1 rounded-lg px-3 py-2 transition", tab === "csv" ? "bg-gold text-[#17130a]" : "text-mut hover:text-white")}>
              {d.importCsv}
            </button>
          </div>

          {tab === "instrument" ? (
            <form onSubmit={createInstrument} className="grid gap-3 sm:grid-cols-3">
              <label><span className="yj-label mb-1 block">Symbole canonique</span><input required className="yj-input uppercase" placeholder="DXY" value={instrumentForm.symbol} onChange={(e) => setInstrumentForm({ ...instrumentForm, symbol: e.target.value.toUpperCase() })} /></label>
              <label><span className="yj-label mb-1 block">Nom affiché</span><input className="yj-input" placeholder="U.S. Dollar Index" value={instrumentForm.displayName} onChange={(e) => setInstrumentForm({ ...instrumentForm, displayName: e.target.value })} /></label>
              <label><span className="yj-label mb-1 block">{d.assetClass}</span><select className="yj-select" value={instrumentForm.assetClass} onChange={(e) => setInstrumentForm({ ...instrumentForm, assetClass: e.target.value })}><option value="forex">Forex</option><option value="metal">Métal</option><option value="crypto">Crypto</option><option value="index">Indice</option><option value="commodity">Matière première</option><option value="equity">Action</option></select></label>
              <label><span className="yj-label mb-1 block">Devise de base</span><input className="yj-input uppercase" placeholder="EUR" value={instrumentForm.baseCurrency} onChange={(e) => setInstrumentForm({ ...instrumentForm, baseCurrency: e.target.value.toUpperCase() })} /></label>
              <label><span className="yj-label mb-1 block">Devise de cotation</span><input className="yj-input uppercase" value={instrumentForm.quoteCurrency} onChange={(e) => setInstrumentForm({ ...instrumentForm, quoteCurrency: e.target.value.toUpperCase() })} /></label>
              <label><span className="yj-label mb-1 block">{d.marketHours}</span><select className="yj-select" value={instrumentForm.marketHours} onChange={(e) => setInstrumentForm({ ...instrumentForm, marketHours: e.target.value })}><option value="weekday">{d.weekdayMarket}</option><option value="continuous">{d.continuousMarket}</option><option value="custom">Custom</option></select></label>
              <label><span className="yj-label mb-1 block">{d.availableFrom}</span><input type="datetime-local" className="yj-input" value={instrumentForm.availableFrom} onChange={(e) => setInstrumentForm({ ...instrumentForm, availableFrom: e.target.value })} /></label>
              <label className="sm:col-span-2"><span className="yj-label mb-1 block">{d.quality}</span><input className="yj-input" placeholder="Source, couverture, horaires, contraintes de licence…" value={instrumentForm.qualityNotes} onChange={(e) => setInstrumentForm({ ...instrumentForm, qualityNotes: e.target.value })} /></label>
              <div className="sm:col-span-3 flex justify-end"><button disabled={busy} className="yj-btn yj-btn-primary"><Plus size={15} />{busy ? "Création…" : d.createInstrument}</button></div>
            </form>
          ) : (
            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <label><span className="yj-label mb-1 block">{d.instruments}</span><select className="yj-select" value={importInstrumentId} onChange={(e) => setImportInstrumentId(e.target.value)}><option value="">Sélectionner un instrument</option>{instruments.map((item) => <option key={item.id} value={item.id}>{item.symbol} — {item.displayName}</option>)}</select></label>
              <button disabled={busy || !instruments.length} onClick={() => fileRef.current?.click()} className="yj-btn yj-btn-primary"><FileUp size={16} />{busy ? "Import…" : d.importCsv}</button>
              <input ref={fileRef} hidden type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && uploadCsv(e.target.files[0])} />
              <p className="sm:col-span-2 text-[11.5px] leading-relaxed text-mut">Colonnes requises : <span className="mono text-white">timestamp, open, high, low, close</span> ; <span className="mono text-white">volume</span> est optionnel. Dates UTC ISO recommandées. Import fractionné à 2 000 M1 par lot pour protéger la base et le navigateur.</p>
            </div>
          )}

          {message && <p className={clsx("mt-4 rounded-xl border px-3 py-2 text-[12px]", message.includes("validées") || message.includes("créé") ? "border-up/30 bg-up/10 text-up" : "border-down/30 bg-down/10 text-down")}>{message}</p>}
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-gold/20 bg-gold/[0.05] px-3 py-2 text-[11.5px] leading-relaxed text-mut"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-gold" />{d.licenseRequired}. L’import CSV suppose que l’opérateur détient les droits de stockage et d’usage interne.</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Market Replay
// ---------------------------------------------------------------------------
type ReplaySnapshot = { session: ReplaySession; candles: MarketCandle[]; events: EconomicEvent[]; positions: ReplayTrade[] };

export function MarketReplayTab({ d, lang, accounts }: { d: Dict; lang: Lang; accounts: Account[] }) {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [sessions, setSessions] = useState<ReplaySession[]>([]);
  const [activeId, setActiveId] = useState("");
  const [snapshot, setSnapshot] = useState<ReplaySnapshot | null>(null);
  const [gaps, setGaps] = useState<MarketDataGap[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [form, setForm] = useState({ instrumentId: "", accountId: accounts[0]?.id ?? "", startAt: asDatetimeInput(new Date(new Date().getTime() - 24 * 60 * 60_000)), timeframe: "15m", initialCapital: accounts[0]?.initialBalance ?? 10000, speed: 1 });
  const [order, setOrder] = useState({ stopLoss: "", takeProfit: "", quantity: "1", commission: "0" });

  const refreshInstruments = useCallback(async () => {
    try {
      const rows = await jsonFetch<Instrument[]>("/api/market/instruments");
      setInstruments(rows);
      setForm((current) => ({ ...current, instrumentId: current.instrumentId || rows[0]?.id || "" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger les instruments");
    }
  }, []);

  const refreshSessions = useCallback(async () => {
    const rows = await jsonFetch<ReplaySession[]>("/api/replays");
    setSessions(rows);
    setActiveId((current) => current || rows[rows.length - 1]?.id || "");
  }, []);

  const refreshSnapshot = useCallback(async (id = activeId) => {
    if (!id) {
      setSnapshot(null);
      return;
    }
    try {
      const data = await jsonFetch<ReplaySnapshot>(`/api/replays/${id}`);
      setSnapshot(data);
      setGaps(await jsonFetch<MarketDataGap[]>(`/api/market/gaps?instrumentId=${data.session.instrumentId}&status=detected`));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger le Replay");
    }
  }, [activeId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refreshInstruments();
      void refreshSessions();
    }, 0);
    return () => clearTimeout(timer);
  }, [refreshInstruments, refreshSessions]);
  useEffect(() => {
    const timer = setTimeout(() => {
      void refreshSnapshot();
    }, 0);
    return () => clearTimeout(timer);
  }, [activeId, refreshSnapshot]);

  const createReplay = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const session = await jsonFetch<ReplaySession>("/api/replays", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, startAt: toIso(form.startAt) }) });
      setSessions((rows) => [...rows, session]);
      setActiveId(session.id);
      setPlaying(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Replay impossible"); } finally { setBusy(false); }
  };

  const advance = useCallback(async (steps = 1) => {
    if (!activeId) return;
    setBusy(true);
    try {
      const updated = await jsonFetch<ReplaySession>(`/api/replays/${activeId}/advance`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ steps }) });
      setSessions((rows) => rows.map((item) => item.id === updated.id ? updated : item));
      await refreshSnapshot(activeId);
      if (updated.status === "completed") setPlaying(false);
    } catch (e) { setPlaying(false); setError(e instanceof Error ? e.message : "Avancée impossible"); } finally { setBusy(false); }
  }, [activeId, refreshSnapshot]);

  useEffect(() => {
    if (!playing || !snapshot) return;
    const delay = Math.max(180, 1000 / snapshot.session.speed);
    const timer = setTimeout(() => void advance(1), delay);
    return () => clearTimeout(timer);
  }, [playing, snapshot, advance]);

  const setSpeed = async (speed: number) => {
    if (!activeId) return;
    const updated = await jsonFetch<ReplaySession>(`/api/replays/${activeId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ speed, status: playing ? "playing" : "paused" }) });
    setSnapshot((value) => value ? { ...value, session: updated } : value);
    setSessions((rows) => rows.map((item) => item.id === updated.id ? updated : item));
  };

  const sendOrder = async (action: "buy" | "sell" | "close", replayTradeId?: string) => {
    if (!activeId) return;
    setBusy(true);
    try {
      await jsonFetch(`/api/replays/${activeId}/orders`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, replayTradeId, stopLoss: order.stopLoss ? Number(order.stopLoss) : null, takeProfit: order.takeProfit ? Number(order.takeProfit) : null, quantity: Number(order.quantity), commission: Number(order.commission) }) });
      await refreshSnapshot(activeId);
    } catch (e) { setError(e instanceof Error ? e.message : "Ordre impossible"); } finally { setBusy(false); }
  };

  const activeInstrument = instruments.find((item) => item.id === snapshot?.session.instrumentId);
  const openPositions = snapshot?.positions.filter((item) => item.status === "open") ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><div className="flex items-center gap-2"><span className="yj-badge yj-badge-gold">{d.replayMode}</span><h2 className="text-2xl font-extrabold tracking-tight text-white">{d.marketReplay}</h2></div><p className="mt-1 text-[13px] text-mut">Contrôle temporel isolé · bougies et calendrier strictement limités à l’instant simulé.</p></div>
        <span className="flex items-center gap-2 rounded-xl border border-up/20 bg-up/[0.06] px-3 py-2 text-[11.5px] font-semibold text-up"><ShieldCheck size={15} />{d.antiFutureLeak}</span>
      </div>

      <MarketDataLibrary d={d} instruments={instruments} onInstrumentCreated={(item) => { setInstruments((rows) => [...rows, item].sort((a, b) => a.symbol.localeCompare(b.symbol))); setForm((current) => ({ ...current, instrumentId: item.id })); }} onImported={() => { void refreshSnapshot(); }} />

      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <form onSubmit={createReplay} className="yj-card p-5 space-y-4">
          <div><h3 className="text-[15px] font-bold text-white">{d.startReplay}</h3><p className="mt-1 text-[12px] text-mut">Sélectionnez un point de départ couvert par vos données réelles importées.</p></div>
          <label className="block"><span className="yj-label mb-1 block">{d.instruments}</span><select required className="yj-select" value={form.instrumentId} onChange={(e) => setForm({ ...form, instrumentId: e.target.value })}><option value="">—</option>{instruments.map((item) => <option key={item.id} value={item.id}>{item.symbol} — {item.displayName}</option>)}</select></label>
          <label className="block"><span className="yj-label mb-1 block">{d.account}</span><select className="yj-select" value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value, initialCapital: accounts.find((item) => item.id === e.target.value)?.initialBalance ?? form.initialCapital })}><option value="">Capital personnalisé</option>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="block"><span className="yj-label mb-1 block">Date / heure de départ (UTC)</span><input required type="datetime-local" className="yj-input" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} /></label>
          <div className="grid grid-cols-2 gap-3"><label><span className="yj-label mb-1 block">Timeframe</span><select className="yj-select" value={form.timeframe} onChange={(e) => setForm({ ...form, timeframe: e.target.value })}>{frameOptions.map((frame) => <option key={frame}>{frame}</option>)}</select></label><label><span className="yj-label mb-1 block">Capital initial</span><input type="number" className="yj-input mono" value={form.initialCapital} onChange={(e) => setForm({ ...form, initialCapital: Number(e.target.value) })} /></label></div>
          <button disabled={busy || !form.instrumentId} className="yj-btn yj-btn-primary w-full"><RotateCcw size={16} />{busy ? "Création…" : d.startReplay}</button>
        </form>

        <div className="yj-card min-w-0 p-5">
          {!snapshot ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center text-center"><RotateCcw size={38} className="mb-3 text-gold/70" /><p className="font-bold text-white">Sélectionnez ou créez une session Replay</p><p className="mt-1 max-w-md text-[12.5px] text-mut">Les données ne sont jamais simulées. Importez des M1 réelles, puis choisissez un départ historique.</p></div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div><p className="yj-label">{d.simulatedTime}</p><p className="mono text-[15px] font-bold text-white">{new Date(snapshot.session.simulatedAt).toLocaleString(lang === "fr" ? "fr-FR" : "en-GB", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" })} UTC</p></div>
                <div className="flex items-center gap-2"><select className="yj-select !w-48 !py-1.5 text-[12px]" value={activeId} onChange={(e) => { setPlaying(false); setActiveId(e.target.value); }}><option value="">Session Replay</option>{sessions.map((session) => <option key={session.id} value={session.id}>{instruments.find((i) => i.id === session.instrumentId)?.symbol ?? "—"} · {new Date(session.startAt).toLocaleDateString()}</option>)}</select><span className="yj-badge yj-badge-gold">{activeInstrument?.symbol ?? "—"} · {snapshot.session.timeframe}</span></div>
              </div>

              <MarketChart candles={snapshot.candles} events={snapshot.events} />

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                <div className="flex items-center gap-2"><button className={clsx("yj-btn", playing ? "yj-btn-ghost" : "yj-btn-primary")} onClick={() => setPlaying((value) => !value)} disabled={busy}>{playing ? <><CirclePause size={16} />{d.pause}</> : <><CirclePlay size={16} />{d.play}</>}</button><button className="yj-btn yj-btn-ghost" onClick={() => void advance(1)} disabled={busy}><SkipForward size={16} />{d.nextCandle}</button></div>
                <div className="flex items-center gap-2"><span className="yj-label">{d.speed}</span><select className="yj-select !w-20 !py-1.5 mono" value={snapshot.session.speed} onChange={(e) => void setSpeed(Number(e.target.value))}>{speedOptions.map((speed) => <option key={speed} value={speed}>x{speed}</option>)}</select><span className="yj-badge yj-badge-up">Equity {fmtMoney(snapshot.session.currentEquity, "USD", lang)}</span></div>
              </div>
            </>
          )}
        </div>
      </div>

      {snapshot && (
        <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
          <div className="yj-card p-5"><div className="mb-4 flex items-center justify-between"><div><h3 className="text-[15px] font-bold text-white">Simulation de position</h3><p className="text-[12px] text-mut">Entrée au dernier close visible ; SL prioritaire si SL et TP touchent la même bougie.</p></div><span className="yj-badge yj-badge-gold">{d.replayMode}</span></div><div className="grid gap-3 md:grid-cols-4"><label><span className="yj-label mb-1 block">{d.stopLoss}</span><input type="number" step="any" className="yj-input mono" placeholder="Optionnel" value={order.stopLoss} onChange={(e) => setOrder({ ...order, stopLoss: e.target.value })} /></label><label><span className="yj-label mb-1 block">{d.takeProfit}</span><input type="number" step="any" className="yj-input mono" placeholder="Optionnel" value={order.takeProfit} onChange={(e) => setOrder({ ...order, takeProfit: e.target.value })} /></label><label><span className="yj-label mb-1 block">{d.positionSize}</span><input type="number" min="0.0001" step="any" className="yj-input mono" value={order.quantity} onChange={(e) => setOrder({ ...order, quantity: e.target.value })} /></label><label><span className="yj-label mb-1 block">Commission</span><input type="number" min="0" step="any" className="yj-input mono" value={order.commission} onChange={(e) => setOrder({ ...order, commission: e.target.value })} /></label></div><div className="mt-4 flex gap-2"><button className="yj-btn bg-up/15 text-up border border-up/30 hover:bg-up/25" disabled={busy} onClick={() => void sendOrder("buy")}><TrendingUp size={16} />{d.buy}</button><button className="yj-btn bg-down/15 text-down border border-down/30 hover:bg-down/25" disabled={busy} onClick={() => void sendOrder("sell")}><TrendingDown size={16} />{d.sell}</button></div></div>
          <div className="yj-card p-5"><h3 className="text-[15px] font-bold text-white">{d.openPositions}</h3><div className="mt-3 space-y-2">{openPositions.length ? openPositions.map((position) => <div key={position.id} className="rounded-xl border border-line p-3"><div className="flex items-center justify-between"><span className={clsx("font-bold text-[12px]", position.direction === "long" ? "text-up" : "text-down")}>{position.direction.toUpperCase()} · {position.quantity}</span><button className="text-[11px] font-bold text-gold hover:underline" onClick={() => void sendOrder("close", position.id)}>{d.closePosition}</button></div><p className="mono mt-1 text-[11px] text-mut">E {position.entryPrice} · SL {position.stopLoss ?? "—"} · TP {position.takeProfit ?? "—"}</p></div>) : <p className="py-6 text-center text-[12px] text-mut">Aucune position ouverte</p>}</div></div>
        </div>
      )}

      {gaps.length > 0 && <div className="rounded-2xl border border-gold/25 bg-gold/[0.06] p-4 text-[12.5px] text-gold"><div className="flex items-center gap-2 font-bold"><AlertTriangle size={16} />{gaps.length} gap(s) M1 détecté(s)</div><p className="mt-1 text-mut">Les gaps restent visibles dans le moteur jusqu’à leur récupération via un import de correction validé ; aucune bougie n’est inventée.</p></div>}
      {error && <p className="rounded-xl border border-down/30 bg-down/10 px-3 py-2 text-[12px] text-down">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Backtesting
// ---------------------------------------------------------------------------
type BacktestDetail = { backtest: Backtest; trades: { pnl: number; rMultiple: number; openedAt: string; closedAt: string | null }[] };

export function BacktestingTab({ d, lang, accounts, liveTrades }: { d: Dict; lang: Lang; accounts: Account[]; liveTrades: Trade[] }) {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [runs, setRuns] = useState<Backtest[]>([]);
  const [active, setActive] = useState<BacktestDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "Candle Momentum", instrumentId: "", accountId: accounts[0]?.id ?? "", strategyId: "", timeframe: "15m", startAt: asDatetimeInput(new Date(new Date().getTime() - 30 * 86400_000)), endAt: asDatetimeInput(new Date(new Date().getTime() - 86400_000)), initialCapital: accounts[0]?.initialBalance ?? 10000, riskPct: 1, commissionPerOrder: 0, useNewsFilter: true });
  const [strategyName, setStrategyName] = useState("");
  const [replayCompare, setReplayCompare] = useState<(ReturnType<typeof computeStats> & { count: number }) | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [instrumentRows, strategyRows, runRows] = await Promise.all([jsonFetch<Instrument[]>("/api/market/instruments"), jsonFetch<Strategy[]>("/api/strategies"), jsonFetch<Backtest[]>("/api/backtests")]);
      setInstruments(instrumentRows); setStrategies(strategyRows); setRuns(runRows); setForm((f) => ({ ...f, instrumentId: f.instrumentId || instrumentRows[0]?.id || "" }));
    } catch (e) { setError(e instanceof Error ? e.message : "Chargement impossible"); }
    try {
      const compare = await jsonFetch<{ replay: ReturnType<typeof computeStats> & { count: number } }>("/api/compare");
      setReplayCompare(compare.replay);
    } catch { /* comparaison Replay optionnelle : on garde l'espace réservé en cas d'échec */ }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      void refresh();
    }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  const loadRun = async (id: string) => {
    try { setActive(await jsonFetch<BacktestDetail>(`/api/backtests/${id}`)); } catch (e) { setError(e instanceof Error ? e.message : "Backtest introuvable"); }
  };

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await jsonFetch<{ backtest: Backtest }>("/api/backtests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          startAt: toIso(form.startAt),
          endAt: toIso(form.endAt),
          rules: {
            entryRule: "previous_candle_momentum",
            stopPct: 0.25,
            targetRR: 2,
            newsFilter: {
              enabled: form.useNewsFilter,
              minutesBefore: 15,
              minutesAfter: 15,
              minimumImportance: "high",
            },
          },
        }),
      });
      setRuns((rows) => [result.backtest, ...rows]);
      await loadRun(result.backtest.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Backtest impossible");
    } finally {
      setBusy(false);
    }
  };

  const createStrategy = async () => {
    if (!strategyName.trim()) return;
    try {
      const strategy = await jsonFetch<Strategy>("/api/strategies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: strategyName.trim(), description: "Signal momentum de la bougie précédente", rules: { entryRule: "previous_candle_momentum", stopPct: 0.25, targetRR: 2 }, newsRules: { enabled: true, minutesBefore: 15, minutesAfter: 15, minimumImportance: "high" } }) });
      setStrategies((items) => [...items, strategy]); setForm((f) => ({ ...f, strategyId: strategy.id })); setStrategyName("");
    } catch (e) { setError(e instanceof Error ? e.message : "Stratégie impossible"); }
  };

  const summary = active ? safeSummary(active.backtest.summary) : null;
  const comparisonSummary = summary ?? safeSummary("{}");
  const live = computeStats(liveTrades);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><span className="yj-badge yj-badge-up">{d.backtestMode}</span><h2 className="text-2xl font-extrabold tracking-tight text-white">{d.backtesting}</h2></div><p className="mt-1 text-[13px] text-mut">Exécution séquentielle bougie par bougie avec moteur de position partagé et règles news.</p></div><span className="flex items-center gap-2 rounded-xl border border-up/20 bg-up/[0.06] px-3 py-2 text-[11.5px] font-semibold text-up"><ShieldCheck size={15} />{d.antiFutureLeak}</span></div>

      <div className="grid gap-5 xl:grid-cols-[390px_1fr]">
        <form onSubmit={run} className="yj-card p-5 space-y-4"><div><h3 className="text-[15px] font-bold text-white">{d.createBacktest}</h3><p className="mt-1 text-[12px] text-mut">Le moteur ne consomme que les bougies importées de la période sélectionnée.</p></div><label><span className="yj-label mb-1 block">Nom</span><input required className="yj-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label><span className="yj-label mb-1 block">{d.instruments}</span><select required className="yj-select" value={form.instrumentId} onChange={(e) => setForm({ ...form, instrumentId: e.target.value })}><option value="">—</option>{instruments.map((item) => <option key={item.id} value={item.id}>{item.symbol} — {item.displayName}</option>)}</select></label><div className="grid grid-cols-2 gap-3"><label><span className="yj-label mb-1 block">Début UTC</span><input required type="datetime-local" className="yj-input" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} /></label><label><span className="yj-label mb-1 block">Fin UTC</span><input required type="datetime-local" className="yj-input" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} /></label></div><div className="grid grid-cols-3 gap-3"><label><span className="yj-label mb-1 block">TF</span><select className="yj-select" value={form.timeframe} onChange={(e) => setForm({ ...form, timeframe: e.target.value })}>{frameOptions.map((frame) => <option key={frame}>{frame}</option>)}</select></label><label><span className="yj-label mb-1 block">Capital</span><input type="number" className="yj-input mono" value={form.initialCapital} onChange={(e) => setForm({ ...form, initialCapital: Number(e.target.value) })} /></label><label><span className="yj-label mb-1 block">{d.risk}</span><input type="number" min="0" step="0.1" className="yj-input mono" value={form.riskPct} onChange={(e) => setForm({ ...form, riskPct: Number(e.target.value) })} /></label></div><label><span className="yj-label mb-1 block">Stratégie</span><select className="yj-select" value={form.strategyId} onChange={(e) => setForm({ ...form, strategyId: e.target.value })}><option value="">Candle Momentum (défaut)</option>{strategies.map((strategy) => <option key={strategy.id} value={strategy.id}>{strategy.name}</option>)}</select></label><label className="flex items-center gap-2 rounded-xl border border-line bg-white/[0.02] p-3 text-[12.5px] text-mut"><input type="checkbox" checked={form.useNewsFilter} onChange={(e) => setForm({ ...form, useNewsFilter: e.target.checked })} /> Bloquer les entrées ±15 min autour des news à forte importance</label><button disabled={busy || !form.instrumentId} className="yj-btn yj-btn-primary w-full"><FlaskConical size={16} />{busy ? "Calcul…" : d.runBacktest}</button></form>

        <div className="space-y-5"><div className="yj-card p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-[15px] font-bold text-white">{d.completedRuns}</h3><p className="text-[12px] text-mut">Les résultats Backtest restent séparés du Journal Live.</p></div><div className="flex gap-2"><input className="yj-input !w-40 !py-1.5" placeholder="Nouvelle stratégie" value={strategyName} onChange={(e) => setStrategyName(e.target.value)} /><button className="yj-btn yj-btn-ghost !py-1.5" type="button" onClick={createStrategy}><Plus size={14} />Stratégie</button></div></div>{runs.length ? <div className="overflow-x-auto"><table className="yj-table w-full"><thead><tr><th>Nom</th><th>TF</th><th>Période</th><th>Statut</th><th></th></tr></thead><tbody>{runs.map((run) => <tr key={run.id} className="cursor-pointer" onClick={() => void loadRun(run.id)}><td className="font-bold text-white">{run.name}</td><td className="mono text-mut">{run.timeframe}</td><td className="mono text-[11px] text-mut">{new Date(run.startAt).toLocaleDateString()} → {new Date(run.endAt).toLocaleDateString()}</td><td><span className={clsx("yj-badge", run.status === "completed" ? "yj-badge-up" : run.status === "failed" ? "yj-badge-down" : "yj-badge-gold")}>{run.status}</span></td><td className="text-gold">Voir →</td></tr>)}</tbody></table></div> : <p className="py-8 text-center text-[12.5px] text-mut">Aucun Backtest exécuté.</p>}</div>

          {summary && <BacktestResult summary={summary} lang={lang} />}
        </div>
      </div>

      {/* Live / Replay / Backtest comparison */}
      <div className="yj-card p-6"><div className="mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-gold" /><h3 className="text-[15px] font-bold text-white">Comparaison Live / Replay / Backtest</h3></div><div className="overflow-x-auto"><table className="yj-table w-full"><thead><tr><th>Mode</th><th className="!text-right">Trades</th><th className="!text-right">Win Rate</th><th className="!text-right">Profit Factor</th><th className="!text-right">Return R</th><th className="!text-right">PnL / Equity</th></tr></thead><tbody><tr><td><span className="yj-badge yj-badge-up">{d.liveMode}</span></td><td className="mono !text-right">{live.n}</td><td className="mono !text-right">{live.winRate.toFixed(1)}%</td><td className="mono !text-right">{live.pf === Infinity ? "∞" : live.pf.toFixed(2)}</td><td className="mono !text-right">{fmtR(live.totalR)}</td><td className={clsx("mono !text-right font-bold", live.net >= 0 ? "text-up" : "text-down")}>{fmtMoney(live.net, "USD", lang)}</td></tr><tr><td><span className="yj-badge yj-badge-gold">{d.replayMode}</span></td>{replayCompare && replayCompare.count > 0 ? (<><td className="mono !text-right">{replayCompare.n}</td><td className="mono !text-right">{replayCompare.winRate.toFixed(1)}%</td><td className="mono !text-right">{replayCompare.pf === Infinity ? "∞" : replayCompare.pf.toFixed(2)}</td><td className="mono !text-right">{fmtR(replayCompare.totalR)}</td><td className={clsx("mono !text-right font-bold", replayCompare.net >= 0 ? "text-up" : "text-down")}>{fmtMoney(replayCompare.net, "USD", lang)}</td></>) : (<><td className="mono !text-right">—</td><td className="mono !text-right">—</td><td className="mono !text-right">—</td><td className="mono !text-right">—</td><td className="text-right text-mut">Aucune position clôturée en Replay</td></>)}</tr><tr><td><span className="yj-badge yj-badge-mut">{d.backtestMode}</span></td><td className="mono !text-right">{comparisonSummary.trades}</td><td className="mono !text-right">{comparisonSummary.winRate.toFixed(1)}%</td><td className="mono !text-right">{comparisonSummary.profitFactor === null ? "∞" : comparisonSummary.profitFactor.toFixed(2)}</td><td className="mono !text-right">{fmtR(comparisonSummary.totalR)}</td><td className={clsx("mono !text-right font-bold", comparisonSummary.net >= 0 ? "text-up" : "text-down")}>{fmtMoney(comparisonSummary.net, "USD", lang)}</td></tr></tbody></table></div></div>
      {error && <p className="rounded-xl border border-down/30 bg-down/10 px-3 py-2 text-[12px] text-down">{error}</p>}
    </div>
  );
}

function safeSummary(raw: string) {
  const fallback = { trades: 0, wins: 0, losses: 0, winRate: 0, net: 0, profitFactor: 0 as number | null, totalR: 0, averageR: 0, maxDrawdown: 0, finalEquity: 0, equityPoints: [] as { ts: string; equity: number }[] };
  try {
    const value = JSON.parse(raw) as Partial<typeof fallback>;
    return Object.assign({}, fallback, value);
  } catch {
    return fallback;
  }
}

function BacktestResult({ summary, lang }: { summary: ReturnType<typeof safeSummary>; lang: Lang }) {
  const equity = summary.equityPoints.map((point) => ({ date: new Date(point.ts).toISOString().slice(0, 16).replace("T", " "), value: point.equity }));
  return <div className="yj-card p-5"><div className="mb-4 flex items-center justify-between"><div><h3 className="text-[15px] font-bold text-white">Résultat Backtest</h3><p className="text-[12px] text-mut">Moteur séquentiel · exécution conservatrice intrabar.</p></div><span className="mono text-[15px] font-bold text-white">Equity {fmtMoney(summary.finalEquity, "USD", lang)}</span></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-5"><MiniMetric label="Trades" value={String(summary.trades)} /><MiniMetric label="Win Rate" value={`${summary.winRate.toFixed(1)}%`} tone="up" /><MiniMetric label="PF" value={summary.profitFactor === null ? "∞" : summary.profitFactor.toFixed(2)} tone="gold" /><MiniMetric label="Return R" value={fmtR(summary.totalR)} tone={summary.totalR >= 0 ? "up" : "down"} /><MiniMetric label="Max DD" value={fmtMoney(-summary.maxDrawdown, "USD", lang)} tone="down" /></div>{equity.length ? <div className="mt-5"><EquityChart data={equity} xLabel="Temps de backtest" yLabel="Equity ($)" currency="$" /></div> : <p className="mt-5 text-center text-[12px] text-mut">Aucune opération générée par la période/règle sélectionnée.</p>}</div>;
}

function MiniMetric({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" | "gold" }) {
  return <div className="rounded-xl border border-line bg-white/[0.02] p-3"><span className="yj-label block">{label}</span><span className={clsx("mono mt-1 block text-[16px] font-extrabold", tone === "up" ? "text-up" : tone === "down" ? "text-down" : tone === "gold" ? "text-gold" : "text-white")}>{value}</span></div>;
}

// ---------------------------------------------------------------------------
// Economic Calendar
// ---------------------------------------------------------------------------
export function EconomicCalendarTab({ d, lang }: { d: Dict; lang: Lang }) {
  const now = new Date();
  const [from, setFrom] = useState(asDatetimeInput(new Date(now.getTime() - 14 * 86400_000)));
  const [to, setTo] = useState(asDatetimeInput(new Date(now.getTime() + 45 * 86400_000)));
  const [currency, setCurrency] = useState("");
  const [importance, setImportance] = useState("");
  const [search, setSearch] = useState("");
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", currency: "USD", country: "US", category: "", importance: "high", scheduledAt: asDatetimeInput(new Date(new Date().getTime() + 3600_000)), knownAt: asDatetimeInput(new Date(new Date().getTime())), publishedAt: "", previous: "", forecast: "", actual: "", sourceUrl: "" });

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const query = new URLSearchParams({ from: toIso(from), to: toIso(to), limit: "500" });
      if (currency) query.set("currency", currency);
      if (importance) query.set("importance", importance);
      if (search) query.set("search", search);
      const result = await jsonFetch<{ events: EconomicEvent[] }>(`/api/economic-events?${query}`);
      setEvents(result.events); setError(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Impossible de charger le calendrier"); } finally { setBusy(false); }
  }, [from, to, currency, importance, search]);
  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const addEvent = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      await jsonFetch<EconomicEvent>("/api/economic-events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, scheduledAt: toIso(form.scheduledAt), knownAt: toIso(form.knownAt), publishedAt: form.publishedAt ? toIso(form.publishedAt) : null, status: form.actual ? "released" : "scheduled" }) });
      setShowAdd(false); setForm({ ...form, title: "", actual: "", forecast: "", previous: "" }); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Événement impossible"); } finally { setBusy(false); }
  };

  const currencies = Array.from(new Set(events.map((event) => event.currency).filter(Boolean))).sort();
  const upcomingCount = events.filter((event) => new Date(event.scheduledAt) > new Date()).length;
  const releasedCount = events.length - upcomingCount;

  return <div className="space-y-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><span className="yj-badge yj-badge-gold">MACRO</span><h2 className="text-2xl font-extrabold tracking-tight text-white">{d.economicCalendar}</h2></div><p className="mt-1 text-[13px] text-mut">Historique et à venir · Actual / Forecast / Previous · révisions et visibilité temporelle.</p></div><button className="yj-btn yj-btn-primary" onClick={() => setShowAdd((value) => !value)}><Plus size={16} />{d.addEconomicEvent}</button></div>

    {showAdd && <form onSubmit={addEvent} className="yj-card grid gap-3 p-5 sm:grid-cols-3"><label className="sm:col-span-2"><span className="yj-label mb-1 block">Événement</span><input required className="yj-input" placeholder="US CPI Core YoY" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label><label><span className="yj-label mb-1 block">{d.importance}</span><select className="yj-select" value={form.importance} onChange={(e) => setForm({ ...form, importance: e.target.value })}><option value="low">Faible</option><option value="medium">Moyenne</option><option value="high">Élevée</option></select></label><label><span className="yj-label mb-1 block">{d.currency}</span><input required className="yj-input uppercase" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} /></label><label><span className="yj-label mb-1 block">{d.country}</span><input className="yj-input uppercase" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value.toUpperCase() })} /></label><label><span className="yj-label mb-1 block">{d.category}</span><input className="yj-input" placeholder="Inflation" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label><label><span className="yj-label mb-1 block">Horaire planifié (UTC)</span><input required type="datetime-local" className="yj-input" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} /></label><label><span className="yj-label mb-1 block">Connu depuis (UTC)</span><input required type="datetime-local" className="yj-input" value={form.knownAt} onChange={(e) => setForm({ ...form, knownAt: e.target.value })} /></label><label><span className="yj-label mb-1 block">Publié à (UTC)</span><input type="datetime-local" className="yj-input" value={form.publishedAt} onChange={(e) => setForm({ ...form, publishedAt: e.target.value })} /></label><label><span className="yj-label mb-1 block">{d.previous}</span><input className="yj-input" value={form.previous} onChange={(e) => setForm({ ...form, previous: e.target.value })} /></label><label><span className="yj-label mb-1 block">{d.forecast}</span><input className="yj-input" value={form.forecast} onChange={(e) => setForm({ ...form, forecast: e.target.value })} /></label><label><span className="yj-label mb-1 block">{d.actual}</span><input className="yj-input" value={form.actual} onChange={(e) => setForm({ ...form, actual: e.target.value })} /></label><label className="sm:col-span-3"><span className="yj-label mb-1 block">URL source / preuve de licence</span><input className="yj-input" placeholder="https://…" value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} /></label><div className="sm:col-span-3 flex justify-end gap-2"><button type="button" className="yj-btn yj-btn-ghost" onClick={() => setShowAdd(false)}>{d.cancel}</button><button disabled={busy} className="yj-btn yj-btn-primary"><Save size={15} />{d.save}</button></div></form>}

    <div className="yj-card p-4"><div className="flex flex-wrap gap-3"><label className="flex items-center gap-2"><span className="yj-label">Du</span><input type="datetime-local" className="yj-input !w-48 !py-1.5" value={from} onChange={(e) => setFrom(e.target.value)} /></label><label className="flex items-center gap-2"><span className="yj-label">Au</span><input type="datetime-local" className="yj-input !w-48 !py-1.5" value={to} onChange={(e) => setTo(e.target.value)} /></label><select className="yj-select !w-28 !py-1.5" value={currency} onChange={(e) => setCurrency(e.target.value)}><option value="">Devise</option>{currencies.map((item) => <option key={item}>{item}</option>)}</select><select className="yj-select !w-32 !py-1.5" value={importance} onChange={(e) => setImportance(e.target.value)}><option value="">{d.importance}</option><option value="high">Élevée</option><option value="medium">Moyenne</option><option value="low">Faible</option></select><div className="relative"><Search size={14} className="absolute left-3 top-2.5 text-mut" /><input className="yj-input !w-52 !py-1.5 pl-8" placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} /></div><button className="yj-btn yj-btn-ghost !py-1.5" onClick={() => void load()}><RefreshCw size={15} />Actualiser</button></div></div>

    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><MiniMetric label={d.economicEvents} value={String(events.length)} /><MiniMetric label={d.upcoming} value={String(upcomingCount)} tone="gold" /><MiniMetric label={d.published} value={String(releasedCount)} tone="up" /><MiniMetric label="Haute importance" value={String(events.filter((event) => event.importance === "high").length)} tone="down" /></div>

    <div className="yj-card overflow-hidden"><div className="overflow-x-auto"><table className="yj-table w-full"><thead><tr><th>Date UTC</th><th>{d.currency}</th><th>{d.country}</th><th>Événement</th><th>{d.category}</th><th>{d.importance}</th><th className="!text-right">{d.previous}</th><th className="!text-right">{d.forecast}</th><th className="!text-right">{d.actual}</th><th>Statut</th></tr></thead><tbody>{events.length ? events.map((event) => { const released = event.status === "released" || event.status === "revised"; return <tr key={event.id}><td className="mono text-[11.5px] text-mut">{new Date(event.scheduledAt).toLocaleString(lang === "fr" ? "fr-FR" : "en-GB", { timeZone: "UTC", dateStyle: "short", timeStyle: "short" })}</td><td className="font-bold text-gold">{event.currency || "—"}</td><td className="text-mut">{event.country || "—"}</td><td className="font-semibold text-white max-w-[260px] truncate">{event.title}</td><td className="text-mut">{event.category || "—"}</td><td><span className={clsx("yj-badge", importantClass(event.importance))}>{event.importance.toUpperCase()}</span></td><td className="mono !text-right text-mut">{event.previous ?? "—"}</td><td className="mono !text-right text-white">{event.forecast ?? "—"}</td><td className={clsx("mono !text-right font-bold", released ? "text-white" : "text-mut")}>{released ? event.actual ?? "—" : "—"}</td><td><span className={clsx("yj-badge", released ? "yj-badge-up" : "yj-badge-gold")}>{released ? d.published : d.scheduled}</span></td></tr>; }) : <tr><td colSpan={10} className="!py-14 text-center text-mut">Aucun événement dans la période sélectionnée.</td></tr>}</tbody></table></div></div>
    <div className="flex items-start gap-2 rounded-xl border border-gold/20 bg-gold/[0.05] p-3 text-[11.5px] leading-relaxed text-mut"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-gold" />Les champs Actual et révisions ne deviennent visibles dans un Replay/Backtest qu’après leur timestamp de publication/connaissance historique.</div>
    {error && <p className="rounded-xl border border-down/30 bg-down/10 px-3 py-2 text-[12px] text-down">{error}</p>}
  </div>;
}
