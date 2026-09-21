"use client";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { Newspaper, RefreshCw } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { fmtMoney, fmtR } from "@/lib/stats";

type NewsMetrics = {
  trades: number;
  winRate: number;
  profitFactor: number | null;
  expectancy: number;
  net: number;
  totalR: number;
  maxDrawdownR: number;
};
type NewsImpact = {
  withNews: NewsMetrics;
  withoutNews: NewsMetrics;
  before: NewsMetrics;
  during: NewsMetrics;
  after: NewsMetrics;
  byImportance: { high: NewsMetrics; medium: NewsMetrics; low: NewsMetrics };
};

const empty: NewsMetrics = { trades: 0, winRate: 0, profitFactor: 0, expectancy: 0, net: 0, totalR: 0, maxDrawdownR: 0 };

function MetricCard({ title, metric, lang }: { title: string; metric: NewsMetrics; lang: Lang }) {
  return (
    <div className="rounded-xl border border-line bg-white/[0.02] p-3">
      <div className="flex items-center justify-between"><span className="text-[12px] font-bold text-white">{title}</span><span className="mono text-[10.5px] text-mut">{metric.trades} trd</span></div>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        <span className="text-mut">Win Rate</span><span className="mono text-right text-white">{metric.winRate.toFixed(1)}%</span>
        <span className="text-mut">Profit Factor</span><span className="mono text-right text-gold">{metric.profitFactor === null ? "∞" : metric.profitFactor.toFixed(2)}</span>
        <span className="text-mut">Expectancy</span><span className={clsx("mono text-right", metric.expectancy >= 0 ? "text-up" : "text-down")}>{fmtR(metric.expectancy)}</span>
        <span className="text-mut">PnL</span><span className={clsx("mono text-right font-bold", metric.net >= 0 ? "text-up" : "text-down")}>{fmtMoney(metric.net, "USD", lang)}</span>
      </div>
    </div>
  );
}

export default function NewsImpactPanel({ lang }: { lang: Lang }) {
  const [data, setData] = useState<NewsImpact | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/analytics/news", { cache: "no-store" });
      if (!response.ok) throw new Error();
      setData(await response.json());
    } catch {
      setData(null);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  const value = data;

  return (
    <section className="yj-card p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/15 text-gold"><Newspaper size={18} /></span><div><h3 className="text-[15px] font-bold text-white">Impact des actualités économiques</h3><p className="text-[12px] text-mut">Calculé à partir des événements associés automatiquement aux entrées de trades horodatées.</p></div></div>
        <button className="yj-btn yj-btn-ghost !py-1.5" onClick={() => void load()} disabled={busy}><RefreshCw size={14} className={busy ? "animate-spin" : ""} />Actualiser</button>
      </div>
      <div className="grid gap-3 md:grid-cols-2"><MetricCard title="Avec news" metric={value?.withNews ?? empty} lang={lang} /><MetricCard title="Sans news" metric={value?.withoutNews ?? empty} lang={lang} /></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3"><MetricCard title="Avant news" metric={value?.before ?? empty} lang={lang} /><MetricCard title="Pendant news" metric={value?.during ?? empty} lang={lang} /><MetricCard title="Après news" metric={value?.after ?? empty} lang={lang} /></div>
      <div className="mt-4"><p className="yj-label mb-2">Par importance</p><div className="grid gap-3 sm:grid-cols-3"><MetricCard title="Élevée" metric={value?.byImportance.high ?? empty} lang={lang} /><MetricCard title="Moyenne" metric={value?.byImportance.medium ?? empty} lang={lang} /><MetricCard title="Faible" metric={value?.byImportance.low ?? empty} lang={lang} /></div></div>
    </section>
  );
}
