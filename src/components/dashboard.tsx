"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { type Lang, t as tr } from "@/lib/i18n";
import type { Account, AccountInput, Bootstrap, Profile, Tab, Trade, TradeAccount, TradeAccountInput, TradeInput } from "@/lib/types";
import AuthScreen from "./auth-screen";
import MarketClock from "./market-clock";
import { AccountModal, ProfileModal, TradeDetailModal, TradeModal } from "./modals";
import Sidebar from "./sidebar";
import {
  AnalysisStatsTab,
  EvolutionPerformanceTab,
  JournalTradesTab,
  ProfileAccountsTab,
} from "./tabs";
import { BacktestingTab, EconomicCalendarTab, MarketReplayTab } from "./market-tabs";
import AdminTab from "./admin-tab";
import { LangToggle, ThemeToggle, Toasts } from "./ui";

type Toast = { id: number; msg: string; kind: "ok" | "err" };

export default function Dashboard() {
  const [lang, setLang] = useState<Lang>("fr");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [tab, setTab] = useState<Tab>("profile_accounts");
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [tradeAccounts, setTradeAccounts] = useState<TradeAccount[]>([]);
  const [devMode, setDevMode] = useState(false);

  // Modals state
  const [tradeModal, setTradeModal] = useState<{ open: boolean; trade: Trade | null }>({
    open: false,
    trade: null,
  });
  const [detailModal, setDetailModal] = useState<{ open: boolean; trade: Trade | null }>({
    open: false,
    trade: null,
  });
  const [accountModal, setAccountModal] = useState<{ open: boolean; account: Account | null }>({
    open: false,
    account: null,
  });
  const [profileModal, setProfileModal] = useState(false);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [live, setLive] = useState(false);
  const d = tr(lang);

  const toast = useCallback((msg: string, kind: "ok" | "err" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((s) => [...s, { id, msg, kind }]);
    setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 2600);
  }, []);

  // Preferences restoration
  useEffect(() => {
    try {
      const l = localStorage.getItem("tj-lang") as Lang | null;
      if (l === "fr" || l === "en") setTimeout(() => setLang(l), 0);
      if (localStorage.getItem("tj-theme") === "light") setTimeout(() => setTheme("light"), 0);
      if (localStorage.getItem("tj-sidebar") === "1") setTimeout(() => setCollapsed(true), 0);
    } catch {}
  }, []);

  const changeLang = (l: Lang) => {
    setLang(l);
    localStorage.setItem("tj-lang", l);
  };

  const toggleTheme = () =>
    setTheme((th) => {
      const n = th === "dark" ? "light" : "dark";
      localStorage.setItem("tj-theme", n);
      if (n === "light") {
        document.documentElement.setAttribute("data-theme", "light");
      } else {
        document.documentElement.removeAttribute("data-theme");
      }
      return n;
    });

  const toggleMenu = () =>
    setCollapsed((c) => {
      localStorage.setItem("tj-sidebar", c ? "0" : "1");
      return !c;
    });

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const r = await fetch("/api/bootstrap", { cache: "no-store" });
        if (!r.ok) throw new Error("bootstrap");
        const j: Bootstrap = await r.json();
        setProfile(j.profile);
        setAccounts(j.accounts);
        setTrades(j.trades);
        setTradeAccounts(j.tradeAccounts);
        setDevMode(j.devMode);
        setError(null);
      } catch {
        if (!silent) setError(d.error);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [d.error]
  );

  useEffect(() => {
    setTimeout(() => { void load(); }, 0);
  }, [load]);

  // Realtime: SSE with browser auto-reconnect and polling fallback
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveRef = useRef(false);
  useEffect(() => {
    liveRef.current = live;
  }, [live]);
  const scheduleReload = useCallback(() => {
    if (reloadTimer.current) clearTimeout(reloadTimer.current);
    reloadTimer.current = setTimeout(() => load(true), 250);
  }, [load]);

  useEffect(() => {
    if (!profile) return;
    let es: EventSource | null = null;
    let closed = false;
    let retry: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (closed) return;
      try {
        es = new EventSource("/api/realtime");
        es.addEventListener("ready", () => {
          setLive(true);
          liveRef.current = true;
        });
        es.addEventListener("change", () => scheduleReload());
        es.onerror = () => {
          setLive(false);
          liveRef.current = false;
          if (es?.readyState === EventSource.CLOSED) {
            es.close();
            if (!closed) {
              retry = setTimeout(connect, 5000);
            }
          }
        };
      } catch {
        if (!closed) {
          retry = setTimeout(connect, 5000);
        }
      }
    };

    connect();
    const poll = setInterval(() => {
      if (!liveRef.current) load(true);
    }, 25000);

    return () => {
      closed = true;
      es?.close();
      if (retry) clearTimeout(retry);
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const api = async (url: string, method: string, body?: unknown) => {
    const r = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || d.error);
    return j;
  };

  const saveTrade = async (
  input: TradeInput,
  accountInputs: TradeAccountInput[],
  id?: string
) => {
    try {
      const row: Trade = id
        ? await api(`/api/trades/${id}`, "PATCH", {
            ...input,
            accountInputs,
          })
        : await api("/api/trades", "POST", {
            ...input,
            accountInputs,
          });
      setTrades((s) => (id ? s.map((x) => (x.id === id ? row : x)) : [...s, row]));
      await load(true);
      setTradeModal({ open: false, trade: null });
      toast(d.saved);
    } catch (e) {
      toast(e instanceof Error ? e.message : d.error, "err");
    }
  };

  const deleteTrade = async (tr_: Trade) => {
    if (!confirm(d.confirmDelete)) return;
    try {
      await api(`/api/trades/${tr_.id}`, "DELETE");
      setTrades((s) => s.filter((x) => x.id !== tr_.id));
      setTradeAccounts((s) => s.filter((x) => x.tradeId !== tr_.id));
      toast(d.deleted);
    } catch (e) {
      toast(e instanceof Error ? e.message : d.error, "err");
    }
  };

  const saveAccount = async (input: AccountInput, id?: string) => {
    try {
      const row: Account = id
        ? await api(`/api/accounts/${id}`, "PATCH", input)
        : await api("/api/accounts", "POST", input);
      setAccounts((s) => (id ? s.map((x) => (x.id === id ? row : x)) : [...s, row]));
      setAccountModal({ open: false, account: null });
      toast(d.saved);
    } catch (e) {
      toast(e instanceof Error ? e.message : d.error, "err");
    }
  };

  const deleteAccount = async (a: Account) => {
    if (!confirm(`${d.deleteAccountWarn} ${d.confirmDelete}`)) return;
    try {
      await api(`/api/accounts/${a.id}`, "DELETE");
      setAccounts((s) => s.filter((x) => x.id !== a.id));
      await load(true);
      toast(d.deleted);
    } catch (e) {
      toast(e instanceof Error ? e.message : d.error, "err");
    }
  };

  const saveProfile = async (patch: Record<string, unknown>) => {
    try {
      const p: Profile = await api("/api/profile", "PATCH", patch);
      setProfile(p);
      toast(d.saved);
      return true;
    } catch (e) {
      toast(e instanceof Error ? e.message : d.error, "err");
      return false;
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setProfile(null);
    setAccounts([]);
    setTrades([]);
    setTradeAccounts([]);
  };

  const onAuth = async (p: Profile) => {
    setProfile(p);
    await load(true);
  };

  const openNewTrade = () => {
    if (!accounts.length) {
      setTab("profile_accounts");
      toast(d.noAccounts, "err");
      return;
    }
    setTradeModal({ open: true, trade: null });
  };

  const currency = accounts[0]?.currency ?? "USD";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? d.goodMorning : hour < 18 ? d.goodAfternoon : d.goodEvening;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-down">{error}</p>
        <button className="yj-btn yj-btn-ghost" onClick={() => load()}>
          ↻
        </button>
      </div>
    );
  }

  if (!profile) {
    return (
      <>
        <div className="absolute right-5 top-5 z-10 flex gap-2">
          <LangToggle lang={lang} onChange={changeLang} />
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
        <AuthScreen d={d} devMode={devMode} onDone={onAuth} />
      </>
    );
  }

  const commonProps = { d, lang, trades, accounts, currency };

  return (
    <div className="min-h-screen">
      <Sidebar
        d={d}
        active={tab}
        onChange={setTab}
        profile={profile}
        onNewTrade={openNewTrade}
        onLogout={logout}
        collapsed={collapsed}
        onToggle={toggleMenu}
        live={live}
      />

      <main
        className={clsx(
          "min-w-0 px-4 pb-20 pt-6 transition-[margin] duration-300 sm:px-6 lg:px-10",
          collapsed ? "md:ml-0 md:pl-20" : "md:ml-[260px]"
        )}
      >
        {/* Global Header */}
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-extrabold tracking-tight text-white">
              {greeting}, {profile.displayName.split(" ")[0]} 👋
            </h1>
            <p className="text-[13px] text-mut">{d.dashboard} · {d.subtitle}</p>
            {devMode && <p className="mt-1 text-[11px] text-gold/80">{d.devMode}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <MarketClock d={d} lang={lang} />
            <LangToggle lang={lang} onChange={changeLang} />
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </header>

        {/* 4 Main Tabs Routing */}
        {tab === "profile_accounts" && (
          <ProfileAccountsTab
            d={d}
            lang={lang}
            profile={profile}
            accounts={accounts}
            trades={trades}
            onEditProfile={() => setProfileModal(true)}
            onNewAccount={() => setAccountModal({ open: true, account: null })}
            onEditAccount={(acc) => setAccountModal({ open: true, account: acc })}
            onDeleteAccount={deleteAccount}
          />
        )}

        {tab === "evolution_performance" && <EvolutionPerformanceTab {...commonProps} />}

        {tab === "journal_trades" && (
          <JournalTradesTab
            {...commonProps}
            onNewTrade={openNewTrade}
            onEditTrade={(tr_) => setTradeModal({ open: true, trade: tr_ })}
            onDeleteTrade={deleteTrade}
            onViewTrade={(tr_) => setDetailModal({ open: true, trade: tr_ })}
          />
        )}

        {tab === "analysis_stats" && (
          <AnalysisStatsTab
            {...commonProps}
            onViewTrade={(tr_) => setDetailModal({ open: true, trade: tr_ })}
          />
        )}

        {tab === "market_replay" && <MarketReplayTab d={d} lang={lang} accounts={accounts} />}

        {tab === "backtesting" && (
          <BacktestingTab d={d} lang={lang} accounts={accounts} liveTrades={trades} />
        )}

        {tab === "economic_calendar" && <EconomicCalendarTab d={d} lang={lang} />}
        {tab === "admin" && profile && <AdminTab profile={profile} />}

        <footer className="mt-14 border-t border-line pt-6 text-center text-[11.5px] text-mut">
          {d.appName} · {new Date().getFullYear()} · Tous droits réservés
        </footer>
      </main>

      {/* Trade Create/Edit Wizard Modal */}
      {tradeModal.open && (
        <TradeModal
          d={d}
          accounts={accounts}
          trade={tradeModal.trade}
          tradeAccounts={tradeAccounts}
          onClose={() => setTradeModal({ open: false, trade: null })}
          onSave={saveTrade}
        />
      )}

      {/* Trade Detail Modal */}
      {detailModal.open && detailModal.trade && (
        <TradeDetailModal
          trade={detailModal.trade}
          accounts={accounts}
          tradeAccounts={tradeAccounts}
          onClose={() => setDetailModal({ open: false, trade: null })}
          onEdit={() => {
            const tr_ = detailModal.trade;
            setDetailModal({ open: false, trade: null });
            if (tr_) setTradeModal({ open: true, trade: tr_ });
          }}
          d={d}
        />
      )}

      {/* Account Modal */}
      {accountModal.open && (
        <AccountModal
          d={d}
          account={accountModal.account}
          onClose={() => setAccountModal({ open: false, account: null })}
          onSave={saveAccount}
        />
      )}

      {/* Profile Modal */}
      {profileModal && (
        <ProfileModal
          d={d}
          profile={profile}
          onClose={() => setProfileModal(false)}
          onSave={saveProfile}
          toast={toast}
        />
      )}

      <Toasts items={toasts} />
    </div>
  );
}
