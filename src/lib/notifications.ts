import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications, profiles } from "@/db/schema";
import { publish } from "@/lib/realtime";

export async function notifyProfile(input: {
  profileId: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  await db.insert(notifications).values({
    profileId: input.profileId,
    type: input.type,
    title: input.title,
    message: input.message,
    metadata: JSON.stringify(input.metadata ?? {}),
  });
  await publish(input.profileId, "notifications");
}

export async function notifyAdminsOfRegistration(input: {
  profileId: string;
  displayName: string;
  email: string;
}) {
  const admins = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(
      and(
        eq(profiles.role, "admin"),
        eq(profiles.status, "active"),
      ),
    );

  if (!admins.length) return;

  await Promise.all(
    admins.map(async (admin) => {
      await notifyProfile({
        profileId: admin.id,
        type: "registration_pending",
        title: "Nouvelle demande d'inscription",
        message: `${input.displayName} (${input.email}) demande l'accès à DATAYO-journal.`,
        metadata: {
          profileId: input.profileId,
        },
      });
    }),
  );
}
