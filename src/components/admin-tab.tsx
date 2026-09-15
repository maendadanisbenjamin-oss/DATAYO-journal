"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  Database,
  MailPlus,
  RefreshCw,
  ServerCog,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Profile } from "@/lib/types";

type AdminSection =
  | "overview"
  | "users"
  | "invitations"
  | "sessions"
  | "maintenance";

type Overview = {
  users: number;
  admins: number;
  accounts: number;
  trades: number;
  pnl: number;
  sessions: number;
  pendingInvitations: number;
  instruments: number;
  imports: number;
  gaps: {
    total: number;
    detected: number;
    recovering: number;
    resolved: number;
  };
  economicEvents: number;
  replaySessions: number;
  backtests: number;
};

type AdminUser = {
  id: string;
  displayName: string;
  email: string;
  title: string;
  bio: string;
  memberSince: number;
  avatarUrl: string | null;
  role?: "admin" | "member";
  createdAt: string;
};

type AdminInvitation = {
  id: string;
  email: string;
  invitedBy: string;
  expiresAt: string;
  status: "pending" | "accepted" | "revoked";
  acceptedAt: string | null;
  createdAt: string;
};

type AdminSession = {
  id: string;
  profileId: string;
  displayName: string;
  email: string;
  device: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
};

type MaintenanceResult = {
  cutoff: string;
  candlesDeleted: number;
  eventsDeleted: number;
};

type AdminTabProps = {
  profile: Profile;
};

