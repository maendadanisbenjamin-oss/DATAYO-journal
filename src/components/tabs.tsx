"use client";
import { useMemo, useState } from "react";
import clsx from "clsx";
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Layers,
  Pencil,
  Plus,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { Dict, Lang } from "@/lib/i18n";
import {
  computeAnnualMonthlyMatrix,
  computeStats,
  equitySeries,
  fmtMoney,
  fmtR,
  groupBy,
  weekdayIndex,
} from "@/lib/stats";
import type { Account, Profile, Trade } from "@/lib/types";
import {
  EquityChart,
  ProfitLossCard,
  RBarChart,
  SharpeRatioGauge,
  WinRateGauge,
  WinningBreakdownCard,
} from "./charts";
import { Avatar } from "./ui";
import NewsImpactPanel from "./news-impact";

type CommonProps = {
  d: Dict;
  lang: Lang;
  trades: Trade[];
  accounts: Account[];
  currency: string;
};

export function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "up" | "down" | "gold";
}) {
  return (
    <div className="yj-card p-4 transition hover:border-gold/30">
      <p className="yj-label">{label}</p>
      <p
        className={clsx(
          "yj-value mt-1.5 text-[20px] sm:text-[22px] font-bold tracking-tight",
          tone === "up" && "text-up",
          tone === "down" && "text-down",
          tone === "gold" && "text-gold",
          !tone && "text-white"
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-[11.5px] text-mut">{sub}</p>}
    </div>
  );
}

const sessionLabel = (d: Dict, s: Trade["session"]) =>
  s === "asia" ? d.sessionAsia : s === "london" ? d.sessionLondon : d.sessionNY;

// =========================================================================
// TAB 1: Mon Profil & Comptes
// =========================================================================
export function ProfileAccountsTab({
  d,
  lang,
  profile,
  accounts,
  trades,
  onEditProfile,
  onNewAccount,
  onEditAccount,
  onDeleteAccount,
}: {
  d: Dict;
  lang: Lang;
  profile: Profile;
  accounts: Account[];
  trades: Trade[];
  onEditProfile: () => void;
  onNewAccount: () => void;
  onEditAccount: (a: Account) => void;
  onDeleteAccount: (a: Account) => void;
}) {
  const stats = useMemo(() => computeStats(trades), [trades]);

  const totalInitial = accounts.reduce((sum, a) => sum + a.initialBalance, 0);
  const totalCurrent = totalInitial + stats.net;
  const globalPct = totalInitial > 0 ? (stats.net / totalInitial) * 100 : 0;
  const activeDays = new Set(trades.map((t) => t.date)).size;

  return (
    <div className="space-y-6">
      {/* Profile Header Banner */}
      <div className="yj-card flex flex-col items-start justify-between gap-6 p-6 sm:flex-row sm:items-center">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <Avatar name={profile.displayName} url={profile.avatarUrl} size={84} />
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-extrabold tracking-tight text-white">{profile.displayName}</h2>
              <span className="yj-badge yj-badge-gold">{profile.title}</span>
            </div>
            <p className="mt-1 text-[13px] text-mut">
              {profile.email} · {d.memberSince} {profile.memberSince}
            </p>
            {profile.bio && <p className="mt-2.5 max-w-xl text-[13px] text-ink/80 leading-relaxed">{profile.bio}</p>}

            {/* Quick counters */}
            <div className="mt-4 flex flex-wrap items-center gap-6 border-t border-line pt-3 text-[13px]">
              <div>
                <span className="mono font-bold text-white text-[15px]">{trades.length}</span>{" "}
                <span className="text-mut">{d.totalTrades}</span>
              </div>
              <div>
                <span className="mono font-bold text-white text-[15px]">{activeDays}</span>{" "}
                <span className="text-mut">{d.activeDays}</span>
              </div>
              <div>
                <span className="mono font-bold text-white text-[15px]">{accounts.length}</span>{" "}
                <span className="text-mut">{d.connectedAccounts}</span>
              </div>
            </div>
          </div>
        </div>

        <button className="yj-btn yj-btn-ghost self-start sm:self-center" onClick={onEditProfile}>
          <Pencil size={15} />
          {d.editProfile}
        </button>
      </div>

      {/* Top Financial Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="yj-card p-5 border-l-4 border-l-gold">
          <span className="yj-label">{d.cumulativeCapital}</span>
          <p className="yj-value mt-2 text-2xl font-bold text-white">{fmtMoney(totalInitial, "USD", lang)}</p>
          <p className="mt-1 text-[12px] text-mut">{d.allAccountsCombined}</p>
        </div>

        <div className="yj-card p-5 border-l-4 border-l-up">
          <span className="yj-label">{d.globalBalance}</span>
          <p className="yj-value mt-2 text-2xl font-bold text-white">{fmtMoney(totalCurrent, "USD", lang)}</p>
          <p className={clsx("mt-1 text-[12px] font-bold mono", globalPct >= 0 ? "text-up" : "text-down")}>
            {globalPct >= 0 ? "+" : ""}
            {globalPct.toFixed(2)}%
          </p>
        </div>

        <div className="yj-card p-5 border-l-4 border-l-up">
          <span className="yj-label">{d.winRate}</span>
          <p className="yj-value mt-2 text-2xl font-bold text-up">{stats.winRate.toFixed(1)}%</p>
          <p className="mt-1 text-[12px] text-mut">
            {stats.wins}W · {stats.losses}L · {stats.be}BE
          </p>
        </div>
      </div>

      {/* Connected Accounts Section */}
      <div className="yj-card p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-[16px] font-bold text-white">{d.connectedAccounts}</h3>
            <p className="text-[12.5px] text-mut">{accounts.length} compte(s) actif(s)</p>
          </div>
          <button className="yj-btn yj-btn-primary !py-2" onClick={onNewAccount}>
            <Plus size={15} />
            {d.newAccount}
          </button>
        </div>

        {accounts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line p-10 text-center">
            <Wallet size={36} className="mx-auto mb-3 text-mut opacity-60" />
            <p className="font-semibold text-white">{d.noAccountsConnected}</p>
            <p className="mt-1 text-[12.5px] text-mut">{d.noAccountsHint}</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {accounts.map((a) => {
              const accTrades = trades.filter((t) => t.accountId === a.id);
              const s = computeStats(accTrades);
              const bal = a.initialBalance + s.net;
              const pct = a.initialBalance > 0 ? (s.net / a.initialBalance) * 100 : 0;

              return (
                <div
                  key={a.id}
                  className="rounded-2xl border border-line p-5 transition hover:border-gold/50"
                  style={{
                    background: `linear-gradient(135deg, ${a.color}15 0%, rgba(19, 15, 32, 0.9) 65%)`,
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ background: a.color }} />
                        <h4 className="font-bold text-white text-[15px]">{a.name}</h4>
                      </div>
                      <p className="mt-0.5 text-[12px] text-mut">
                        {a.broker || "Broker"} · {a.currency}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        className="rounded-lg p-1.5 text-mut hover:bg-white/5 hover:text-gold"
                        onClick={() => onEditAccount(a)}
                        title={d.edit}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="rounded-lg p-1.5 text-mut hover:bg-white/5 hover:text-down"
                        onClick={() => onDeleteAccount(a)}
                        title={d.delete}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-5">
                    <span className="yj-label">{d.currentBalance}</span>
                    <p className="yj-value text-2xl font-bold text-white">{fmtMoney(bal, a.currency, lang)}</p>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-3 text-[12px]">
                    <span className={clsx("mono font-bold", pct >= 0 ? "text-up" : "text-down")}>
                      {pct >= 0 ? "+" : ""}
                      {pct.toFixed(2)}%
                    </span>
                    <span className="text-mut">
                      {s.n} {d.tradesCount} · WR {s.winRate.toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// =========================================================================
// TAB 2: Évolution & Performance
// =========================================================================
export function EvolutionPerformanceTab({ d, lang, trades, accounts }: CommonProps) {
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [selectedAsset, setSelectedAsset] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");

  const assetsList = useMemo(() => Array.from(new Set(trades.map((t) => t.symbol))).sort(), [trades]);

  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      if (selectedAccount !== "all" && t.accountId !== selectedAccount) return false;
      if (selectedAsset !== "all" && t.symbol !== selectedAsset) return false;
      if (selectedPeriod === "this_month") {
        const curPrefix = new Date().toISOString().slice(0, 7);
        if (!t.date.startsWith(curPrefix)) return false;
      } else if (selectedPeriod === "30d") {
        const d30 = new Date();
        d30.setDate(d30.getDate() - 30);
        if (new Date(t.date) < d30) return false;
      } else if (selectedPeriod === "90d") {
        const d90 = new Date();
        d90.setDate(d90.getDate() - 90);
        if (new Date(t.date) < d90) return false;
      } else if (selectedPeriod === "2026") {
        if (!t.date.startsWith("2026")) return false;
      }
      return true;
    });
  }, [trades, selectedAccount, selectedAsset, selectedPeriod]);

  const s = useMemo(() => computeStats(filteredTrades), [filteredTrades]);

  // Initial and current balance of filtered view
  const baseAccount = accounts.find((a) => a.id === selectedAccount);
  const initialCap = baseAccount
    ? baseAccount.initialBalance
    : accounts.reduce((acc, curr) => acc + curr.initialBalance, 0);
  const currentCap = initialCap + s.net;
  const currency = baseAccount?.currency ?? accounts[0]?.currency ?? "USD";

  const eqData = useMemo(() => equitySeries(filteredTrades, initialCap), [filteredTrades, initialCap]);
  const rMultiples = useMemo(
    () => [...filteredTrades].sort((a, b) => (a.date < b.date ? -1 : 1)).map((t) => t.rMultiple),
    [filteredTrades]
  );

  // Top Winning Breakdowns
  const winningModels = useMemo(() => {
    return groupBy(filteredTrades, (t) => t.ictModel || t.setup || "Autre")
      .map((g) => ({ label: g.key, winRate: g.winRate, netPnl: g.net, rTotal: g.totalR, count: g.n }))
      .sort((a, b) => b.rTotal - a.rTotal);
  }, [filteredTrades]);

  const winningPois = useMemo(() => {
    return groupBy(filteredTrades, (t) => t.poiZone || "Non spécifié")
      .map((g) => ({ label: g.key, winRate: g.winRate, netPnl: g.net, rTotal: g.totalR, count: g.n }))
      .sort((a, b) => b.rTotal - a.rTotal);
  }, [filteredTrades]);

  const winningSessions = useMemo(() => {
    return groupBy(filteredTrades, (t) => t.session)
      .map((g) => ({
        label: sessionLabel(d, g.key as Trade["session"]),
        winRate: g.winRate,
        netPnl: g.net,
        rTotal: g.totalR,
        count: g.n,
      }))
      .sort((a, b) => b.rTotal - a.rTotal);
  }, [filteredTrades, d]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-white">{d.evolutionPerformance}</h2>
        <p className="text-[13px] text-mut">{d.trackRecordSubtitle}</p>
      </div>

      {/* Filter Bar */}
      <div className="yj-card flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="yj-label">{d.account}</span>
            <select
              className="yj-select !w-44 !py-1.5 text-[12.5px]"
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
            >
              <option value="all">{d.allAccounts}</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="yj-label">{d.asset}</span>
            <select
              className="yj-select !w-36 !py-1.5 text-[12.5px]"
              value={selectedAsset}
              onChange={(e) => setSelectedAsset(e.target.value)}
            >
              <option value="all">{d.allAssets}</option>
              {assetsList.map((sym) => (
                <option key={sym} value={sym}>
                  {sym}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="yj-label">{d.period}</span>
            <select
              className="yj-select !w-36 !py-1.5 text-[12.5px]"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              <option value="all">{d.allPeriods}</option>
              <option value="this_month">{d.periodThisMonth}</option>
              <option value="30d">{d.period30d}</option>
              <option value="90d">{d.period90d}</option>
              <option value="2026">{d.period2026}</option>
            </select>
          </div>
        </div>

        {/* Filter Summary Strip */}
        <div className="flex items-center gap-2 text-[12px] text-mut">
          <span className="font-semibold text-white">
            {s.n} {d.selectedTrades}
          </span>
          <span>|</span>
          <span>
            {d.filteredPnl} :{" "}
            <b className={clsx("mono", s.net >= 0 ? "text-up" : "text-down")}>{fmtMoney(s.net, currency, lang)}</b>
          </span>
          <span>|</span>
          <span>
            {d.winRate} : <b className="mono text-white">{s.winRate.toFixed(1)}%</b>
          </span>
        </div>
      </div>

      {/* 10 Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label={d.initialBalance} value={fmtMoney(initialCap, currency, lang)} />
        <StatCard label={d.currentBalance} value={fmtMoney(currentCap, currency, lang)} />
        <StatCard
          label={d.netPnl}
          value={fmtMoney(s.net, currency, lang)}
          tone={s.net >= 0 ? "up" : "down"}
          sub={`${((s.net / (initialCap || 1)) * 100).toFixed(2)}%`}
        />
        <StatCard label={d.returnRTotal} value={fmtR(s.totalR)} tone={s.totalR >= 0 ? "up" : "down"} />
        <StatCard label={d.winRate} value={`${s.winRate.toFixed(1)}%`} sub={`${s.wins}W / ${s.losses}L`} />
        <StatCard label={d.profitFactor} value={s.pf === Infinity ? "∞" : s.pf.toFixed(2)} tone="gold" />
        <StatCard label={d.drawdownMax} value={fmtR(-s.maxDdR)} tone="down" sub="Pic-creux" />
        <StatCard label={d.drawdownAvg} value={fmtR(-s.avgDdR)} tone="down" sub="Moyenne" />
        <StatCard label={d.expectancy} value={fmtR(s.expectancy)} tone={s.expectancy >= 0 ? "up" : "down"} />
        <StatCard label={d.closedTrades} value={String(s.n)} sub={`${s.be} Breakeven`} />
      </div>

      {/* Main Charts with X and Y axes */}
      <div className="yj-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-white">{d.equityCurve}</h3>
          <span className="mono text-[12px] text-mut">
            Min: {fmtMoney(Math.min(...eqData.map((e) => e.value), initialCap), currency, lang)} · Max:{" "}
            {fmtMoney(Math.max(...eqData.map((e) => e.value), initialCap), currency, lang)}
          </span>
        </div>
        <EquityChart data={eqData} xLabel={d.date} yLabel="Capital / Solde ($)" currency={currency === "EUR" ? "€" : "$"} />
      </div>

      <div className="yj-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-white">{d.pnlByTradeR}</h3>
          <span className="mono text-[12px] text-mut">
            Avg: {fmtR(s.avgR)} · Best: +{s.best > 0 ? (s.best / 1000).toFixed(1) + "k$" : "0$"}
          </span>
        </div>
        <RBarChart values={rMultiples} xLabel="Numéro du Trade" yLabel="Return R" />
      </div>

      {/* 3 Winning Breakdowns */}
      <div className="grid gap-5 md:grid-cols-3">
        <WinningBreakdownCard title={d.winningModels} items={winningModels} currency={currency} lang={lang} />
        <WinningBreakdownCard title={d.winningPoiZones} items={winningPois} currency={currency} lang={lang} />
        <WinningBreakdownCard title={d.winningSessions} items={winningSessions} currency={currency} lang={lang} />
      </div>
    </div>
  );
}

// =========================================================================
// TAB 3: Journal & Saisie
// =========================================================================
export function JournalTradesTab({
  d,
  lang,
  trades,
  accounts,
  onNewTrade,
  onEditTrade,
  onDeleteTrade,
  onViewTrade,
}: CommonProps & {
  onNewTrade: () => void;
  onEditTrade: (t: Trade) => void;
  onDeleteTrade: (t: Trade) => void;
  onViewTrade: (t: Trade) => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  const stats = useMemo(() => computeStats(trades), [trades]);

  const filtered = useMemo(() => {
    return trades
      .filter((t) => {
        if (selectedYear && !t.date.startsWith(`${selectedYear}-`)) return false;
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          t.symbol.toLowerCase().includes(q) ||
          t.setup.toLowerCase().includes(q) ||
          t.ictModel.toLowerCase().includes(q) ||
          t.poiZone.toLowerCase().includes(q) ||
          t.tradingType.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [trades, search, selectedYear]);

  const accName = (id: string) => accounts.find((a) => a.id === id)?.name ?? "—";
  const accCurrency = (id: string) => accounts.find((a) => a.id === id)?.currency ?? "USD";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-extrabold tracking-tight text-white">{d.tradingJournalTitle}</h2>
            <select
              className="yj-select !w-28 !py-1 text-[13px] font-bold"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
            </select>
          </div>
          <p className="text-[13px] text-mut">{d.subtitle}</p>
        </div>

        <button className="yj-btn yj-btn-primary !py-2.5" onClick={onNewTrade}>
          <Plus size={16} />
          {d.newTrade}
        </button>
      </div>

      {/* Quick Summary Strip */}
      <div className="yj-card grid grid-cols-2 gap-3 p-4 sm:grid-cols-6 text-[13px]">
        <div>
          <span className="yj-label block">{d.totalTrades}</span>
          <span className="mono text-lg font-bold text-white">{stats.n}</span>
        </div>
        <div>
          <span className="yj-label block">{d.wins}</span>
          <span className="mono text-lg font-bold text-up">{stats.wins}</span>
        </div>
        <div>
          <span className="yj-label block">{d.losses}</span>
          <span className="mono text-lg font-bold text-down">{stats.losses}</span>
        </div>
        <div>
          <span className="yj-label block">{d.winRate}</span>
          <span className="mono text-lg font-bold text-white">{stats.winRate.toFixed(1)}%</span>
        </div>
        <div>
          <span className="yj-label block">{d.pnlTotal}</span>
          <span className={clsx("mono text-lg font-bold", stats.net >= 0 ? "text-up" : "text-down")}>
            {fmtMoney(stats.net, "USD", lang)}
          </span>
        </div>
        <div>
          <span className="yj-label block">{d.returnR}</span>
          <span className={clsx("mono text-lg font-bold", stats.totalR >= 0 ? "text-up" : "text-down")}>
            {fmtR(stats.totalR)}
          </span>
        </div>
      </div>

      {/* Trades Table Card */}
      <div className="yj-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <input
            className="yj-input !w-72 !py-2 text-[13px]"
            placeholder={d.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="text-[12px] text-mut font-medium">
            {filtered.length} {d.totalTrades} affichés
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line p-12 text-center">
            <p className="text-[15px] font-bold text-white">{d.noTradesRecorded}</p>
            <p className="mt-1 text-[12.5px] text-mut">{d.noTradesRecordedHint}</p>
            <button className="yj-btn yj-btn-primary mt-4" onClick={onNewTrade}>
              <Plus size={15} />
              {d.newTrade}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="yj-table w-full">
              <thead>
                <tr>
                  <th>{d.date}</th>
                  <th>{d.pairOrAsset}</th>
                  <th>{d.direction}</th>
                  <th>{d.session}</th>
                  <th>{d.ictModel}</th>
                  <th>{d.poiZone}</th>
                  <th>{d.tradingType}</th>
                  <th>{d.account}</th>
                  <th className="!text-right">{d.risk}</th>
                  <th className="!text-right">{d.returnR}</th>
                  <th className="!text-right">{d.pnl}</th>
                  <th className="!text-right">{d.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="cursor-pointer transition hover:bg-gold/[0.04]">
                    <td className="mono text-mut" onClick={() => onViewTrade(t)}>
                      {t.date}
                    </td>
                    <td className="font-bold text-white" onClick={() => onViewTrade(t)}>
                      {t.symbol}
                    </td>
                    <td onClick={() => onViewTrade(t)}>
                      <span className={clsx("yj-badge", t.direction === "long" ? "yj-badge-up" : "yj-badge-down")}>
                        {t.direction === "long" ? "BUY" : "SELL"}
                      </span>
                    </td>
                    <td className="text-mut capitalize" onClick={() => onViewTrade(t)}>
                      {sessionLabel(d, t.session)}
                    </td>
                    <td className="text-white font-medium" onClick={() => onViewTrade(t)}>
                      {t.ictModel || t.setup || "—"}
                    </td>
                    <td className="text-gold font-medium" onClick={() => onViewTrade(t)}>
                      {t.poiZone || "—"}
                    </td>
                    <td className="text-mut" onClick={() => onViewTrade(t)}>
                      {t.tradingType}
                    </td>
                    <td className="text-mut font-medium" onClick={() => onViewTrade(t)}>
                      {accName(t.accountId)}
                    </td>
                    <td className="mono text-right text-mut" onClick={() => onViewTrade(t)}>
                      {t.riskPct}%
                    </td>
                    <td
                      className={clsx("mono text-right font-bold", t.rMultiple >= 0 ? "text-up" : "text-down")}
                      onClick={() => onViewTrade(t)}
                    >
                      {fmtR(t.rMultiple)}
                    </td>
                    <td
                      className={clsx("mono text-right font-bold", t.pnl >= 0 ? "text-up" : "text-down")}
                      onClick={() => onViewTrade(t)}
                    >
                      {fmtMoney(t.pnl, accCurrency(t.accountId), lang)}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="rounded-lg p-1.5 text-mut hover:bg-white/5 hover:text-white"
                          title={d.tradeDetails}
                          onClick={() => onViewTrade(t)}
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          className="rounded-lg p-1.5 text-mut hover:bg-white/5 hover:text-gold"
                          title={d.edit}
                          onClick={() => onEditTrade(t)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="rounded-lg p-1.5 text-mut hover:bg-white/5 hover:text-down"
                          title={d.delete}
                          onClick={() => onDeleteTrade(t)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// =========================================================================
// TAB 4: Analyse & Statistiques
// =========================================================================
export function AnalysisStatsTab({
  d,
  lang,
  trades,
  accounts,
  currency = "USD",
  onViewTrade,
}: CommonProps & {
  onViewTrade: (t: Trade) => void;
}) {
  const [filterAccount, setFilterAccount] = useState("all");
  const [filterAsset, setFilterAsset] = useState("all");
  const [filterSession, setFilterSession] = useState("all");
  const [filterDirection, setFilterDirection] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const [calendarYm, setCalendarYm] = useState(() => {
    const now = new Date();
    return { y: now.getFullYear(), m: now.getMonth() };
  });

  const [matrixYear, setMatrixYear] = useState<number>(2026);

  const assetsList = useMemo(() => Array.from(new Set(trades.map((t) => t.symbol))).sort(), [trades]);

  const filtered = useMemo(() => {
    return trades.filter((t) => {
      if (filterAccount !== "all" && t.accountId !== filterAccount) return false;
      if (filterAsset !== "all" && t.symbol !== filterAsset) return false;
      if (filterSession !== "all" && t.session !== filterSession) return false;
      if (filterDirection !== "all" && t.direction !== filterDirection) return false;
      if (filterType !== "all" && t.tradingType !== filterType) return false;
      return true;
    });
  }, [trades, filterAccount, filterAsset, filterSession, filterDirection, filterType]);

  const s = useMemo(() => computeStats(filtered), [filtered]);

  // Breakdown tables
  const byAsset = useMemo(
    () => groupBy(filtered, (t) => t.symbol).sort((a, b) => b.net - a.net),
    [filtered]
  );
  const bySession = useMemo(
    () =>
      groupBy(filtered, (t) => t.session).map((g) => ({
        ...g,
        displayLabel: sessionLabel(d, g.key as Trade["session"]),
      })),
    [filtered, d]
  );
  const byDirection = useMemo(
    () =>
      groupBy(filtered, (t) => t.direction).map((g) => ({
        ...g,
        displayLabel: g.key === "long" ? d.long : d.short,
      })),
    [filtered, d]
  );
  const byTradingType = useMemo(
    () => groupBy(filtered, (t) => t.tradingType).sort((a, b) => b.net - a.net),
    [filtered]
  );
  const byIctModel = useMemo(
    () => groupBy(filtered, (t) => t.ictModel || t.setup || "Autre").sort((a, b) => b.net - a.net),
    [filtered]
  );
  const byStructure = useMemo(
    () => groupBy(filtered, (t) => t.marketStructure || "Non défini").sort((a, b) => b.net - a.net),
    [filtered]
  );

  // Calendar calculation mode ($ amount or % percentage)
  const [weekCalcMode, setWeekCalcMode] = useState<"amount" | "percent">(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("tj-calendar-calc-mode");
        if (saved === "amount" || saved === "percent") return saved;
      } catch {}
    }
    return "amount";
  });

  const changeWeekCalcMode = (mode: "amount" | "percent") => {
    setWeekCalcMode(mode);
    try {
      localStorage.setItem("tj-calendar-calc-mode", mode);
    } catch {}
  };

  const baseCapital = useMemo(() => {
    if (filterAccount !== "all") {
      const acc = accounts.find((a) => a.id === filterAccount);
      return acc && acc.initialBalance > 0 ? acc.initialBalance : 10000;
    }
    const total = accounts.reduce((sum, a) => sum + a.initialBalance, 0);
    return total > 0 ? total : 10000;
  }, [accounts, filterAccount]);

  // Calendar logic
  const now = new Date();
  const firstOfMonth = new Date(calendarYm.y, calendarYm.m, 1);
  const dayOffset = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(calendarYm.y, calendarYm.m + 1, 0).getDate();
  const monthKey = `${calendarYm.y}-${String(calendarYm.m + 1).padStart(2, "0")}`;

  const monthTrades = useMemo(() => filtered.filter((t) => t.date.startsWith(monthKey)), [filtered, monthKey]);
  const monthStats = useMemo(() => computeStats(monthTrades), [monthTrades]);
  const monthPct = baseCapital > 0 ? (monthStats.net / baseCapital) * 100 : 0;

  const byDayMap = useMemo(() => {
    const map = new Map<string, { pnl: number; count: number; trades: Trade[] }>();
    for (const t of monthTrades) {
      const existing = map.get(t.date) ?? { pnl: 0, count: 0, trades: [] };
      existing.pnl += t.pnl;
      existing.count += 1;
      existing.trades.push(t);
      map.set(t.date, existing);
    }
    return map;
  }, [monthTrades]);

  type CalendarDayInfo = {
    dayNum: number;
    dateStr: string;
    pnl: number;
    count: number;
    trades: Trade[];
  };

  type CalendarWeek = {
    weekIndex: number;
    days: (CalendarDayInfo | null)[];
    totalPnl: number;
    totalTrades: number;
    winCount: number;
    lossCount: number;
    pct: number;
  };

  const calendarWeeks = useMemo(() => {
    const weeks: CalendarWeek[] = [];
    let currentDays: (CalendarDayInfo | null)[] = [];

    // 1. Padding days before 1st of month
    for (let i = 0; i < dayOffset; i++) {
      currentDays.push(null);
    }

    // 2. Days of month
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const dateStr = `${monthKey}-${String(dayNum).padStart(2, "0")}`;
      const dayData = byDayMap.get(dateStr);
      currentDays.push({
        dayNum,
        dateStr,
        pnl: dayData ? dayData.pnl : 0,
        count: dayData ? dayData.count : 0,
        trades: dayData ? dayData.trades : [],
      });

      if (currentDays.length === 7) {
        const totalPnl = currentDays.reduce((sum, d) => sum + (d ? d.pnl : 0), 0);
        const totalTrades = currentDays.reduce((sum, d) => sum + (d ? d.count : 0), 0);
        const winCount = currentDays.reduce(
          (sum, d) => sum + (d ? d.trades.filter((t) => t.pnl > 0).length : 0),
          0
        );
        const lossCount = currentDays.reduce(
          (sum, d) => sum + (d ? d.trades.filter((t) => t.pnl < 0).length : 0),
          0
        );
        const pct = baseCapital > 0 ? (totalPnl / baseCapital) * 100 : 0;

        weeks.push({
          weekIndex: weeks.length + 1,
          days: currentDays,
          totalPnl,
          totalTrades,
          winCount,
          lossCount,
          pct,
        });
        currentDays = [];
      }
    }

    // 3. Padding days after end of month
    if (currentDays.length > 0) {
      while (currentDays.length < 7) {
        currentDays.push(null);
      }
      const totalPnl = currentDays.reduce((sum, d) => sum + (d ? d.pnl : 0), 0);
      const totalTrades = currentDays.reduce((sum, d) => sum + (d ? d.count : 0), 0);
      const winCount = currentDays.reduce(
        (sum, d) => sum + (d ? d.trades.filter((t) => t.pnl > 0).length : 0),
        0
      );
      const lossCount = currentDays.reduce(
        (sum, d) => sum + (d ? d.trades.filter((t) => t.pnl < 0).length : 0),
        0
      );
      const pct = baseCapital > 0 ? (totalPnl / baseCapital) * 100 : 0;

      weeks.push({
        weekIndex: weeks.length + 1,
        days: currentDays,
        totalPnl,
        totalTrades,
        winCount,
        lossCount,
        pct,
      });
    }

    return weeks;
  }, [byDayMap, dayOffset, daysInMonth, monthKey, baseCapital]);

  // Annual matrix
  const matrix = useMemo(() => computeAnnualMonthlyMatrix(trades, matrixYear), [trades, matrixYear]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-white">{d.analysisStats}</h2>
        <p className="text-[13px] text-mut">{d.analysisSubtitle}</p>
      </div>

      {/* Multi-Filter Bar */}
      <div className="yj-card flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="yj-label">{d.account}</span>
            <select
              className="yj-select !w-36 !py-1.5 text-[12px]"
              value={filterAccount}
              onChange={(e) => setFilterAccount(e.target.value)}
            >
              <option value="all">{d.all}</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="yj-label">{d.asset}</span>
            <select
              className="yj-select !w-32 !py-1.5 text-[12px]"
              value={filterAsset}
              onChange={(e) => setFilterAsset(e.target.value)}
            >
              <option value="all">{d.all}</option>
              {assetsList.map((sym) => (
                <option key={sym} value={sym}>
                  {sym}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="yj-label">{d.session}</span>
            <select
              className="yj-select !w-32 !py-1.5 text-[12px]"
              value={filterSession}
              onChange={(e) => setFilterSession(e.target.value)}
            >
              <option value="all">{d.all}</option>
              <option value="asia">{d.sessionAsia}</option>
              <option value="london">{d.sessionLondon}</option>
              <option value="newyork">{d.sessionNY}</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="yj-label">{d.direction}</span>
            <select
              className="yj-select !w-28 !py-1.5 text-[12px]"
              value={filterDirection}
              onChange={(e) => setFilterDirection(e.target.value)}
            >
              <option value="all">{d.all}</option>
              <option value="long">Buy</option>
              <option value="short">Sell</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="yj-label">{d.tradingType}</span>
            <select
              className="yj-select !w-32 !py-1.5 text-[12px]"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">{d.all}</option>
              <option value="Day Trade">Day Trade</option>
              <option value="Scalp">Scalp</option>
              <option value="Swing">Swing</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[12px] text-mut">
          <span className="font-semibold text-white">
            {s.n} {d.totalTrades}
          </span>
          <span>|</span>
          <span>
            PnL : <b className={clsx("mono", s.net >= 0 ? "text-up" : "text-down")}>{fmtMoney(s.net, "USD", lang)}</b>
          </span>
          <span>|</span>
          <span>
            Winrate : <b className="mono text-white">{s.winRate.toFixed(1)}%</b>
          </span>
        </div>
      </div>

      {/* 6 Key Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label={d.reliability} value={`${s.winRate.toFixed(1)}%`} sub={`${s.n} trades`} />
        <StatCard label={d.cumulatedReturnR} value={fmtR(s.totalR)} tone={s.totalR >= 0 ? "up" : "down"} sub="Cumulé" />
        <StatCard
          label={d.expectancyPerTrade}
          value={fmtR(s.expectancy)}
          tone={s.expectancy >= 0 ? "up" : "down"}
          sub="Par trade"
        />
        <StatCard label={d.maxDrawdownPeakTrough} value={fmtR(-s.maxDdR)} tone="down" sub="Pic-creux" />
        <StatCard
          label={d.netProfitTotal}
          value={fmtMoney(s.net, "USD", lang)}
          tone={s.net >= 0 ? "up" : "down"}
          sub="Total"
        />
        <StatCard
          label={d.profitFactorGainLoss}
          value={s.pf === Infinity ? "∞" : s.pf.toFixed(2)}
          tone="gold"
          sub="Gain / Perte"
        />
      </div>

      {/* Portfolio Performance (3 widgets) */}
      <div className="yj-card p-6">
        <h3 className="mb-5 text-[15px] font-bold text-white">{d.portfolioPerformance}</h3>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-line bg-white/[0.02]">
            <WinRateGauge winRate={s.winRate} wins={s.wins} losses={s.losses} />
          </div>
          <div className="rounded-2xl border border-line bg-white/[0.02]">
            <ProfitLossCard gross={s.gross} grossLoss={s.grossLoss} net={s.net} currency="USD" lang={lang} />
          </div>
          <div className="rounded-2xl border border-line bg-white/[0.02]">
            <SharpeRatioGauge sharpe={s.sharpe} />
          </div>
        </div>
      </div>

      {/* Impact des news sur les performances Journal */}
      <NewsImpactPanel lang={lang} />

      {/* Performance par Critères (6 tables) */}
      <div>
        <h3 className="mb-4 text-[16px] font-extrabold text-white">{d.performanceByCriteria}</h3>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <CriteriaTable title={d.byAsset} rows={byAsset} labelKey="key" d={d} lang={lang} />
          <CriteriaTable title={d.bySession} rows={bySession} labelKey="displayLabel" d={d} lang={lang} />
          <CriteriaTable title={d.byDirection} rows={byDirection} labelKey="displayLabel" d={d} lang={lang} />
          <CriteriaTable title={d.byTradingType} rows={byTradingType} labelKey="key" d={d} lang={lang} />
          <CriteriaTable title={d.byIctModel} rows={byIctModel} labelKey="key" d={d} lang={lang} />
          <CriteriaTable title={d.byStructure} rows={byStructure} labelKey="key" d={d} lang={lang} />
        </div>
      </div>

      {/* Calendrier de Trading Mensuel */}
      <div className="yj-card p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-[16px] font-bold text-white">{d.tradingCalendar}</h3>
            <p className="text-[12.5px] text-mut mt-0.5">
              {monthStats.n} {d.closedTradesCount} —{" "}
              <b className={clsx("mono font-bold", monthStats.net >= 0 ? "text-up" : "text-down")}>
                {weekCalcMode === "amount"
                  ? fmtMoney(monthStats.net, currency, lang)
                  : `${monthStats.net >= 0 ? "+" : ""}${monthPct.toFixed(2)}%`}
              </b>
              <span className="mono text-[11px] opacity-75 ml-1.5">
                ({weekCalcMode === "amount"
                  ? `${monthStats.net >= 0 ? "+" : ""}${monthPct.toFixed(2)}%`
                  : fmtMoney(monthStats.net, currency, lang)})
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Options de calcul hebdomadaire : Montant ($) ou Pourcentage (%) */}
            <div className="flex items-center gap-1.5 rounded-xl border border-line bg-panel/80 p-1">
              <span className="text-[11px] font-semibold text-mut pl-1 hidden sm:inline">
                {d.calculationMode}
              </span>
              <button
                type="button"
                onClick={() => changeWeekCalcMode("amount")}
                className={clsx(
                  "flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11.5px] font-bold transition cursor-pointer",
                  weekCalcMode === "amount"
                    ? "bg-gold text-[#17130a] shadow-sm"
                    : "text-mut hover:text-white"
                )}
                title="Calculer les totaux en montant monétaire ($)"
              >
                <span>$</span>
                <span>{d.amountMode}</span>
              </button>
              <button
                type="button"
                onClick={() => changeWeekCalcMode("percent")}
                className={clsx(
                  "flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11.5px] font-bold transition cursor-pointer",
                  weekCalcMode === "percent"
                    ? "bg-gold text-[#17130a] shadow-sm"
                    : "text-mut hover:text-white"
                )}
                title="Calculer les totaux en pourcentage du capital (%)"
              >
                <span>%</span>
                <span>{d.percentMode}</span>
              </button>
            </div>

            {/* Navigation du mois */}
            <div className="flex items-center gap-2">
              <button
                className="yj-chip cursor-pointer"
                onClick={() =>
                  setCalendarYm((s) => (s.m === 0 ? { y: s.y - 1, m: 11 } : { ...s, m: s.m - 1 }))
                }
              >
                <ChevronLeft size={16} />
              </button>
              <span className="w-36 text-center text-[13.5px] font-bold text-white">
                {d.monthNames[calendarYm.m]} {calendarYm.y}
              </span>
              <button
                className="yj-chip cursor-pointer"
                onClick={() =>
                  setCalendarYm((s) => (s.m === 11 ? { y: s.y + 1, m: 0 } : { ...s, m: s.m + 1 }))
                }
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid (8 colonnes : 7 jours + Total Semaine) */}
        <div className="overflow-x-auto pb-1">
          <div className="min-w-[720px]">
            {/* Ligne d'en-tête des 8 colonnes */}
            <div className="grid grid-cols-8 gap-2 mb-2.5">
              {d.dayShort.map((dayName) => (
                <div key={dayName} className="yj-label text-center py-1.5 font-bold text-mut">
                  {dayName}
                </div>
              ))}
              <div className="yj-label text-center py-1.5 font-bold text-gold border-b border-gold/40">
                {d.weeklyTotal}
              </div>
            </div>

            {/* Semaines du mois */}
            <div className="space-y-2">
              {calendarWeeks.map((week) => (
                <div key={week.weekIndex} className="grid grid-cols-8 gap-2">
                  {/* Colonnes 1 à 7 : Jours du calendrier */}
                  {week.days.map((day, dayIdx) => {
                    if (!day) {
                      return (
                        <div
                          key={`empty-${week.weekIndex}-${dayIdx}`}
                          className="aspect-square sm:aspect-[4/3] rounded-xl border border-transparent bg-white/[0.005] opacity-20"
                        />
                      );
                    }
                    const isToday = day.dateStr === now.toISOString().slice(0, 10);
                    const hasTrades = day.count > 0;
                    const isWin = day.pnl >= 0;

                    return (
                      <div
                        key={day.dateStr}
                        onClick={() => {
                          if (hasTrades && day.trades[0]) onViewTrade(day.trades[0]);
                        }}
                        className={clsx(
                          "flex aspect-square sm:aspect-[4/3] flex-col justify-between rounded-xl border p-2 transition",
                          hasTrades
                            ? isWin
                              ? "border-up/40 bg-up/10 text-up hover:border-up hover:shadow-md cursor-pointer"
                              : "border-down/40 bg-down/10 text-down hover:border-down hover:shadow-md cursor-pointer"
                            : "border-line bg-white/[0.01] text-mut",
                          isToday && "ring-2 ring-gold"
                        )}
                        title={
                          hasTrades
                            ? `${day.dateStr} : ${day.count} trade(s), PnL : ${fmtMoney(day.pnl, currency, lang)} (${((day.pnl / baseCapital) * 100).toFixed(2)}%)`
                            : day.dateStr
                        }
                      >
                        <div className="flex items-center justify-between">
                          <span className="mono text-[11px] font-bold">{day.dayNum}</span>
                          {hasTrades && (
                            <span className="mono text-[10px] opacity-80">
                              {day.count} trd
                            </span>
                          )}
                        </div>
                        {hasTrades && (
                          <div className="text-right truncate">
                            <span className="mono text-[11px] sm:text-[12px] font-extrabold">
                              {weekCalcMode === "amount"
                                ? `${isWin ? "+" : ""}${Math.round(day.pnl)}$`
                                : `${isWin ? "+" : ""}${((day.pnl / baseCapital) * 100).toFixed(2)}%`}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* 8ème Colonne : Carte Total de la Semaine */}
                  <div
                    className={clsx(
                      "flex aspect-square sm:aspect-[4/3] flex-col justify-between rounded-xl border p-2.5 transition shadow-sm",
                      week.totalTrades > 0
                        ? week.totalPnl >= 0
                          ? "border-up/40 bg-gradient-to-br from-up/15 to-up/5 text-up"
                          : "border-down/40 bg-gradient-to-br from-down/15 to-down/5 text-down"
                        : "border-line bg-panel/50 text-mut opacity-60"
                    )}
                    title={
                      week.totalTrades > 0
                        ? `Semaine ${week.weekIndex} : ${week.totalTrades} trade(s), PnL : ${fmtMoney(week.totalPnl, currency, lang)} (${week.pct >= 0 ? "+" : ""}${week.pct.toFixed(2)}%)`
                        : `Semaine ${week.weekIndex} : Aucun trade`
                    }
                  >
                    <div className="flex items-center justify-between">
                      <span className="mono text-[10px] font-bold uppercase tracking-wider text-gold">
                        {d.weekLabel} {week.weekIndex}
                      </span>
                      {week.totalTrades > 0 && (
                        <span className="mono text-[10px] opacity-85">
                          {week.totalTrades} trd
                        </span>
                      )}
                    </div>

                    <div className="text-right truncate my-auto">
                      <p
                        className={clsx(
                          "mono text-[12.5px] sm:text-[14px] font-extrabold tracking-tight",
                          week.totalTrades > 0
                            ? week.totalPnl >= 0
                              ? "text-up"
                              : "text-down"
                            : "text-mut"
                        )}
                      >
                        {week.totalTrades === 0
                          ? "—"
                          : weekCalcMode === "amount"
                          ? `${week.totalPnl >= 0 ? "+" : ""}${fmtMoney(week.totalPnl, currency, lang)}`
                          : `${week.pct >= 0 ? "+" : ""}${week.pct.toFixed(2)}%`}
                      </p>
                      {week.totalTrades > 0 && (
                        <p className="mono text-[10px] opacity-75 font-semibold mt-0.5">
                          {weekCalcMode === "amount"
                            ? `${week.pct >= 0 ? "+" : ""}${week.pct.toFixed(2)}%`
                            : `${week.totalPnl >= 0 ? "+" : ""}${fmtMoney(week.totalPnl, currency, lang)}`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Barre de synthèse mensuelle au bas du calendrier */}
            <div className="mt-4 flex flex-wrap items-center justify-between border-t border-line/60 pt-3 text-[12px] text-mut">
              <div className="flex items-center gap-3">
                <span>{d.monthNames[calendarYm.m]} {calendarYm.y} :</span>
                <span className="font-semibold text-white">
                  {monthStats.n} {d.tradesCount}
                </span>
                <span>·</span>
                <span>
                  Winrate : <b className="mono text-white">{monthStats.winRate.toFixed(1)}%</b>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span>Total du Mois :</span>
                <span
                  className={clsx(
                    "mono font-extrabold text-[13px]",
                    monthStats.net >= 0 ? "text-up" : "text-down"
                  )}
                >
                  {weekCalcMode === "amount"
                    ? `${monthStats.net >= 0 ? "+" : ""}${fmtMoney(monthStats.net, currency, lang)}`
                    : `${monthStats.net >= 0 ? "+" : ""}${monthPct.toFixed(2)}%`}
                </span>
                <span className="mono text-[11px] opacity-75">
                  ({weekCalcMode === "amount"
                    ? `${monthStats.net >= 0 ? "+" : ""}${monthPct.toFixed(2)}%`
                    : fmtMoney(monthStats.net, currency, lang)})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bilan Mensuel & Annuel Matrix Table */}
      <div className="yj-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[16px] font-bold text-white">{d.monthlyAnnualSummary}</h3>
          <select
            className="yj-select !w-28 !py-1 text-[13px] font-bold"
            value={matrixYear}
            onChange={(e) => setMatrixYear(Number(e.target.value))}
          >
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
            <option value={2024}>2024</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="yj-table w-full text-center">
            <thead>
              <tr>
                <th className="!text-left">{d.metric}</th>
                {d.monthNamesShort.map((m) => (
                  <th key={m} className="!text-center">
                    {m}
                  </th>
                ))}
                <th className="!text-center !text-gold font-extrabold">{d.total}</th>
              </tr>
            </thead>
            <tbody>
              {/* Row 1: PnL ($) */}
              <tr>
                <td className="!text-left font-bold text-white">PnL ($)</td>
                {matrix.months.map((m) => (
                  <td
                    key={m.monthIdx}
                    className={clsx(
                      "mono font-bold text-[12px]",
                      m.hasData ? (m.pnl >= 0 ? "text-up" : "text-down") : "text-mut"
                    )}
                  >
                    {m.hasData ? `${m.pnl >= 0 ? "+" : ""}${Math.round(m.pnl)}$` : "—"}
                  </td>
                ))}
                <td
                  className={clsx(
                    "mono font-extrabold text-[13px]",
                    matrix.total.pnl >= 0 ? "text-up" : "text-down"
                  )}
                >
                  {matrix.total.pnl >= 0 ? "+" : ""}
                  {Math.round(matrix.total.pnl)}$
                </td>
              </tr>

              {/* Row 2: Trades / Win% */}
              <tr>
                <td className="!text-left font-bold text-white">Trades / Win%</td>
                {matrix.months.map((m) => (
                  <td key={m.monthIdx} className="mono text-[11px] text-mut">
                    {m.hasData ? `${m.tradesCount} / ${m.winRate.toFixed(0)}%` : "—"}
                  </td>
                ))}
                <td className="mono font-bold text-[12px] text-white">
                  {matrix.total.tradesCount} / {matrix.total.winRate.toFixed(0)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Helper criteria table component
function CriteriaTable<T extends { winRate: number; net: number; totalR: number; n: number }>({
  title,
  rows,
  labelKey,
  d,
  lang,
}: {
  title: string;
  rows: T[];
  labelKey: keyof T;
  d: Dict;
  lang: "fr" | "en";
}) {
  return (
    <div className="yj-card p-4">
      <h4 className="mb-3 text-[14px] font-bold text-white">{title}</h4>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-[12px] text-mut">{d.noData}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="yj-table w-full text-[12px]">
            <thead>
              <tr>
                <th>Item</th>
                <th className="!text-center">Trades</th>
                <th className="!text-center">Win%</th>
                <th className="!text-right">PnL</th>
                <th className="!text-right">R</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 7).map((r, i) => (
                <tr key={i}>
                  <td className="font-semibold text-white max-w-[110px] truncate">{String(r[labelKey])}</td>
                  <td className="mono !text-center text-mut">{r.n}</td>
                  <td className="mono !text-center font-bold text-white">{r.winRate.toFixed(0)}%</td>
                  <td className={clsx("mono !text-right font-bold", r.net >= 0 ? "text-up" : "text-down")}>
                    {r.net >= 0 ? "+" : ""}
                    {Math.round(r.net)}$
                  </td>
                  <td className={clsx("mono !text-right font-bold", r.totalR >= 0 ? "text-up" : "text-down")}>
                    {fmtR(r.totalR)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
