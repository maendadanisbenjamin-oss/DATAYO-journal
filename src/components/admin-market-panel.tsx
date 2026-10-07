"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, Database, RefreshCw, ShieldCheck, Workflow } from "lucide-react";

type MarketAdminData = {
  instruments: Array<{ id: string; symbol: string; displayName: string; assetClass: string; isActive: boolean }>;
  instrumentSpecs: Array<{ spec: { id: string; broker: string; calculationModel: string; quantityUnit: string; valuePerPriceUnit: number; priceIncrement: number }; instrument: { symbol: string } }>;
  providers: Array<{ key: string; name: string; kind: string; configured: boolean; active: boolean; licenseStatus: string; licenseNotes: string }>;
  connections: Array<{ id: string; accountName: string; profileName: string; profileEmail: string; platform: string; brokerName: string; brokerAccountId: string; bridgeId: string; status: string; lastSeenAt: string | null; lastSyncAt: string | null; lastError: string }>;
  syncRuns: Array<{ id: string; connectionId: string; mode: string; status: string; startedAt: string; completedAt: string | null; ordersReceived: number; dealsReceived: number; positionsReceived: number; errorLog: string }>;
};

const inputClass = "yj-input";

export default function AdminMarketPanel() {
  const [data, setData] = useState<MarketAdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [instrumentForm, setInstrumentForm] = useState({ symbol: "", displayName: "", assetClass: "forex", baseCurrency: "", quoteCurrency: "USD" });
  const [specForm, setSpecForm] = useState({ instrumentId: "", broker: "", valuePerPriceUnit: "", priceIncrement: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/market", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Chargement de l'administration Market impossible.");
      setData(body as MarketAdminData);
      setSpecForm((current) => ({ ...current, instrumentId: current.instrumentId || body.instruments?.[0]?.id || "" }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const request = async (url: string, method: string, payload: unknown) => {
    const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "La modification a échoué.");
    return body;
  };

  const runAction = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await action();
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erreur inconnue.");
    } finally {
      setBusy(false);
    }
  };

  const addInstrument = async (event: React.FormEvent) => {
    event.preventDefault();
    await runAction(async () => {
      await request("/api/market/instruments", "POST", instrumentForm);
      setInstrumentForm({ symbol: "", displayName: "", assetClass: "forex", baseCurrency: "", quoteCurrency: "USD" });
    });
  };

  const addSpec = async (event: React.FormEvent) => {
    event.preventDefault();
    await runAction(async () => {
      await request("/api/market/instrument-specs", "POST", { ...specForm, valuePerPriceUnit: Number(specForm.valuePerPriceUnit), priceIncrement: Number(specForm.priceIncrement) });
      setSpecForm((current) => ({ ...current, broker: "", valuePerPriceUnit: "", priceIncrement: "" }));
    });
  };

  if (loading && !data) return <div className="yj-card p-6 text-sm text-mut">Chargement de l&apos;administration Market…</div>;

  return (
    <div className="space-y-5">
      <div className="yj-card flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3"><Activity size={22} className="text-gold" /><div><h2 className="text-lg font-semibold">Administration Market</h2><p className="mt-1 text-sm text-mut">Instruments, spécifications, providers, connexions et synchronisations.</p></div></div>
        <button type="button" className="yj-btn yj-btn-ghost" onClick={() => void load()} disabled={loading}><RefreshCw size={15} className={loading ? "animate-spin" : ""} />Actualiser</button>
      </div>
      {error && <div role="alert" className="yj-card border-down/30 p-4 text-sm text-down">{error}</div>}
      {data && <>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[["Instruments", data.instruments.length, Database], ["Providers", data.providers.length, Workflow], ["Connexions", data.connections.length, ShieldCheck], ["Synchronisations récentes", data.syncRuns.length, Activity]].map(([label, value, Icon]) => {
            const CardIcon = Icon as typeof Database;
            return <div key={String(label)} className="yj-card p-4"><div className="flex justify-between text-sm text-mut"><span>{label as string}</span><CardIcon size={17} /></div><p className="mt-3 text-2xl font-bold text-white">{value as number}</p></div>;
          })}
        </section>

        <section className="yj-card space-y-4 p-5">
          <h3 className="font-semibold text-white">Catalogue des instruments</h3>
          <form onSubmit={(event) => void addInstrument(event)} className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
            <input required aria-label="Symbole" className={inputClass} placeholder="EURUSD" value={instrumentForm.symbol} onChange={(event) => setInstrumentForm({ ...instrumentForm, symbol: event.target.value })} />
            <input required aria-label="Nom affiché" className={inputClass} placeholder="Euro / Dollar" value={instrumentForm.displayName} onChange={(event) => setInstrumentForm({ ...instrumentForm, displayName: event.target.value })} />
            <select aria-label="Classe d'actif" className="yj-select" value={instrumentForm.assetClass} onChange={(event) => setInstrumentForm({ ...instrumentForm, assetClass: event.target.value })}><option value="forex">Forex</option><option value="metal">Métal</option><option value="index">Indice</option><option value="crypto">Crypto</option><option value="commodity">Matière première</option><option value="equity">Action</option></select>
            <input aria-label="Devise de base" className={inputClass} placeholder="EUR" value={instrumentForm.baseCurrency} onChange={(event) => setInstrumentForm({ ...instrumentForm, baseCurrency: event.target.value })} />
            <input aria-label="Devise de cotation" className={inputClass} placeholder="USD" value={instrumentForm.quoteCurrency} onChange={(event) => setInstrumentForm({ ...instrumentForm, quoteCurrency: event.target.value })} />
            <button disabled={busy} className="yj-btn yj-btn-primary">Ajouter</button>
          </form>
          <div className="overflow-x-auto"><table className="yj-table w-full"><thead><tr><th>Symbole</th><th>Nom</th><th>Classe</th><th>État</th><th></th></tr></thead><tbody>{data.instruments.map((item) => <tr key={item.id}><td className="mono">{item.symbol}</td><td>{item.displayName}</td><td>{item.assetClass}</td><td>{item.isActive ? "Actif" : "Masqué"}</td><td><button type="button" disabled={busy} className="yj-btn yj-btn-ghost !px-3 !py-1" onClick={() => void runAction(() => request("/api/admin/market", "PATCH", { action: "instrument_status", id: item.id, isActive: !item.isActive }).then(() => undefined))}>{item.isActive ? "Masquer" : "Activer"}</button></td></tr>)}</tbody></table></div>
        </section>

        <section className="yj-card space-y-4 p-5">
          <h3 className="font-semibold text-white">Spécifications financières</h3>
          <form onSubmit={(event) => void addSpec(event)} className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            <select required aria-label="Instrument" className="yj-select" value={specForm.instrumentId} onChange={(event) => setSpecForm({ ...specForm, instrumentId: event.target.value })}><option value="">Instrument…</option>{data.instruments.map((item) => <option key={item.id} value={item.id}>{item.symbol}</option>)}</select>
            <input required aria-label="Broker" className={inputClass} placeholder="Nom broker" value={specForm.broker} onChange={(event) => setSpecForm({ ...specForm, broker: event.target.value })} />
            <input required aria-label="Valeur par unité de prix" type="number" min="0.0000001" step="any" className={inputClass} placeholder="Valeur par unité" value={specForm.valuePerPriceUnit} onChange={(event) => setSpecForm({ ...specForm, valuePerPriceUnit: event.target.value })} />
            <input required aria-label="Incrément de prix" type="number" min="0.0000001" step="any" className={inputClass} placeholder="Incrément de prix" value={specForm.priceIncrement} onChange={(event) => setSpecForm({ ...specForm, priceIncrement: event.target.value })} />
            <button disabled={busy || !data.instruments.length} className="yj-btn yj-btn-primary">Ajouter la spécification</button>
          </form>
          <div className="overflow-x-auto"><table className="yj-table w-full"><thead><tr><th>Instrument</th><th>Broker</th><th>Modèle</th><th>Valeur / unité</th><th>Incrément</th></tr></thead><tbody>{data.instrumentSpecs.map(({ spec, instrument }) => <tr key={spec.id}><td>{instrument.symbol}</td><td>{spec.broker}</td><td>{spec.calculationModel}</td><td className="mono">{spec.valuePerPriceUnit}</td><td className="mono">{spec.priceIncrement}</td></tr>)}</tbody></table></div>
        </section>

        <section className="yj-card space-y-4 p-5">
          <h3 className="font-semibold text-white">Providers et licences</h3>
          <div className="space-y-3">{data.providers.map((provider) => <div key={provider.key} className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-3">
            <div className="min-w-44 flex-1"><p className="font-medium text-white">{provider.name}</p><p className="text-xs text-mut">{provider.kind} · clé {provider.configured ? "configurée" : "absente"}</p></div>
            <select aria-label={`Statut de licence ${provider.name}`} className="yj-select !w-auto" value={provider.licenseStatus} onChange={(event) => setData({ ...data, providers: data.providers.map((item) => item.key === provider.key ? { ...item, licenseStatus: event.target.value } : item) })}><option value="unverified">Licence non vérifiée</option><option value="verified_internal">Usage interne vérifié</option><option value="blocked">Bloqué</option></select>
            <label className="flex items-center gap-2 text-xs text-mut"><input type="checkbox" checked={provider.active} onChange={(event) => setData({ ...data, providers: data.providers.map((item) => item.key === provider.key ? { ...item, active: event.target.checked } : item) })} />Actif</label>
            <button type="button" disabled={busy} className="yj-btn yj-btn-ghost" onClick={() => void runAction(() => request("/api/admin/market", "PATCH", { action: "provider", key: provider.key, active: provider.active, licenseStatus: provider.licenseStatus, licenseNotes: provider.licenseNotes }).then(() => undefined))}>Enregistrer</button>
            {provider.licenseStatus !== "verified_internal" && <p className="basis-full text-xs text-amber-300">La licence doit être vérifiée avant l&apos;usage en production.</p>}
          </div>)}</div>
        </section>

        <section className="yj-card space-y-4 p-5">
          <h3 className="font-semibold text-white">Connexions et synchronisations</h3>
          {!data.connections.length ? <p className="text-sm text-mut">Aucune connexion broker enregistrée.</p> : <div className="overflow-x-auto"><table className="yj-table w-full"><thead><tr><th>Propriétaire</th><th>Compte</th><th>Plateforme</th><th>Bridge</th><th>État</th><th>Dernier contact</th><th></th></tr></thead><tbody>{data.connections.map((connection) => <tr key={connection.id}><td>{connection.profileName}<span className="block text-xs text-mut">{connection.profileEmail}</span></td><td>{connection.accountName}<span className="block text-xs text-mut">{connection.brokerAccountId}</span></td><td>{connection.platform.toUpperCase()} · {connection.brokerName}</td><td className="mono">{connection.bridgeId}</td><td>{connection.status}</td><td>{connection.lastSeenAt ? new Date(connection.lastSeenAt).toLocaleString() : "Jamais"}</td><td><button type="button" className="yj-btn yj-btn-ghost !px-3 !py-1" disabled={busy} onClick={() => void runAction(() => request("/api/admin/market", "PATCH", { action: "connection_status", id: connection.id, status: connection.status === "disabled" ? "pending" : "disabled" }).then(() => undefined))}>{connection.status === "disabled" ? "Réactiver" : "Désactiver"}</button></td></tr>)}</tbody></table></div>}
          <div className="overflow-x-auto"><table className="yj-table w-full"><thead><tr><th>Début</th><th>Connexion</th><th>Mode</th><th>État</th><th>Reçus O / D / P</th><th>Erreur</th></tr></thead><tbody>{data.syncRuns.map((run) => <tr key={run.id}><td>{new Date(run.startedAt).toLocaleString()}</td><td className="mono">{run.connectionId.slice(0, 8)}</td><td>{run.mode}</td><td>{run.status}</td><td>{run.ordersReceived} / {run.dealsReceived} / {run.positionsReceived}</td><td className="max-w-72 truncate text-down" title={run.errorLog}>{run.errorLog || "—"}</td></tr>)}</tbody></table></div>
        </section>
      </>}
    </div>
  );
}
