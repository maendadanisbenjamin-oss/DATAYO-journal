"use client";
import { useEffect, useState } from "react";
import clsx from "clsx";
import type { Dict } from "@/lib/i18n";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function zoned(tz: string, d: Date) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(d);
  const m: Record<string, string> = {};
  for (const p of parts) m[p.type] = p.value;
  return { day: DAYS.indexOf(m.weekday), h: Number(m.hour) % 24, m: Number(m.minute) };
}

const SESSIONS = [
  { abbr: "ASN", key: "sessionAsia", tz: "Asia/Tokyo", open: 9, close: 18 },
  { abbr: "LDN", key: "sessionLondon", tz: "Europe/London", open: 8, close: 17 },
  { abbr: "NYC", key: "sessionNY", tz: "America/New_York", open: 8, close: 17 },
] as const;

export default function MarketClock({ d, lang }: { d: Dict; lang: "fr" | "en" }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const initial = setTimeout(() => setNow(new Date()), 0);
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearTimeout(initial);
      clearInterval(id);
    };
  }, []);

  const cur = now ?? new Date(0);
  const et = zoned("America/New_York", cur);
  const marketOpen = !!now && ((et.day >= 1 && et.day <= 4) || (et.day === 5 && et.h < 17) || (et.day === 0 && et.h >= 17));
  const states = SESSIONS.map((s) => {
    const p = zoned(s.tz, cur);
    return { ...s, isOpen: !!now && p.day >= 1 && p.day <= 5 && p.h >= s.open && p.h < s.close, time: `${String(p.h).padStart(2, "0")}:${String(p.m).padStart(2, "0")}` };
  });
  const overlap = states[1].isOpen && states[2].isOpen;
  const clock = now ? now.toLocaleTimeString(lang === "fr" ? "fr-FR" : "en-GB", { hour12: false }) : "--:--:--";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-panel/60 px-4 py-2">
        <div>
          <p className="yj-label">{d.localTime}</p>
          <p className="yj-value text-[17px] font-semibold leading-tight text-white">{clock}</p>
        </div>
        <div className="h-8 w-px bg-line" />
        <span className={clsx("yj-badge", marketOpen ? "yj-badge-up" : "yj-badge-down")}>
          <span className={clsx("h-1.5 w-1.5 rounded-full bg-current", marketOpen && "yj-live-dot")} />
          {marketOpen ? d.marketOpen : d.marketClosed}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        {states.map((s) => (
          <div
            key={s.abbr}
            title={`${d[s.key]} Â· ${s.open}:00â€“${s.close}:00`}
            className={clsx(
              "flex items-center gap-2 rounded-xl border px-2.5 py-1.5 transition",
              s.isOpen ? "border-up/30 bg-up/[0.06]" : "border-line bg-panel/40 opacity-70"
            )}
          >
            <span className={clsx("h-1.5 w-1.5 rounded-full", s.isOpen ? "bg-up yj-live-dot" : "bg-mut")} />
            <span className={clsx("mono text-[11px] font-bold", s.isOpen ? "text-white" : "text-mut")}>{s.abbr}</span>
            <span className="mono text-[11px] text-mut">{now ? s.time : "--:--"}</span>
          </div>
        ))}
        {overlap && <span className="yj-badge yj-badge-gold">{d.overlap}</span>}
      </div>
    </div>
  );
}