const sections: Array<{
  id: AdminSection;
  label: string;
  icon: LucideIcon;
}> = [
  { id: "overview", label: "Vue globale", icon: BarChart3 },
  { id: "users", label: "Utilisateurs", icon: Users },
  { id: "invitations", label: "Invitations", icon: MailPlus },
  { id: "sessions", label: "Sessions", icon: ShieldCheck },
  { id: "maintenance", label: "Maintenance", icon: ServerCog },
];

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "up";
}) {
  return (
    <div className="yj-card p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm opacity-65">{label}</span>
        <Icon size={18} className={tone === "up" ? "text-emerald-300" : ""} />
      </div>
      <div className="mt-3 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("fr-FR");
}

export default function AdminTab({ profile }: AdminTabProps) {
  const [section, setSection] = useState<AdminSection>("overview");

  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [invitations, setInvitations] = useState<AdminInvitation[]>([]);
  const [sessions, setSessions] = useState<AdminSession[]>([]);

  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [invitationsError, setInvitationsError] = useState("");
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState("");

  const [invitationEmail, setInvitationEmail] = useState("");
  const [invitationDays, setInvitationDays] = useState("14");
  const [invitationCode, setInvitationCode] = useState("");
  const [invitationMessage, setInvitationMessage] = useState("");

  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [maintenanceError, setMaintenanceError] = useState("");
  const [maintenanceResult, setMaintenanceResult] =
    useState<MaintenanceResult | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/overview", {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Impossible de charger la vue globale.");
      }

      setOverview((await res.json()) as Overview);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur inconnue.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError("");

    try {
      const res = await fetch("/api/admin/users", {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Impossible de charger les utilisateurs.");
      }

      setUsers((await res.json()) as AdminUser[]);
    } catch (err) {
      setUsersError(
        err instanceof Error ? err.message : "Erreur inconnue.",
      );
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const loadInvitations = useCallback(async () => {
    setInvitationsLoading(true);
    setInvitationsError("");

    try {
      const res = await fetch("/api/invitations", {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Impossible de charger les invitations.");
      }

      setInvitations((await res.json()) as AdminInvitation[]);
    } catch (err) {
      setInvitationsError(
        err instanceof Error ? err.message : "Erreur inconnue.",
      );
    } finally {
      setInvitationsLoading(false);
    }
  }, []);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    setSessionsError("");

    try {
      const res = await fetch("/api/admin/sessions", {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Impossible de charger les sessions.");
      }

      setSessions((await res.json()) as AdminSession[]);
    } catch (err) {
      setSessionsError(
        err instanceof Error ? err.message : "Erreur inconnue.",
      );
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const revokeSession = useCallback(
    async (id: string) => {
      if (!window.confirm("Révoquer cette session ?")) return;

      setSessionsError("");

      try {
        const res = await fetch("/api/admin/sessions", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(
            data?.error ?? "Impossible de révoquer la session.",
          );
        }

        await loadSessions();
      } catch (err) {
        setSessionsError(
          err instanceof Error
            ? err.message
            : "Une erreur est survenue.",
        );
      }
    },
    [loadSessions],
  );

  const createInvitation = useCallback(async () => {
    setInvitationMessage("");
    setInvitationsError("");
    setInvitationCode("");

    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: invitationEmail,
          expiresInDays: Number(invitationDays),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error ?? "Impossible de créer l'invitation.");
      }

      setInvitationCode(String(data.invitationCode ?? ""));
      setInvitationMessage(
        data.emailSent
          ? "Invitation cr\u00e9\u00e9e et envoy\u00e9e par e-mail."
          : "Invitation cr\u00e9\u00e9e, mais l'e-mail n'a pas pu \u00eatre envoy\u00e9. Le code doit \u00eatre transmis manuellement.",
      );
      setInvitationEmail("");
      await loadInvitations();
      await loadOverview();
    } catch (err) {
      setInvitationsError(
        err instanceof Error ? err.message : "Erreur inconnue.",
      );
    }
  }, [invitationDays, invitationEmail, loadInvitations, loadOverview]);

  const revokeInvitation = useCallback(
    async (id: string) => {
      try {
        const res = await fetch("/api/invitations", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(
            data?.error ?? "Impossible de révoquer l'invitation.",
          );
        }

        await loadInvitations();
        await loadOverview();
      } catch (err) {
        setInvitationsError(
          err instanceof Error ? err.message : "Erreur inconnue.",
        );
      }
    },
    [loadInvitations, loadOverview],
  );

  const runMaintenance = useCallback(async () => {
    if (
      !window.confirm(
        "Cette opération supprimera définitivement les données dépassant la rétention de 15 ans. Continuer ?",
      )
    ) {
      return;
    }

    setMaintenanceLoading(true);
    setMaintenanceError("");
    setMaintenanceResult(null);

    try {
      const res = await fetch("/api/market/maintenance", {
        method: "POST",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data?.error ?? "Impossible d'exécuter la maintenance.",
        );
      }

      setMaintenanceResult(data as MaintenanceResult);
      await loadOverview();
    } catch (err) {
      setMaintenanceError(
        err instanceof Error ? err.message : "Erreur inconnue.",
      );
    } finally {
      setMaintenanceLoading(false);
    }
  }, [loadOverview]);

  useEffect(() => {
    if (profile.role === "admin") {
      void loadOverview();
    }
  }, [profile.role, loadOverview]);

  useEffect(() => {
    if (profile.role === "admin" && section === "users") {
      void loadUsers();
    }
  }, [profile.role, section, loadUsers]);

  useEffect(() => {
    if (profile.role === "admin" && section === "invitations") {
      void loadInvitations();
    }
  }, [profile.role, section, loadInvitations]);

  useEffect(() => {
    if (profile.role === "admin" && section === "sessions") {
      void loadSessions();
    }
  }, [profile.role, section, loadSessions]);

  if (profile.role !== "admin") {
    return (
      <div className="yj-card p-6">
        <div className="flex items-center gap-3">
          <ShieldCheck size={22} />
          <div>
            <h2 className="text-lg font-semibold">Administration</h2>
            <p className="mt-1 text-sm opacity-65">
              Accès réservé à l&apos;administrateur.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="yj-card p-3">
        <div className="flex flex-wrap gap-2">
          {sections.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm transition-opacity ${
                  active
                    ? "bg-white/10"
                    : "opacity-65 hover:bg-white/5 hover:opacity-100"
                }`}
              >
                <Icon size={17} />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {section === "overview" && (
        <div className="space-y-4">
          <div className="yj-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <BarChart3 size={22} />
                <div>
                  <h2 className="text-lg font-semibold">Vue globale</h2>
                  <p className="mt-1 text-sm opacity-65">
                    Supervision générale de DATAYO-journal.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void loadOverview()}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm hover:opacity-80 disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={loading ? "animate-spin" : ""}
                />
                Actualiser
              </button>
            </div>
          </div>

          {error && (
            <div className="yj-card border-red-500/30 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {overview && (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label="Utilisateurs" value={overview.users} icon={Users} />
                <StatCard label="Administrateurs" value={overview.admins} icon={ShieldCheck} />
                <StatCard label="Comptes" value={overview.accounts} icon={Database} />
                <StatCard label="Trades" value={overview.trades} icon={Activity} />
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label="Sessions" value={overview.sessions} icon={ShieldCheck} />
                <StatCard label="Invitations en attente" value={overview.pendingInvitations} icon={MailPlus} />
                <StatCard label="Instruments" value={overview.instruments} icon={Database} />
                <StatCard label="Imports" value={overview.imports} icon={ServerCog} />
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label="Gaps détectés" value={overview.gaps.detected} icon={Database} />
                <StatCard label="Gaps en récupération" value={overview.gaps.recovering} icon={RefreshCw} />
                <StatCard label="Événements économiques" value={overview.economicEvents} icon={Activity} />
                <StatCard label="Backtests" value={overview.backtests} icon={BarChart3} />
              </div>

              <div className="yj-card p-5">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <div className="text-sm opacity-60">P&L global</div>
                    <div className="mt-1 text-xl font-semibold">
                      {overview.pnl.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm opacity-60">Sessions Replay</div>
                    <div className="mt-1 text-xl font-semibold">
                      {overview.replaySessions}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm opacity-60">Gaps résolus</div>
                    <div className="mt-1 text-xl font-semibold">
                      {overview.gaps.resolved}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {section === "users" && (
        <div className="space-y-4">
          <div className="yj-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Users size={22} />
                <div>
                  <h2 className="text-lg font-semibold">Utilisateurs</h2>
                  <p className="mt-1 text-sm opacity-65">
                    Comptes enregistrés sur la plateforme.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void loadUsers()}
                disabled={usersLoading}
                className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm hover:opacity-80 disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={usersLoading ? "animate-spin" : ""}
                />
                Actualiser
              </button>
            </div>
          </div>

          {usersError && (
            <div className="yj-card border-red-500/30 p-4 text-sm text-red-300">
              {usersError}
            </div>
          )}

          {usersLoading && users.length === 0 ? (
            <div className="yj-card p-6 text-sm opacity-70">
              Chargement des utilisateurs...
            </div>
          ) : users.length === 0 ? (
            <div className="yj-card p-6 text-sm opacity-70">
              Aucun utilisateur trouvé.
            </div>
          ) : (
            <div className="yj-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-left text-sm">
                  <thead className="border-b border-white/10 text-xs uppercase tracking-wide opacity-60">
                    <tr>
                      <th className="px-5 py-4">Utilisateur</th>
                      <th className="px-5 py-4">Email</th>
                      <th className="px-5 py-4">Rôle</th>
                      <th className="px-5 py-4">Titre</th>
                      <th className="px-5 py-4">Membre depuis</th>
                      <th className="px-5 py-4">Créé le</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr
                        key={user.id}
                        className="border-b border-white/5 last:border-0"
                      >
                        <td className="px-5 py-4 font-medium">
                          {user.displayName}
                        </td>
                        <td className="px-5 py-4 text-xs opacity-70">
                          {user.email}
                        </td>
                        <td className="px-5 py-4">
                          <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs">
                            {user.role ?? "member"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs opacity-70">
                          {user.title || "—"}
                        </td>
                        <td className="px-5 py-4 text-xs opacity-70">
                          {user.memberSince || "—"}
                        </td>
                        <td className="px-5 py-4 text-xs opacity-70">
                          {formatDate(user.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {section === "invitations" && (
        <div className="space-y-4">
          <div className="yj-card p-5">
            <div className="flex items-center gap-3">
              <MailPlus size={22} />
              <div>
                <h2 className="text-lg font-semibold">Invitations</h2>
                <p className="mt-1 text-sm opacity-65">
                  Générer et superviser les invitations d&apos;inscription.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-[1fr_180px_auto]">
              <input
                value={invitationEmail}
                onChange={(event) => setInvitationEmail(event.target.value)}
                type="email"
                placeholder="email@exemple.com"
                className="rounded-xl border border-white/10 bg-transparent px-4 py-3 text-sm outline-none"
              />

              <select
                value={invitationDays}
                onChange={(event) => setInvitationDays(event.target.value)}
                className="rounded-xl border border-white/10 bg-transparent px-4 py-3 text-sm outline-none"
              >
                <option value="1">1 jour</option>
                <option value="7">7 jours</option>
                <option value="14">14 jours</option>
                <option value="30">30 jours</option>
                <option value="60">60 jours</option>
                <option value="90">90 jours</option>
              </select>

              <button
                type="button"
                onClick={() => void createInvitation()}
                disabled={!invitationEmail || invitationsLoading}
                className="rounded-xl bg-white/10 px-5 py-3 text-sm font-medium hover:bg-white/15 disabled:opacity-40"
              >
                Générer
              </button>
            </div>

            {invitationMessage && (
              <div className="mt-4 rounded-xl border border-emerald-500/20 p-4 text-sm text-emerald-300">
                {invitationMessage}
              </div>
            )}

            {invitationCode && (
              <div className="mt-3 rounded-xl border border-white/10 p-4">
                <div className="text-xs uppercase tracking-wide opacity-50">
                  Code d&apos;invitation
                </div>
                <div className="mt-2 select-all font-mono text-lg tracking-widest">
                  {invitationCode}
                </div>
              </div>
            )}
          </div>

          {invitationsError && (
            <div className="yj-card border-red-500/30 p-4 text-sm text-red-300">
              {invitationsError}
            </div>
          )}

          <div className="yj-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h3 className="font-medium">Historique</h3>
              <button
                type="button"
                onClick={() => void loadInvitations()}
                disabled={invitationsLoading}
                className="rounded-lg border border-white/10 p-2 hover:opacity-80 disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={invitationsLoading ? "animate-spin" : ""}
                />
              </button>
            </div>

            {invitations.length === 0 ? (
              <div className="p-6 text-sm opacity-70">
                Aucune invitation trouvée.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="border-b border-white/10 text-xs uppercase tracking-wide opacity-60">
                    <tr>
                      <th className="px-5 py-4">Email</th>
                      <th className="px-5 py-4">Statut</th>
                      <th className="px-5 py-4">Expiration</th>
                      <th className="px-5 py-4">Créée le</th>
                      <th className="px-5 py-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invitations.map((invitation) => (
                      <tr
                        key={invitation.id}
                        className="border-b border-white/5 last:border-0"
                      >
                        <td className="px-5 py-4">{invitation.email}</td>
                        <td className="px-5 py-4">
                          <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs">
                            {invitation.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs opacity-70">
                          {formatDate(invitation.expiresAt)}
                        </td>
                        <td className="px-5 py-4 text-xs opacity-70">
                          {formatDate(invitation.createdAt)}
                        </td>
                        <td className="px-5 py-4">
                          {invitation.status === "pending" && (
                            <button
                              type="button"
                              onClick={() =>
                                void revokeInvitation(invitation.id)
                              }
                              className="rounded-lg border border-red-500/20 px-3 py-1.5 text-xs text-red-300 hover:opacity-80"
                            >
                              Révoquer
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {section === "sessions" && (
        <div className="space-y-4">
          <div className="yj-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <ShieldCheck size={22} />
                <div>
                  <h2 className="text-lg font-semibold">Sessions</h2>
                  <p className="mt-1 text-sm opacity-65">
                    Supervision des sessions actives et contrôle des accès.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void loadSessions()}
                disabled={sessionsLoading}
                className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm hover:opacity-80 disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={sessionsLoading ? "animate-spin" : ""}
                />
                Actualiser
              </button>
            </div>
          </div>

          {sessionsError && (
            <div className="yj-card border-red-500/30 p-4 text-sm text-red-300">
              {sessionsError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <StatCard label="Sessions" value={sessions.length} icon={ShieldCheck} />
            <StatCard
              label="Actives"
              value={
                sessions.filter(
                  (session) =>
                    new Date(session.expiresAt).getTime() > Date.now(),
                ).length
              }
              icon={Activity}
              tone="up"
            />
            <StatCard
              label="Expirées"
              value={
                sessions.filter(
                  (session) =>
                    new Date(session.expiresAt).getTime() <= Date.now(),
                ).length
              }
              icon={Database}
            />
          </div>

          {sessionsLoading && sessions.length === 0 ? (
            <div className="yj-card p-6 text-sm opacity-70">
              Chargement des sessions...
            </div>
          ) : sessions.length === 0 ? (
            <div className="yj-card p-6 text-sm opacity-70">
              Aucune session trouvée.
            </div>
          ) : (
            <div className="yj-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left text-sm">
                  <thead className="border-b border-white/10 text-xs uppercase tracking-wide opacity-60">
                    <tr>
                      <th className="px-5 py-4">Utilisateur</th>
                      <th className="px-5 py-4">Appareil</th>
                      <th className="px-5 py-4">Créée le</th>
                      <th className="px-5 py-4">Dernière activité</th>
                      <th className="px-5 py-4">Expiration</th>
                      <th className="px-5 py-4">Statut</th>
                      <th className="px-5 py-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session) => {
                      const active =
                        new Date(session.expiresAt).getTime() > Date.now();

                      return (
                        <tr
                          key={session.id}
                          className="border-b border-white/5 last:border-0"
                        >
                          <td className="px-5 py-4">
                            <div className="font-medium">
                              {session.displayName}
                            </div>
                            <div className="mt-1 text-xs opacity-55">
                              {session.email}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-xs opacity-75">
                            {session.device || "Appareil inconnu"}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-xs opacity-70">
                            {formatDate(session.createdAt)}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-xs opacity-70">
                            {formatDate(session.lastSeenAt)}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-xs opacity-70">
                            {formatDate(session.expiresAt)}
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${
                                active
                                  ? "border-emerald-500/30 text-emerald-300"
                                  : "border-white/10 opacity-60"
                              }`}
                            >
                              {active ? "Active" : "Expirée"}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <button
                              type="button"
                              onClick={() => void revokeSession(session.id)}
                              className="rounded-lg border border-red-500/20 px-3 py-1.5 text-xs text-red-300 hover:opacity-80"
                            >
                              Révoquer
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {section === "maintenance" && (
        <div className="space-y-4">
          <div className="yj-card p-5">
            <div className="flex items-center gap-3">
              <ServerCog size={22} />
              <div>
                <h2 className="text-lg font-semibold">Maintenance</h2>
                <p className="mt-1 text-sm opacity-65">
                  Entretien des données historiques et contrôle de la rétention.
                </p>
              </div>
            </div>
          </div>

          <div className="yj-card border-amber-500/20 p-5">
            <div className="text-sm font-medium text-amber-300">
              Politique de rétention
            </div>
            <p className="mt-2 text-sm opacity-75">
              DATAYO conserve une fenêtre glissante de{" "}
              <strong>15 ans</strong>. Les données antérieures à cette
              période sont supprimées lors de l&apos;exécution de la
              maintenance.
            </p>
            <p className="mt-3 text-sm opacity-65">
              Cette opération concerne les bougies M1 et les événements
              économiques. La suppression est définitive.
            </p>
          </div>

          {maintenanceError && (
            <div className="yj-card border-red-500/30 p-4 text-sm text-red-300">
              {maintenanceError}
            </div>
          )}

          <div className="yj-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="font-medium">Maintenance de rétention</div>
                <p className="mt-1 text-sm opacity-65">
                  Calcule la coupure à 15 ans et supprime les données
                  antérieures.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void runMaintenance()}
                disabled={maintenanceLoading}
                className="flex items-center gap-2 rounded-xl border border-red-500/30 px-4 py-2.5 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-50"
              >
                <ServerCog
                  size={17}
                  className={maintenanceLoading ? "animate-spin" : ""}
                />
                {maintenanceLoading
                  ? "Maintenance en cours..."
                  : "Exécuter la maintenance"}
              </button>
            </div>
          </div>

          {maintenanceResult && (
            <>
              <div className="yj-card p-5">
                <div className="text-sm opacity-60">
                  Dernière exécution
                </div>
                <div className="mt-2 text-sm">
                  Date de coupure :{" "}
                  <span className="font-mono">
                    {new Date(
                      maintenanceResult.cutoff,
                    ).toLocaleString("fr-FR")}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <StatCard
                  label="Bougies M1 supprimées"
                  value={maintenanceResult.candlesDeleted}
                  icon={Database}
                />
                <StatCard
                  label="Événements économiques supprimés"
                  value={maintenanceResult.eventsDeleted}
                  icon={Activity}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

