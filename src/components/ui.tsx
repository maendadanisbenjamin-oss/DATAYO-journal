"use client";
import { type ReactNode, useEffect, useId, useRef } from "react";
import clsx from "clsx";
import { Moon, Sun, X } from "lucide-react";
import type { Lang } from "@/lib/i18n";

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join("");
}

export function Avatar({ name, url, size = 36, className }: { name: string; url?: string | null; size?: number; className?: string }) {
  return (
    <div
      className={clsx("relative shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-[#00e5b7] via-[#00b8d9] to-[#087b96] font-bold text-[#06151b]", className)}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center">{initials(name || "?")}</span>
      )}
    </div>
  );
}

export function Modal({ title, onClose, closeLabel, children, footer, wide }: { title: string; onClose: () => void; closeLabel: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const dialogId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.querySelector<HTMLElement>("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])")?.focus();
    const h = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    window.addEventListener("keydown", h);
    return () => {
      window.removeEventListener("keydown", h);
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, []);
  return (
    <div className="yj-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogId}
        onKeyDown={(event) => {
          if (event.key !== "Tab" || !dialogRef.current) return;
          const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])")).filter((element) => element.offsetParent !== null);
          if (!focusable.length) { event.preventDefault(); return; }
          const first = focusable[0]!;
          const last = focusable[focusable.length - 1]!;
          if (event.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current.contains(document.activeElement))) {
            event.preventDefault();
            first.focus();
          }
        }}
        className={clsx("yj-modal", wide && "!max-w-3xl")}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h3 id={dialogId} className="text-[16px] font-bold text-white">{title}</h3>
          <button type="button" aria-label={closeLabel} onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-lg text-mut hover:bg-white/5 hover:text-white">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={clsx("block", className)}>
      <span className="yj-label mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

export function ThemeToggle({ theme, onToggle, label }: { theme: "dark" | "light"; onToggle: () => void; label: string }) {
  return (
    <button
      onClick={onToggle}
      type="button"
      aria-label={label}
      aria-pressed={theme === "light"}
      className="relative flex h-11 w-[68px] items-center rounded-full border border-line bg-white/[0.03] px-1 transition hover:border-gold/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
    >
      <span
        className={clsx(
          "flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#00e5b7] to-[#00b8d9] text-[#06151b] shadow transition-transform duration-300",
          theme === "light" ? "translate-x-[24px]" : "translate-x-0"
        )}
      >
        {theme === "light" ? <Sun size={13} /> : <Moon size={13} />}
      </span>
    </button>
  );
}

export function LangToggle({ lang, onChange, label }: { lang: Lang; onChange: (l: Lang) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex h-12 items-center rounded-full border border-line bg-white/[0.03] p-0.5 text-[11px] font-bold">
      {(["fr", "en"] as Lang[]).map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={lang === l}
          onClick={() => onChange(l)}
          className={clsx("h-full min-h-11 min-w-11 rounded-full px-2.5 uppercase transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold", lang === l ? "bg-gold text-on-gold" : "text-mut hover:text-white")}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function Toasts({ items }: { items: { id: number; msg: string; kind: "ok" | "err" }[] }) {
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={clsx(
            "rounded-xl border px-4 py-2.5 text-[13px] font-medium shadow-xl backdrop-blur",
            t.kind === "ok" ? "border-up/30 bg-panel text-up" : "border-down/30 bg-panel text-down"
          )}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}

export async function compressImage(file: File, maxSize = 256, quality = 0.85): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("not an image");
  const dataUrl: string = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", quality);
}
