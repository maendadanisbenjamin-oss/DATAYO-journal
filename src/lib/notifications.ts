import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications, profiles } from "@/db/schema";
import { publish } from "@/lib/realtime";

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
      await db.insert(notifications).values({
        profileId: admin.id,
        type: "registration_pending",
        title: "Nouvelle demande d'inscription",
        message: `${input.displayName} (${input.email}) demande l'acces a DATAYO-journal.`,
        metadata: JSON.stringify({
          profileId: input.profileId,
        }),
      });

      await publish(admin.id, "notifications");
    }),
  );
}
