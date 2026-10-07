"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  metadata: string;
  readAt: string | null;
  createdAt: string;
};

type NotificationsBellProps = {
  refreshKey?: number;
};

export default function NotificationsBell({
  refreshKey = 0,
}: NotificationsBellProps) {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", {
        cache: "no-store",
      });

      if (!response.ok) return;

      const data = (await response.json()) as NotificationRow[];
      setItems(data);
    } catch {
      // Notification loading remains optional if the request fails.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [load, refreshKey]);

  const unreadCount = useMemo(
    () => items.filter((item) => !item.readAt).length,
    [items],
  );

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) return;

      setItems((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, readAt: new Date().toISOString() }
            : item,
        ),
      );
    } catch {
      // Local state remains unchanged if the request fails.
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        <span aria-hidden="true">&#x1F514;</span>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-gold px-1 text-center text-[10px] font-bold leading-5 text-on-gold">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-white/10 bg-panel shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <h2 className="text-sm font-semibold text-white">Notifications</h2>
            {unreadCount > 0 && (
              <span className="text-[11px] text-mut">
                {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <p className="px-4 py-6 text-center text-xs text-mut">
                Chargement...
              </p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-mut">
                Aucune notification
              </p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void markAsRead(item.id)}
                  className={`block w-full border-b border-white/5 px-4 py-3 text-left transition hover:bg-white/5 ${
                    item.readAt ? "opacity-70" : "bg-white/[0.03]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                        item.readAt ? "bg-white/20" : "bg-gold"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white">
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-mut">
                        {item.message}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
