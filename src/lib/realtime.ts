import "server-only";
import { EventEmitter } from "node:events";
import { Client } from "pg";
import { pool } from "@/db";

export type RealtimeEvent = {
  type: "profile" | "accounts" | "trades" | "security";
  profileId: string;
  ts: number;
};

const CHANNEL = "tj_events";

type G = typeof globalThis & {
  __tjEmitter?: EventEmitter;
  __tjListener?: Promise<Client | null>;
};
const g = globalThis as G;

export function emitter() {
  if (!g.__tjEmitter) {
    g.__tjEmitter = new EventEmitter();
    g.__tjEmitter.setMaxListeners(0);
  }
  return g.__tjEmitter;
}

/** Ensures a single LISTEN connection per process, forwarding notifications to the emitter. */
export function ensureListener() {
  if (!g.__tjListener) {
    g.__tjListener = (async () => {
      try {
        const client = new Client({ connectionString: process.env.DATABASE_URL });
        await client.connect();
        await client.query(`LISTEN ${CHANNEL}`);
        client.on("notification", (msg) => {
          if (!msg.payload) return;
          try {
            const ev = JSON.parse(msg.payload) as RealtimeEvent;
            emitter().emit(ev.profileId, ev);
          } catch {}
        });
        client.on("error", () => {
          g.__tjListener = undefined;
        });
        client.on("end", () => {
          g.__tjListener = undefined;
        });
        return client;
      } catch {
        g.__tjListener = undefined;
        return null;
      }
    })();
  }
  return g.__tjListener;
}

export async function publish(profileId: string, type: RealtimeEvent["type"]) {
  const ev: RealtimeEvent = { type, profileId, ts: Date.now() };
  // Local delivery (same process) + cross-process via NOTIFY.
  emitter().emit(profileId, ev);
  try {
    await pool.query("select pg_notify($1, $2)", [CHANNEL, JSON.stringify(ev)]);
  } catch {}
}
