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
  LogOut,
  Menu,
  PieChart,
  Plus,
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
    { id: "market", label: d.market, icon: <BarChart3 size={18} /> },
    { id: "economic_calendar", label: d.economicCalendar, icon: <CalendarDays size={18} /> },
    ...(profile.role === "admin" ? [{ id: "admin" as Tab, label: d.administration, icon: <ShieldCheck size={18} /> }] : []),
  ];

  const logo = (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#00e5b7]/40 bg-[#0b1520] shadow-[0_0_24px_-6px_rgba(0,229,183,0.6)]">
        <svg viewBox="0 0 48 48" className="h-7 w-7" aria-hidden="true">
          <defs><linearGradient id="datayo-mark" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#00e5b7" /><stop offset="1" stopColor="#00b8d9" /></linearGradient></defs>
          <path fill="url(#datayo-mark)" d="M8 5h20c10 0 17 7 17 17s-7 21-18 21H8l14-14h8c4 0 7-3 7-7s-3-7-7-7H8z" />
          <path fill="#0b1520" d="M8 21h19L8 40z" />
        </svg>
      </span>
      <div className="flex flex-col">
        <span className="text-[14.5px] font-extrabold tracking-[0.16em] text-white leading-none">DATAYO</span>
        <span className="text-[9px] uppercase tracking-[0.14em] text-gold font-bold mt-1">Analyse · Backtest · Trade</span>
      </div>
    </div>
  );

  const nav = (
    <nav className="space-y-1.5 px-3">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          aria-current={active === it.id ? "page" : undefined}
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
              type="button"
              onClick={onToggle}
              aria-label={d.hideMenu}
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
        type="button"
        aria-label={d.showMenu}
        className={clsx(
          "fixed left-4 top-5 z-50 hidden h-11 w-11 items-center justify-center rounded-xl border border-line bg-panel/90 text-mut shadow-xl backdrop-blur-xl transition-all duration-300 hover:border-gold/40 hover:text-gold md:flex",
          collapsed ? "translate-x-0 opacity-100 delay-150" : "pointer-events-none -translate-x-16 opacity-0"
        )}
      >
        <ChevronsRight size={17} />
      </button>

      {/* Mobile Top Bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-sidebar/92 px-4 py-3 backdrop-blur-xl md:hidden">
        {logo}
        <button type="button" aria-label={d.showMenu} onClick={() => setOpen(true)} className="flex h-11 w-11 items-center justify-center rounded-lg text-mut hover:text-white">
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
                <button type="button" aria-label={d.close} onClick={() => setOpen(false)} className="flex h-11 w-11 items-center justify-center text-mut hover:text-white">
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
