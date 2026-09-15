import { currentUser, demoProfile, devAutoLogin, isGuest } from "@/lib/auth";
import { emitter, ensureListener, type RealtimeEvent } from "@/lib/realtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  let u = await currentUser();
  if (!u && devAutoLogin() && !(await isGuest())) {
    const p = await demoProfile();
    u = { profile: p, sessionId: "" };
  }
  if (!u) return new Response("Unauthorized", { status: 401 });
  const profileId = u.profile.id;
  void ensureListener();

  const enc = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let handler: ((ev: RealtimeEvent) => void) | null = null;
  let lastTs = 0;

  const stream = new ReadableStream({
    start(controller) {
      const send = (s: string) => {
        try {
          controller.enqueue(enc.encode(s));
        } catch {}
      };
      send(`retry: 3000\nevent: ready\ndata: {}\n\n`);
      handler = (ev) => {
        if (ev.ts === lastTs) return; // dedupe local + NOTIFY delivery
        lastTs = ev.ts;
        send(`event: change\ndata: ${JSON.stringify(ev)}\n\n`);
      };
      emitter().on(profileId, handler);
      heartbeat = setInterval(() => send(`: ping ${Date.now()}\n\n`), 15000);
      let cleaned = false;
      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        if (heartbeat) {
          clearInterval(heartbeat);
          heartbeat = null;
        }
        if (handler) {
          emitter().off(profileId, handler);
          handler = null;
        }
        try {
          controller.close();
        } catch {}
      };
      req.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      if (heartbeat) {
        clearInterval(heartbeat);
        heartbeat = null;
      }
      if (handler) {
        emitter().off(profileId, handler);
        handler = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
