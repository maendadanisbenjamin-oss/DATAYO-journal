"use client";
import clsx from "clsx";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ShieldCheck,
  ChevronsLeft,
  ChevronsRight,
  LineChart,
  FlaskConical,
  LogOut,
  Menu,
  PieChart,
  Plus,
  RotateCcw,
  UserCheck,
  X,
} from "lucide-react";
import { useState } from "react";
import type { Dict } from "@/lib/i18n";
import type { Profile, Tab } from "@/lib/types";
import { Avatar } from "./ui";

export default function Sidebar({
  d,
  active,
  onChange,
  profile,
  onNewTrade,
  onLogout,
  collapsed,
  onToggle,
  live,
}: {
  d: Dict;
  active: Tab;
  onChange: (t: Tab) => void;
  profile: Profile;
  onNewTrade: () => void;
  onLogout: () => void;
  collapsed: boolean;
  onToggle: () => void;
  live: boolean;
}) {
  const [open, setOpen] = useState(false);

  const items: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "profile_accounts", label: d.profileAccounts, icon: <UserCheck size={18} /> },
    { id: "evolution_performance", label: d.evolutionPerformance, icon: <LineChart size={18} /> },
    { id: "journal_trades", label: d.journalTrades, icon: <BookOpen size={18} /> },
    { id: "analysis_stats", label: d.analysisStats, icon: <PieChart size={18} /> },
    { id: "market_replay", label: d.marketReplay, icon: <RotateCcw size={18} /> },
    { id: "backtesting", label: d.backtesting, icon: <FlaskConical size={18} /> },
    { id: "economic_calendar", label: d.economicCalendar, icon: <CalendarDays size={18} /> },
    ...(profile.role === "admin" ? [{ id: "admin" as Tab, label: d.administration, icon: <ShieldCheck size={18} /> }] : []),
  ];

  const logo = (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#f0d9a8] to-[#c9a557] text-[#17130a] shadow-[0_0_24px_-6px_rgba(216,181,109,0.6)]">
        <span className="font-extrabold text-[17px] font-sans">Y</span>
      </span>
      <div className="flex flex-col">
        <span className="text-[14.5px] font-extrabold tracking-tight text-white leading-none">Journal</span>
        <span className="text-[10px] uppercase tracking-widest text-gold font-bold mt-0.5">Trading Desk</span>
      </div>
    </div>
  );

  const nav = (
    <nav className="space-y-1.5 px-3">
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => {
            onChange(it.id);
            setOpen(false);
          }}
          className={clsx("yj-navitem", active === it.id && "active")}
        >
          {it.icon}
          <span className="truncate">{it.label}</span>
        </button>
      ))}
    </nav>
  );

  const user = (
    <div className="mx-3 rounded-2xl border border-line bg-white/[0.02] p-3">
      <div className="flex items-center gap-3">
        <Avatar name={profile.displayName} url={profile.avatarUrl} size={38} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-white">{profile.displayName}</p>
          <p className="flex items-center gap-1.5 text-[11px] text-mut">
            <span className={clsx("h-1.5 w-1.5 rounded-full", live ? "bg-up yj-live-dot" : "bg-mut")} />
            {live ? "En ligne" : "Hors ligne"}
          </p>
        </div>
        <button
          onClick={onLogout}
          title={d.logout}
          className="rounded-lg p-1.5 text-mut hover:bg-white/5 hover:text-down transition"
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col justify-between border-r border-line bg-sidebar/90 py-6 backdrop-blur-xl transition-transform duration-300 md:flex",
          collapsed && "md:-translate-x-full"
        )}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between px-5">
            {logo}
            <button
              onClick={onToggle}
              title={d.hideMenu}
              className="rounded-lg p-1.5 text-mut hover:bg-white/5 hover:text-gold transition"
            >
              <ChevronsLeft size={16} />
            </button>
          </div>
          <div className="px-4">
            <button onClick={onNewTrade} className="yj-btn yj-btn-primary w-full shadow-lg">
              <Plus size={16} />
              {d.newTrade}
            </button>
          </div>
          {nav}
        </div>
        {user}
      </aside>

      {/* Re-open floating button when collapsed */}
      <button
        onClick={onToggle}
        title={d.showMenu}
        className={clsx(
          "fixed left-4 top-5 z-50 hidden h-10 w-10 items-center justify-center rounded-xl border border-line bg-panel/90 text-mut shadow-xl backdrop-blur-xl transition-all duration-300 hover:border-gold/40 hover:text-gold md:flex",
          collapsed ? "translate-x-0 opacity-100 delay-150" : "pointer-events-none -translate-x-16 opacity-0"
        )}
      >
        <ChevronsRight size={17} />
      </button>

      {/* Mobile Top Bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-sidebar/92 px-4 py-3 backdrop-blur-xl md:hidden">
        {logo}
        <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-mut hover:text-white">
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile Drawer */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 md:hidden backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="flex h-full w-[280px] flex-col justify-between bg-sidebar py-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between px-5">
                {logo}
                <button onClick={() => setOpen(false)} className="text-mut hover:text-white">
                  <X size={20} />
                </button>
              </div>
              <div className="px-4">
                <button
                  onClick={() => {
                    onNewTrade();
                    setOpen(false);
                  }}
                  className="yj-btn yj-btn-primary w-full"
                >
                  <Plus size={16} />
                  {d.newTrade}
                </button>
              </div>
              {nav}
            </div>
            {user}
          </div>
        </div>
      )}
    </>
  );
}
