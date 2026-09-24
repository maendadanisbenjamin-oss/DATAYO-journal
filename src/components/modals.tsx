"use client";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Image as ImageIcon,
  Star,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import type { Dict } from "@/lib/i18n";
import {
  ACCOUNT_COLORS,
  EMOTIONAL_STATES,
  ICT_MODELS,
  MARKET_STRUCTURES,
  POI_ZONES,
  SYMBOLS_LIST,
  type Account,
  type AccountInput,
  type EconomicEvent,
  type Profile,
  type Screenshots,
  type SessionRow,
  type Trade,
  type TradeAccount,
  type TradeAccountInput,
  type TradeInput,
} from "@/lib/types";
import { Avatar, Field, Modal, compressImage } from "./ui";

const today = () => new Date().toISOString().slice(0, 10);
function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: 1 | 2 | 3 | 4 | 5) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n as 1 | 2 | 3 | 4 | 5)}
          className="p-0.5 transition hover:scale-110"
          aria-label={`${n} / 5`}
        >
          <Star size={20} className={n <= value ? "fill-gold text-gold" : "text-mut"} />
        </button>
      ))}
    </div>
  );
}

export function TradeModal({
  d,
  accounts,
  trade,
  tradeAccounts,
  onClose,
  onSave,
}: {
  d: Dict;
  accounts: Account[];
  trade: Trade | null;
  tradeAccounts: TradeAccount[];
  onClose: () => void;
  onSave: (t: TradeInput, accounts: TradeAccountInput[], id?: string) => Promise<void>;
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const initialScreenshots: Screenshots = (() => {
    if (!trade?.screenshots) return {};
    try {
      return JSON.parse(trade.screenshots);
    } catch {
      return {};
    }
  })();

  const [f, setF] = useState<TradeInput>(
    trade ?? {
      accountId: accounts[0]?.id ?? "",
      date: today(),
      openedAt: new Date().toISOString(),
      closedAt: null,
      mode: "live",
      sourceRunId: null,
      symbol: "EURUSD",
      direction: "long",
      session: "london",
      setup: "Silver Bullet",
      notes: "",

      tradingType: "Day Trade",
      timeframe: "M15",
      entryPrice: null,
      stopLoss: null,
      takeProfit: null,
      exitPrice: null,
      rrRatio: null,

      ictModel: "Silver Bullet",
      marketStructure: "Bullish Trend",
      htfTimeframe: "H4",
      poiZone: "Order Block (OB)",
      setupNotes: "",

      emotionalState: "Calme & Patient",
      htfBias: "",
      managementNotes: "",
      planRespect: 5,
      tradeOutcome: "TP touché",

      screenshots: JSON.stringify(initialScreenshots),
      lessonsLearned: "",
    }
  );

  const [screenshots, setScreenshots] = useState<Screenshots>(initialScreenshots);
  const [busy, setBusy] = useState(false);
  const [tradeAccountInputs, setTradeAccountInputs] = useState<TradeAccountInput[]>(
  trade
    ? tradeAccounts
        .filter((ta) => ta.tradeId === trade.id)
        .map((ta) => ({
          accountId: ta.accountId,
          lotSize: ta.lotSize,
        }))
    : accounts[0]
      ? [{ accountId: accounts[0].id, lotSize: null }]
      : []
);
  const up = <K extends keyof TradeInput>(k: K, v: TradeInput[K]) => setF((s) => ({ ...s, [k]: v }));

  // Auto-calculate expected RR if entry, stop loss and take profit are filled
  useEffect(() => {
    const entry = f.entryPrice;
    const sl = f.stopLoss;
    const tp = f.takeProfit;
    const exit = f.exitPrice;

    if (entry && sl && (tp || exit)) {
      const riskDistance = Math.abs(entry - sl);
      if (riskDistance > 0) {
        if (tp) {
          const rewardDistance = Math.abs(tp - entry);
          const rr = Number((rewardDistance / riskDistance).toFixed(2));
          setTimeout(() => up("rrRatio", rr), 0);
        }
      }
    }
  }, [f.entryPrice, f.stopLoss, f.takeProfit, f.exitPrice, f.direction]);

  const handleUploadScreenshot = async (key: keyof Screenshots, file: File) => {
    try {
      const dataUrl = await compressImage(file, 900, 0.85);
      const updated = { ...screenshots, [key]: dataUrl };
      setScreenshots(updated);
      up("screenshots", JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveScreenshot = (key: keyof Screenshots) => {
    const updated = { ...screenshots };
    delete updated[key];
    setScreenshots(updated);
    up("screenshots", JSON.stringify(updated));
  };

  const submit = async () => {
  if (!f.symbol || !f.date || tradeAccountInputs.length === 0) return;
  setBusy(true);
  try {
    await onSave(
      { ...f, screenshots: JSON.stringify(screenshots) },
      tradeAccountInputs,
      trade?.id
    );
  } finally {
    setBusy(false);
  }
};

  const stepsList = [
    { num: 1, label: d.stepExecution },
    { num: 2, label: d.stepSetup },
    { num: 3, label: d.stepPsychology },
    { num: 4, label: d.stepConclusion },
  ] as const;

  return (
    <Modal
      title={trade ? d.editTrade : d.newTrade}
      onClose={onClose}
      wide
      footer={
        <div className="flex w-full items-center justify-between">
          <div>
            {step > 1 && (
              <button
                type="button"
                className="yj-btn yj-btn-ghost"
                onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4) : s))}
              >
                <ChevronLeft size={16} />
                {d.previousStep}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="yj-btn yj-btn-ghost" onClick={onClose}>
              {d.cancel}
            </button>
            {step < 4 ? (
              <button
                type="button"
                className="yj-btn yj-btn-primary"
                onClick={() => setStep((s) => (s < 4 ? ((s + 1) as 1 | 2 | 3 | 4) : s))}
              >
                {d.nextStep}
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="yj-btn yj-btn-primary"
                disabled={busy || !f.symbol || tradeAccountInputs.length === 0}
                onClick={submit}
              >
                <Check size={16} />
                {d.finish}
              </button>
            )}
          </div>
        </div>
      }
    >
      {/* 4 Steps Indicator Bar */}
      <div className="mb-6 grid grid-cols-4 gap-2">
        {stepsList.map((s) => (
          <button
            key={s.num}
            type="button"
            onClick={() => setStep(s.num)}
            className={clsx(
              "flex items-center justify-center gap-2 rounded-xl border p-2.5 text-[12.5px] font-semibold transition",
              step === s.num
                ? "border-gold/60 bg-gold/15 text-gold shadow-sm"
                : "border-line bg-white/[0.02] text-mut hover:text-white"
            )}
          >
            <span
              className={clsx(
                "flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold",
                step === s.num ? "bg-gold text-[#17130a]" : "bg-white/10 text-mut"
              )}
            >
              {s.num}
            </span>
            <span className="hidden sm:inline">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Step 1: Données du Trade & Exécution */}
      {step === 1 && (
        <div className="space-y-4">
          <h4 className="text-[14px] font-bold text-white border-b border-line pb-2">{d.step1Title}</h4>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={d.account}>
              <div className="space-y-2">
                {accounts.map((a) => {
                  const selected = tradeAccountInputs.some((x) => x.accountId === a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setTradeAccountInputs((current) =>
                          selected
                            ? current.filter((x) => x.accountId !== a.id)
                            : [...current, { accountId: a.id, lotSize: null }]
                        );
                      }}
                      className={clsx(
                        "w-full rounded-xl border p-2.5 text-left text-[12.5px] font-semibold transition",
                        selected
                          ? "border-gold/60 bg-gold/15 text-gold"
                          : "border-line bg-white/[0.02] text-mut hover:text-white"
                      )}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span>{a.name}</span>
                        <span>{a.currency}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label={d.pairOrAsset}>
              <input
                list="symbol-suggestions"
                className="yj-input uppercase"
                placeholder="EURUSD, XAUUSD…"
                value={f.symbol}
                onChange={(e) => up("symbol", e.target.value.toUpperCase())}
              />
              <datalist id="symbol-suggestions">
                {SYMBOLS_LIST.map((sym) => (
                  <option key={sym} value={sym} />
                ))}
              </datalist>
            </Field>

            <Field label={d.date}>
              <input type="date" className="yj-input" value={f.date} onChange={(e) => up("date", e.target.value)} />
            </Field>

            <Field label="Heure d’entrée (UTC)">
              <input
                type="datetime-local"
                className="yj-input mono"
                value={f.openedAt ? new Date(f.openedAt).toISOString().slice(0, 16) : ""}
                onChange={(e) => up("openedAt", e.target.value ? new Date(`${e.target.value}:00Z`).toISOString() : null)}
              />
            </Field>

            <Field label={d.direction}>
              <div className="flex gap-2">
                {(["long", "short"] as const).map((dir) => (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => up("direction", dir)}
                    className={clsx("yj-chip flex-1 text-center font-bold", f.direction === dir && "active")}
                  >
                    {dir === "long" ? d.long : d.short}
                  </button>
                ))}
              </div>
            </Field>

            <Field label={d.ictModel}>
              <input
                list="ict-models-list"
                className="yj-input"
                placeholder="Silver Bullet, FVG…"
                value={f.ictModel}
                onChange={(e) => {
                  up("ictModel", e.target.value);
                  up("setup", e.target.value);
                }}
              />
              <datalist id="ict-models-list">
                {ICT_MODELS.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </Field>

            <Field label={d.session}>
              <select
                className="yj-select"
                value={f.session}
                onChange={(e) => up("session", e.target.value as TradeInput["session"])}
              >
                <option value="asia">{d.sessionAsia}</option>
                <option value="london">{d.sessionLondon}</option>
                <option value="newyork">{d.sessionNY}</option>              </select>
            </Field>

            <Field label={d.tradingType}>
              <select
                className="yj-select"
                value={f.tradingType}
                onChange={(e) => up("tradingType", e.target.value as TradeInput["tradingType"])}
              >
                <option value="Day Trade">Day Trade</option>
                <option value="Scalp">Scalp</option>
                <option value="Swing">Swing</option>              </select>
            </Field>

            <Field label={d.timeframeExecution}>
              <select className="yj-select" value={f.timeframe} onChange={(e) => up("timeframe", e.target.value)}>
                {["M1", "M3", "M5", "M15", "M30", "H1", "H4", "D1"].map((tf) => (
                  <option key={tf} value={tf}>
                    {tf}
                  </option>
                ))}              </select>
            </Field>

            {tradeAccountInputs.length > 0 && (
              <div className="sm:col-span-3 rounded-2xl border border-line bg-white/[0.02] p-4">
                <div className="mb-3 text-[13px] font-bold text-white">
                  Comptes associ?s
                </div>

                <div className="space-y-3">
                  {tradeAccountInputs.map((item) => {
                    const account = accounts.find((a) => a.id === item.accountId);
                    if (!account) return null;

                    return (
                      <div
                        key={item.accountId}
                        className="grid gap-3 rounded-xl border border-line bg-white/[0.02] p-3 sm:grid-cols-3"
                      >
                        <div className="flex items-center">
                          <div>
                            <div className="text-[13px] font-semibold text-white">
                              {account.name}
                            </div>
                            <div className="text-[11px] text-mut">
                              {account.currency}
                            </div>
                          </div>
                        </div>

                        <Field label={d.lotSize}>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            className="yj-input mono"
                            placeholder="1.0"
                            value={item.lotSize ?? ""}
                            onChange={(e) => {
                              const value = e.target.value ? Number(e.target.value) : null;
                              setTradeAccountInputs((current) =>
                                current.map((x) =>
                                  x.accountId === item.accountId
                                    ? { ...x, lotSize: value }
                                    : x
                                )
                              );
                            }}
                          />
                        </Field>

                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Prix d'Exécution Box */}
          <div className="rounded-2xl border border-line bg-white/[0.02] p-4">
            <h5 className="mb-3 text-[13px] font-bold text-white">{d.executionPrices}</h5>
            <div className="grid gap-3 sm:grid-cols-5">
              <Field label={d.entryPrice}>
                <input
                  type="number"
                  step="any"
                  className="yj-input mono"
                  placeholder="1.08500"
                  value={f.entryPrice ?? ""}
                  onChange={(e) => up("entryPrice", e.target.value ? Number(e.target.value) : null)}
                />
              </Field>
              <Field label={d.stopLoss}>
                <input
                  type="number"
                  step="any"
                  className="yj-input mono"
                  placeholder="1.08350"
                  value={f.stopLoss ?? ""}
                  onChange={(e) => up("stopLoss", e.target.value ? Number(e.target.value) : null)}
                />
              </Field>
              <Field label={d.takeProfit}>
                <input
                  type="number"
                  step="any"
                  className="yj-input mono"
                  placeholder="1.08900"
                  value={f.takeProfit ?? ""}
                  onChange={(e) => up("takeProfit", e.target.value ? Number(e.target.value) : null)}
                />
              </Field>
              <Field label={d.exitPrice}>
                <input
                  type="number"
                  step="any"
                  className="yj-input mono"
                  placeholder="1.08850"
                  value={f.exitPrice ?? ""}
                  onChange={(e) => up("exitPrice", e.target.value ? Number(e.target.value) : null)}
                />
              </Field>
            </div>

            {/* Calculated values */}
            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-3 text-[12.5px]">
              <div>
                <span className="yj-label block">{d.rrRatio}</span>
                <span className="mono text-[15px] font-bold text-white">{f.rrRatio ? `1 : ${f.rrRatio}` : "—"}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Structure de Marché & POI */}
      {step === 2 && (
        <div className="space-y-4">
          <h4 className="text-[14px] font-bold text-white border-b border-line pb-2">{d.step2Title}</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={d.marketStructure}>
              <select
                className="yj-select"
                value={f.marketStructure}
                onChange={(e) => up("marketStructure", e.target.value)}
              >
                {MARKET_STRUCTURES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}              </select>
            </Field>

            <Field label={d.htfTimeframe}>
              <select className="yj-select" value={f.htfTimeframe} onChange={(e) => up("htfTimeframe", e.target.value)}>
                {["M15", "H1", "H4", "Daily", "Weekly"].map((tf) => (
                  <option key={tf} value={tf}>
                    {tf}
                  </option>
                ))}              </select>
            </Field>

            <Field label={d.poiZone} className="sm:col-span-2">
              <input
                list="poi-zones-list"
                className="yj-input"
                placeholder="Order Block, FVG, Liquidity sweep…"
                value={f.poiZone}
                onChange={(e) => up("poiZone", e.target.value)}
              />
              <datalist id="poi-zones-list">
                {POI_ZONES.map((pz) => (
                  <option key={pz} value={pz} />
                ))}
              </datalist>
            </Field>

            <Field label={d.confluenceNotes} className="sm:col-span-2">
              <textarea
                rows={4}
                className="yj-textarea"
                placeholder="Confluence HTF, liquidité interne/externe, session overlap, alignement momentum…"
                value={f.setupNotes}
                onChange={(e) => {
                  up("setupNotes", e.target.value);
                  up("notes", e.target.value);
                }}
              />
            </Field>
          </div>
        </div>
      )}

      {/* Step 3: Management & Psychologie */}
      {step === 3 && (
        <div className="space-y-4">
          <h4 className="text-[14px] font-bold text-white border-b border-line pb-2">{d.step3Title}</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={d.emotionalState}>
              <select
                className="yj-select"
                value={f.emotionalState}
                onChange={(e) => up("emotionalState", e.target.value)}
              >
                {EMOTIONAL_STATES.map((es) => (
                  <option key={es} value={es}>
                    {es}
                  </option>
                ))}              </select>
            </Field>

            <Field label={d.planRespect}>
              <StarRating value={f.planRespect} onChange={(v) => up("planRespect", v)} />
            </Field>
            <Field label={d.tradeOutcome} className="sm:col-span-2">
              <select
                className="yj-select"
                value={f.tradeOutcome}
                onChange={(e) => up("tradeOutcome", e.target.value as TradeInput["tradeOutcome"])}
              >
                <option value="En cours">En cours</option>
                <option value="TP touché">TP touché</option>
                <option value="SL touché">SL touché</option>
                <option value="BE">BE (Break-Even)</option>
                <option value="Sortie manuelle">Sortie manuelle</option>
              </select>
            </Field>

            <Field label={d.htfBias} className="sm:col-span-2">
              <textarea
                rows={2}
                className="yj-textarea"
                placeholder="Biais directionnel, actualités ou annonces éco, sentiment général…"
                value={f.htfBias}
                onChange={(e) => up("htfBias", e.target.value)}
              />
            </Field>

            <Field label={d.managementNotes} className="sm:col-span-2">
              <textarea
                rows={3}
                className="yj-textarea"
                placeholder="Suivi en direct, déplacement du SL vers BE, prises de profits partielles…"
                value={f.managementNotes}
                onChange={(e) => up("managementNotes", e.target.value)}
              />
            </Field>
          </div>
        </div>
      )}

      {/* Step 4: Conclusion & Graphiques */}
      {step === 4 && (
        <div className="space-y-5">
          <h4 className="text-[14px] font-bold text-white border-b border-line pb-2">{d.step4Title}</h4>

          <div className="grid gap-4 sm:grid-cols-3">
            {/* Screenshot 1: Prise de Position */}
            <ScreenshotZone
              title={d.screenshot1}
              dataUrl={screenshots.entry}
              onUpload={(file) => handleUploadScreenshot("entry", file)}
              onRemove={() => handleRemoveScreenshot("entry")}
            />

            {/* Screenshot 2: Suivi / BE */}
            <ScreenshotZone
              title={d.screenshot2}
              dataUrl={screenshots.management}
              onUpload={(file) => handleUploadScreenshot("management", file)}
              onRemove={() => handleRemoveScreenshot("management")}
            />

            {/* Screenshot 3: Résultat */}
            <ScreenshotZone
              title={d.screenshot3}
              dataUrl={screenshots.result}
              onUpload={(file) => handleUploadScreenshot("result", file)}
              onRemove={() => handleRemoveScreenshot("result")}
            />
          </div>

          <Field label={d.lessonsLearned}>
            <textarea
              rows={4}
              className="yj-textarea"
              placeholder="Que retenir de ce trade ? Points forts, erreurs à éviter, ajustements pour les prochaines positions…"
              value={f.lessonsLearned}
              onChange={(e) => up("lessonsLearned", e.target.value)}
            />
          </Field>
        </div>
      )}
    </Modal>
  );
}

function ScreenshotZone({
  title,
  dataUrl,
  onUpload,
  onRemove,
}: {
  title: string;
  dataUrl?: string;
  onUpload: (f: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col rounded-2xl border border-line bg-white/[0.02] p-3 text-center">
      <span className="yj-label mb-2 block text-left">{title}</span>
      {dataUrl ? (
        <div className="group relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-line bg-black/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dataUrl} alt={title} className="h-full w-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition group-hover:opacity-100">
            <button
              type="button"
              className="rounded-lg bg-down/80 p-2 text-white hover:bg-down"
              onClick={onRemove}
              title="Supprimer l'image"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          className="flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-line bg-panel/30 p-4 transition hover:border-gold/50 hover:bg-gold/[0.03]"
        >
          <UploadCloud size={24} className="mb-2 text-mut" />
          <p className="text-[11.5px] font-medium text-mut">Glisser une image ou</p>
          <p className="text-[11px] font-bold text-gold hover:underline">cliquer pour téléverser</p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
      />
    </div>
  );
}

export function TradeDetailModal({
  trade,
  accounts,
  tradeAccounts,
  onClose,
  onEdit,
  d,
}: {
  trade: Trade;
  accounts: Account[];
  tradeAccounts: TradeAccount[];
  onClose: () => void;
  onEdit: () => void;
  d: Dict;
}) {
  const [zoomImg, setZoomImg] = useState<string | null>(null);
  const [relatedEvents, setRelatedEvents] = useState<{ event: EconomicEvent; relation: string; minutesFromEntry: number | null }[]>([]);
  const associatedTradeAccounts = tradeAccounts.filter(
    (ta) => ta.tradeId === trade.id
  );

  useEffect(() => {
    if (!trade.openedAt) {
      const timer = setTimeout(() => setRelatedEvents([]), 0);
      return () => clearTimeout(timer);
    }
    fetch(`/api/economic-events/nearby?tradeId=${trade.id}`)
      .then((response) => (response.ok ? response.json() : []))
      .then(setRelatedEvents)
      .catch(() => setRelatedEvents([]));
  }, [trade.id, trade.openedAt]);

  const screenshots: Screenshots = (() => {
    try {
      return JSON.parse(trade.screenshots || "{}");
    } catch {
      return {};
    }
  })();

  return (
    <>
      <Modal
        title={`${d.tradeDetails} · ${trade.symbol}`}
        onClose={onClose}
        wide
        footer={
          <div className="flex w-full items-center justify-between">
            <span className="mono text-[12px] text-mut">{trade.date}</span>
            <div className="flex gap-2">
              <button className="yj-btn yj-btn-ghost" onClick={onClose}>
                {d.close}
              </button>
              <button
                className="yj-btn yj-btn-primary"
                onClick={() => {
                  onClose();
                  onEdit();
                }}
              >
                {d.edit}
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-6 text-[13px]">
          {/* Header Stats Strip */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-line bg-white/[0.02] p-3">
              <span className="yj-label block">{d.direction}</span>
              <span className={clsx("font-bold", trade.direction === "long" ? "text-up" : "text-down")}>
                {trade.direction === "long" ? d.long : d.short}
              </span>
            </div>

            <div className="rounded-xl border border-line bg-white/[0.02] p-3">
              <span className="yj-label block">{d.account}</span>
              <div className="mt-1 space-y-1">
                {associatedTradeAccounts.map((ta) => {
                  const account = accounts.find((a) => a.id === ta.accountId);
                  return (
                    <div key={ta.id} className="font-semibold text-white">
                      {account?.name ?? "?"}
                      {ta.lotSize !== null && (
                        <span className="ml-2 text-xs text-white/60">
                          {ta.lotSize} lot
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-line bg-white/[0.02] p-3">
              <span className="yj-label block">{d.returnR}</span>
              <div className="mt-1 space-y-1">
                {associatedTradeAccounts.map((ta) => {
                  const account = accounts.find((a) => a.id === ta.accountId);
                  const rMultiple = ta.rMultiple;
                  return (
                    <div
                      key={ta.id}
                      className={clsx(
                        "mono font-bold",
                        rMultiple === null
                          ? "text-white/50"
                          : rMultiple >= 0
                            ? "text-up"
                            : "text-down"
                      )}
                    >
                      {account?.name ?? "?"}:{" "}
                      {rMultiple === null
                        ? "—"
                        : `${rMultiple >= 0 ? "+" : ""}${rMultiple.toFixed(2)}R`}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-line bg-white/[0.02] p-3">
              <span className="yj-label block">{d.pnl}</span>
              <div className="mt-1 space-y-1">
                {associatedTradeAccounts.map((ta) => {
                  const account = accounts.find((a) => a.id === ta.accountId);
                  const pnl = ta.pnl;
                  return (
                    <div
                      key={ta.id}
                      className={clsx(
                        "mono font-bold",
                        pnl === null
                          ? "text-white/50"
                          : pnl >= 0
                            ? "text-up"
                            : "text-down"
                      )}
                    >
                      {account?.name ?? "?"}:{" "}
                      {pnl === null
                        ? "—"
                        : `${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Execution details */}
          <div className="rounded-2xl border border-line bg-white/[0.02] p-4">
            <h5 className="mb-3 font-bold text-white">{d.step1Title}</h5>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-[12.5px]">
              <div>
                <span className="yj-label block">{d.session}</span>
                <span className="capitalize text-white">{trade.session}</span>
              </div>
              <div>
                <span className="yj-label block">{d.tradingType}</span>
                <span className="text-white">{trade.tradingType}</span>
              </div>
              <div>
                <span className="yj-label block">{d.timeframeExecution}</span>
                <span className="mono text-white">{trade.timeframe}</span>
              </div>
              <div>
                <span className="yj-label block">{d.ictModel}</span>
                <span className="text-gold font-medium">{trade.ictModel}</span>
              </div>
              {trade.entryPrice && (
                <div>
                  <span className="yj-label block">{d.entryPrice}</span>
                  <span className="mono text-white">{trade.entryPrice}</span>
                </div>
              )}
              {trade.stopLoss && (
                <div>
                  <span className="yj-label block">{d.stopLoss}</span>
                  <span className="mono text-down">{trade.stopLoss}</span>
                </div>
              )}
              {trade.takeProfit && (
                <div>
                  <span className="yj-label block">{d.takeProfit}</span>
                  <span className="mono text-up">{trade.takeProfit}</span>
                </div>
              )}
              {trade.exitPrice && (
                <div>
                  <span className="yj-label block">{d.exitPrice}</span>
                  <span className="mono text-white">{trade.exitPrice}</span>
                </div>
              )}
            </div>
          </div>

          {/* Structure & Psychology */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-line bg-white/[0.02] p-4">
              <h5 className="mb-2 font-bold text-white">{d.step2Title}</h5>
              <p className="text-[12px] text-mut">
                Structure : <b className="text-white">{trade.marketStructure}</b> ({trade.htfTimeframe})
              </p>
              <p className="mt-1 text-[12px] text-mut">
                POI : <b className="text-gold">{trade.poiZone}</b>
              </p>
              {trade.setupNotes && <p className="mt-2 text-[12.5px] text-ink/80 italic">{trade.setupNotes}</p>}
            </div>

            <div className="rounded-2xl border border-line bg-white/[0.02] p-4">
              <h5 className="mb-2 font-bold text-white">{d.step3Title}</h5>
              <p className="text-[12px] text-mut">
                Émotion : <b className="text-white">{trade.emotionalState}</b>
              </p>
              <p className="mt-1 text-[12px] text-mut">
  Plan :{" "}
  <span className="inline-flex items-center gap-0.5 align-middle">
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        size={13}
        className={n <= trade.planRespect ? "fill-gold text-gold" : "text-mut"}
      />
    ))}
  </span>
  {" "}· Résultat : <b className="text-white">{trade.tradeOutcome}</b>
</p>
              {trade.managementNotes && (
                <p className="mt-2 text-[12.5px] text-ink/80 italic">{trade.managementNotes}</p>
              )}
            </div>
          </div>

          {/* Economic events associated automatically with the trade execution time */}
          {relatedEvents.length > 0 && (
            <div className="rounded-2xl border border-gold/25 bg-gold/[0.05] p-4">
              <div className="mb-3 flex items-center justify-between">
                <h5 className="font-bold text-white">News économiques proches</h5>
                <span className="yj-badge yj-badge-gold">± 60 min</span>
              </div>
              <div className="space-y-2">
                {relatedEvents.map(({ event, relation, minutesFromEntry }) => (
                  <div key={event.id} className="rounded-xl border border-line bg-panel/40 p-3 text-[12px]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-white">{event.title}</span>
                      <span className={clsx("yj-badge", event.importance === "high" ? "yj-badge-down" : event.importance === "medium" ? "yj-badge-gold" : "yj-badge-mut")}>{event.currency || event.country || "Macro"} · {event.importance.toUpperCase()}</span>
                    </div>
                    <p className="mt-1 text-mut">{new Date(event.scheduledAt).toLocaleString(undefined, { timeZone: "UTC", dateStyle: "short", timeStyle: "short" })} UTC · {relation.replaceAll("_", " ")} {minutesFromEntry !== null ? `(${minutesFromEntry >= 0 ? "+" : ""}${minutesFromEntry} min)` : ""}</p>
                    <div className="mt-2 grid grid-cols-3 gap-2 mono text-[11px]"><span className="rounded bg-white/[0.04] p-1.5 text-mut">Prev.<b className="block text-white">{event.previous ?? "—"}</b></span><span className="rounded bg-white/[0.04] p-1.5 text-mut">Fcst.<b className="block text-white">{event.forecast ?? "—"}</b></span><span className="rounded bg-white/[0.04] p-1.5 text-mut">Act.<b className="block text-white">{event.actual ?? "—"}</b></span></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Screenshots Preview */}
          {(screenshots.entry || screenshots.management || screenshots.result) && (
            <div>
              <h5 className="mb-3 font-bold text-white">{d.step4Title}</h5>
              <div className="grid gap-3 sm:grid-cols-3">
                {screenshots.entry && (
                  <div
                    className="cursor-pointer overflow-hidden rounded-xl border border-line transition hover:border-gold"
                    onClick={() => setZoomImg(screenshots.entry!)}
                  >
                    <span className="yj-label block bg-panel/80 p-2">{d.screenshot1}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={screenshots.entry} alt={d.screenshot1} className="aspect-[4/3] w-full object-cover" />
                  </div>
                )}
                {screenshots.management && (
                  <div
                    className="cursor-pointer overflow-hidden rounded-xl border border-line transition hover:border-gold"
                    onClick={() => setZoomImg(screenshots.management!)}
                  >
                    <span className="yj-label block bg-panel/80 p-2">{d.screenshot2}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={screenshots.management}
                      alt={d.screenshot2}
                      className="aspect-[4/3] w-full object-cover"
                    />
                  </div>
                )}
                {screenshots.result && (
                  <div
                    className="cursor-pointer overflow-hidden rounded-xl border border-line transition hover:border-gold"
                    onClick={() => setZoomImg(screenshots.result!)}
                  >
                    <span className="yj-label block bg-panel/80 p-2">{d.screenshot3}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={screenshots.result} alt={d.screenshot3} className="aspect-[4/3] w-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          )}

          {trade.lessonsLearned && (
            <div className="rounded-2xl border border-line bg-white/[0.02] p-4">
              <span className="yj-label block mb-1">{d.lessonsLearned}</span>
              <p className="text-[13px] text-ink/90 leading-relaxed">{trade.lessonsLearned}</p>
            </div>
          )}
        </div>
      </Modal>

      {/* Lightbox zoom */}
      {zoomImg && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
          onClick={() => setZoomImg(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setZoomImg(null)}
              className="absolute -right-3 -top-3 rounded-full bg-panel p-2 text-white shadow-xl hover:bg-gold hover:text-black"
            >
              <X size={18} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={zoomImg} alt="Zoom" className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain shadow-2xl" />
          </div>
        </div>
      )}
    </>
  );
}

export function AccountModal({
  d,
  account,
  onClose,
  onSave,
}: {
  d: Dict;
  account: Account | null;
  onClose: () => void;
  onSave: (a: AccountInput, id?: string) => Promise<void>;
}) {
  const [f, setF] = useState<AccountInput>(
    account ?? { name: "", broker: "", currency: "USD", initialBalance: 10000, color: ACCOUNT_COLORS[0] }
  );
  const [busy, setBusy] = useState(false);
  const up = <K extends keyof AccountInput>(k: K, v: AccountInput[K]) => setF((s) => ({ ...s, [k]: v }));
  return (
    <Modal
      title={account ? d.editAccount : d.newAccount}
      onClose={onClose}
      footer={
        <>
          <button className="yj-btn yj-btn-ghost" onClick={onClose}>
            {d.cancel}
          </button>
          <button
            className="yj-btn yj-btn-primary"
            disabled={busy || !f.name}
            onClick={async () => {
              setBusy(true);
              try {
                await onSave(f, account?.id);
              } finally {
                setBusy(false);
              }
            }}
          >
            {d.save}
          </button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={d.accountName}>
          <input className="yj-input" value={f.name} onChange={(e) => up("name", e.target.value)} />
        </Field>
        <Field label={d.broker}>
          <input className="yj-input" value={f.broker} onChange={(e) => up("broker", e.target.value)} />
        </Field>
        <Field label={d.currency}>
          <select className="yj-select" value={f.currency} onChange={(e) => up("currency", e.target.value)}>
            {["USD", "EUR", "GBP", "CHF", "JPY"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label={d.initialBalance}>
          <input
            type="number"
            className="yj-input mono"
            value={f.initialBalance}
            onChange={(e) => up("initialBalance", Number(e.target.value))}
          />
        </Field>
        <Field label={d.color} className="sm:col-span-2">
          <div className="flex gap-2">
            {ACCOUNT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => up("color", c)}
                className={clsx(
                  "h-8 w-8 rounded-full border-2 transition",
                  f.color === c ? "scale-110 border-white shadow-lg" : "border-transparent"
                )}
                style={{ background: c }}
              />
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  );
}

export function ProfileModal({
  d,
  profile,
  onClose,
  onSave,
  toast,
}: {
  d: Dict;
  profile: Profile;
  onClose: () => void;
  onSave: (patch: Record<string, unknown>) => Promise<boolean>;
  toast: (m: string, k?: "ok" | "err") => void;
}) {
  const [f, setF] = useState({
    displayName: profile.displayName,
    email: profile.email,
    title: profile.title,
    bio: profile.bio,
    memberSince: profile.memberSince,
    avatarUrl: profile.avatarUrl as string | null,
    currentPassword: "",
    newPassword: "",
  });
  const [busy, setBusy] = useState(false);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const loadSessions = () =>
    fetch("/api/sessions")
      .then((r) => (r.ok ? r.json() : []))
      .then(setSessions)
      .catch(() => {});
  useEffect(() => {
    loadSessions();
  }, []);
  const pick = async (file: File) => {
    try {
      const url = await compressImage(file, 256, 0.85);
      setF((s) => ({ ...s, avatarUrl: url }));
    } catch {
      toast(d.photoTooLarge, "err");
    }
  };
  const submit = async () => {
    setBusy(true);
    try {
      const patch: Record<string, unknown> = {
        displayName: f.displayName,
        email: f.email,
        title: f.title,
        bio: f.bio,
        memberSince: f.memberSince,
        avatarUrl: f.avatarUrl,
      };
      if (f.newPassword) {
        patch.newPassword = f.newPassword;
        patch.currentPassword = f.currentPassword;
      }
      if (await onSave(patch)) onClose();
    } finally {
      setBusy(false);
    }
  };
  const revoke = async (id: string) => {
    await fetch("/api/sessions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadSessions();
  };
  const fmt = (s: string) => new Date(s).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });

  return (
    <Modal
      title={d.editProfile}
      onClose={onClose}
      wide
      footer={
        <>
          <button className="yj-btn yj-btn-ghost" onClick={onClose}>
            {d.cancel}
          </button>
          <button className="yj-btn yj-btn-primary" disabled={busy} onClick={submit}>
            {d.save}
          </button>
        </>
      }
    >
      <div className="mb-6 flex items-center gap-5">
        <div className="group relative cursor-pointer" onClick={() => fileRef.current?.click()}>
          <Avatar name={f.displayName} url={f.avatarUrl} size={80} />
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition group-hover:opacity-100">
            <Camera size={20} />
          </span>
        </div>
        <div>
          <p className="yj-label mb-2">{d.avatar}</p>
          <div className="flex gap-2">
            <button type="button" className="yj-btn yj-btn-ghost !py-1.5" onClick={() => fileRef.current?.click()}>
              <Camera size={14} />
              {d.changePhoto}
            </button>
            {f.avatarUrl && (
              <button
                type="button"
                className="yj-btn yj-btn-danger !py-1.5"
                onClick={() => setF((s) => ({ ...s, avatarUrl: null }))}
              >
                <Trash2 size={14} />
                {d.removePhoto}
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={d.displayName}>
          <input className="yj-input" value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} />
        </Field>
        <Field label={d.email}>
          <input type="email" className="yj-input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </Field>
        <Field label={d.title}>
          <input className="yj-input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        </Field>
        <Field label={d.memberSince}>
          <input
            type="number"
            className="yj-input mono"
            value={f.memberSince}
            onChange={(e) => setF({ ...f, memberSince: Number(e.target.value) })}
          />
        </Field>
        <Field label={d.bio} className="sm:col-span-2">
          <textarea rows={3} className="yj-textarea" value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} />
        </Field>
        <Field label={d.currentPassword}>
          <input
            type="password"
            className="yj-input"
            autoComplete="current-password"
            value={f.currentPassword}
            onChange={(e) => setF({ ...f, currentPassword: e.target.value })}
          />
        </Field>
        <Field label={`${d.newPassword} · ${d.leaveBlank}`}>
          <input
            type="password"
            className="yj-input"
            autoComplete="new-password"
            value={f.newPassword}
            onChange={(e) => setF({ ...f, newPassword: e.target.value })}
          />
        </Field>
      </div>
      <div className="mt-6">
        <p className="yj-label mb-2">{d.devices}</p>
        <ul className="divide-y divide-line rounded-xl border border-line">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-[12.5px]">
              <div className="min-w-0">
                <p className="truncate text-white">
                  {s.device || "—"}{" "}
                  {s.current && <span className="yj-badge yj-badge-gold ml-1">{d.thisDevice}</span>}
                </p>
                <p className="text-[11px] text-mut">
                  {d.lastSeen} {fmt(s.lastSeenAt)}
                </p>
              </div>
              {!s.current && (
                <button className="yj-btn yj-btn-danger !px-2.5 !py-1 text-[12px]" onClick={() => revoke(s.id)}>
                  {d.revoke}
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}

