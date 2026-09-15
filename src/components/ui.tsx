"use client";
import { type ReactNode, useEffect } from "react";
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
      className={clsx("relative shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-[#efdcae] via-[#d8b56d] to-[#8a6c33] font-bold text-[#17130a]", className)}
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

export function Modal({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="yj-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={clsx("yj-modal", wide && "!max-w-3xl")}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h3 className="text-[16px] font-bold text-white">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-mut hover:bg-white/5 hover:text-white">
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

export function ThemeToggle({ theme, onToggle }: { theme: "dark" | "light"; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="relative flex h-8 w-[58px] items-center rounded-full border border-line bg-white/[0.03] px-1 transition hover:border-gold/50"
      title={theme === "dark" ? "Light" : "Dark"}
    >
      <span
        className={clsx(
          "flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#f0d9a8] to-[#c9a557] text-[#17130a] shadow transition-transform duration-300",
          theme === "light" ? "translate-x-[26px]" : "translate-x-0"
        )}
      >
        {theme === "light" ? <Sun size={13} /> : <Moon size={13} />}
      </span>
    </button>
  );
}

export function LangToggle({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  return (
    <div className="flex h-8 items-center rounded-full border border-line bg-white/[0.03] p-0.5 text-[11px] font-bold">
      {(["fr", "en"] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => onChange(l)}
          className={clsx("h-full rounded-full px-2.5 uppercase transition", lang === l ? "bg-gold text-[#17130a]" : "text-mut hover:text-white")}
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
