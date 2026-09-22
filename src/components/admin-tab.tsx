"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  Check,
  Database,
  RefreshCw,
  ServerCog,
  ShieldCheck,
  UserCheck,
  UserPlus,
  UserX,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Profile } from "@/lib/types";

type AdminSection =
  | "overview"
  | "users"
  | "registrations"
  | "sessions"
  | "maintenance";

type Overview = {
  users: number;
  admins: number;
  accounts: number;
  trades: number;
  pnl: number;
  sessions: number;
  pendingRegistrations: number;
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

type AccountStatus = "pending" | "active" | "rejected" | "suspended";

type AdminUser = {
  id: string;
  displayName: string;
  email: string;
  title: string;
  bio: string;
  memberSince: number;
  avatarUrl: string | null;
  role?: "admin" | "member";
  status?: AccountStatus;
  rejectionReason?: string | null;
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
  { id: "registrations", label: "Demandes d'inscription", icon: UserPlus },
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
        <Icon
          size={18}
          className={tone === "up" ? "text-emerald-300" : ""}
        />
      </div>
      <div className="mt-3 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("fr-FR");
}

function statusLabel(status?: AccountStatus) {
  switch (status) {
    case "pending":
      return "En attente";
    case "active":
      return "Actif";
    case "rejected":
      return "Refusé";
    case "suspended":
      return "Suspendu";
    default:
      return "—";
  }
}

function statusClass(status?: AccountStatus) {
  switch (status) {
    case "pending":
      return "border-amber-500/30 text-amber-300";
    case "active":
      return "border-emerald-500/30 text-emerald-300";
    case "rejected":
      return "border-red-500/30 text-red-300";
    case "suspended":
      return "border-orange-500/30 text-orange-300";
    default:
      return "border-white/10 opacity-60";
  }
}

export default function AdminTab({ profile }: AdminTabProps) {
  const [section, setSection] = useState<AdminSection>("overview");

  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const updateNow = () => setNow(Date.now());
    const timer = setTimeout(updateNow, 0);
    const interval = setInterval(updateNow, 30000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [registrationsLoading, setRegistrationsLoading] = useState(false);
  const [registrationsError, setRegistrationsError] = useState("");
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState("");

  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

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
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
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

  const loadRegistrations = useCallback(async () => {
    setRegistrationsLoading(true);
    setRegistrationsError("");

    try {
      const res = await fetch("/api/admin/users", {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(
          "Impossible de charger les demandes d'inscription.",
        );
      }

      setUsers((await res.json()) as AdminUser[]);
    } catch (err) {
      setRegistrationsError(
        err instanceof Error ? err.message : "Erreur inconnue.",
      );
    } finally {
      setRegistrationsLoading(false);
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

  const updateUserStatus = useCallback(
    async (
      id: string,
      action: "approve" | "reject" | "suspend" | "reactivate" | "promote" | "demote",
      reason = "",
    ) => {
      setActionId(id);
      setRegistrationsError("");
      setUsersError("");

      try {
        const res = await fetch("/api/admin/users", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id,
            action,
            rejectionReason: reason,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(
            data?.error ?? "Impossible de modifier le compte.",
          );
        }

        setRejectionReason("");
        await Promise.all([loadUsers(), loadOverview()]);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erreur inconnue.";

        setRegistrationsError(message);
        setUsersError(message);
      } finally {
        setActionId(null);
      }
    },
    [loadOverview, loadUsers],
  );

  const approveRegistration = useCallback(
    async (id: string) => {
      if (!window.confirm("Approuver cette demande d'inscription ?")) {
        return;
      }

      await updateUserStatus(id, "approve");
    },
    [updateUserStatus],
  );

  const rejectRegistration = useCallback(
    async (id: string) => {
      const reason = window.prompt(
        "Motif du refus (facultatif) :",
        rejectionReason,
      );

      if (reason === null) {
        return;
      }

      await updateUserStatus(id, "reject", reason.trim());
    },
    [rejectionReason, updateUserStatus],
  );

  const suspendUser = useCallback(
    async (user: AdminUser) => {
      if (
        !window.confirm(
          `Suspendre le compte de ${user.displayName} ? Toutes ses sessions seront révoquées.`,
        )
      ) {
        return;
      }

      await updateUserStatus(user.id, "suspend");
    },
    [updateUserStatus],
  );

  const reactivateUser = useCallback(
    async (user: AdminUser) => {
      if (
        !window.confirm(
          `Réactiver le compte de ${user.displayName} ?`,
        )
      ) {
        return;
      }

      await updateUserStatus(user.id, "reactivate");
    },
    [updateUserStatus],
  );

  const promoteUser = useCallback(
    async (user: AdminUser) => {
      if (
        !window.confirm(
          `Promouvoir ${user.displayName} au rôle d'administrateur ?`,
        )
      ) {
        return;
      }

      await updateUserStatus(user.id, "promote");
    },
    [updateUserStatus],
  );

  const demoteUser = useCallback(
    async (user: AdminUser) => {
      if (
        !window.confirm(
          `Révoquer les droits administrateur de ${user.displayName} ?`,
        )
      ) {
        return;
      }

      await updateUserStatus(user.id, "demote");
    },
    [updateUserStatus],
  );

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
      setTimeout(() => { void loadOverview(); }, 0);
    }
  }, [profile.role, loadOverview]);

  useEffect(() => {
    if (
      profile.role === "admin" &&
      (section === "users" || section === "registrations")
    ) {
      setTimeout(() => { void loadUsers(); }, 0);
    }
  }, [profile.role, section, loadUsers]);

  useEffect(() => {
    if (profile.role === "admin" && section === "sessions") {
      setTimeout(() => { void loadSessions(); }, 0);
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

  const pendingUsers = users.filter(
    (user) => user.status === "pending",
  );

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
                {item.id === "registrations" &&
                  (overview?.pendingRegistrations ?? 0) > 0 && (
                    <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] text-amber-300">
                      {overview?.pendingRegistrations}
                    </span>
                  )}
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
                <StatCard
                  label="Demandes en attente"
                  value={overview.pendingRegistrations}
                  icon={UserPlus}
                />
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
                    Comptes enregistrés et gestion de leurs accès.
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
                <table className="w-full min-w-[1200px] text-left text-sm">
                  <thead className="border-b border-white/10 text-xs uppercase tracking-wide opacity-60">
                    <tr>
                      <th className="px-5 py-4">Utilisateur</th>
                      <th className="px-5 py-4">Email</th>
                      <th className="px-5 py-4">Rôle</th>
                      <th className="px-5 py-4">Statut</th>
                      <th className="px-5 py-4">Membre depuis</th>
                      <th className="px-5 py-4">Créé le</th>
                      <th className="px-5 py-4">Action</th>
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
                          {user.role === "admin" ? "Administrateur" : "Membre"}
                        </td>                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs ${statusClass(
                              user.status,
                            )}`}
                          >
                            {statusLabel(user.status)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs opacity-70">
                          {user.memberSince || "—"}
                        </td>
                        <td className="px-5 py-4 text-xs opacity-70">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="px-5 py-4">
                          {user.role === "admin" ? (
                            user.id === profile.id ? (
                              <span className="text-xs opacity-50">
                                Compte administrateur actuel
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void demoteUser(user)}
                                disabled={actionId === user.id}
                                className="rounded-lg border border-red-500/20 px-3 py-1.5 text-xs text-red-300 hover:opacity-80 disabled:opacity-50"
                              >
                                Révoquer administrateur
                              </button>
                            )
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => void promoteUser(user)}
                                disabled={actionId === user.id}
                                className="rounded-lg border border-emerald-500/20 px-3 py-1.5 text-xs text-emerald-300 hover:opacity-80 disabled:opacity-50"
                              >
                                Promouvoir
                              </button>

                              {user.status === "active" ? (
                                <button
                                  type="button"
                                  onClick={() => void suspendUser(user)}
                                  disabled={actionId === user.id}
                                  className="rounded-lg border border-orange-500/20 px-3 py-1.5 text-xs text-orange-300 hover:opacity-80 disabled:opacity-50"
                                >
                                  Suspendre
                                </button>
                              ) : user.status === "suspended" ||
                                user.status === "rejected" ? (
                                <button
                                  type="button"
                                  onClick={() => void reactivateUser(user)}
                                  disabled={actionId === user.id}
                                  className="rounded-lg border border-emerald-500/20 px-3 py-1.5 text-xs text-emerald-300 hover:opacity-80 disabled:opacity-50"
                                >
                                  Réactiver
                                </button>
                              ) : user.status === "pending" ? (
                                <button
                                  type="button"
                                  onClick={() => setSection("registrations")}
                                  className="rounded-lg border border-amber-500/20 px-3 py-1.5 text-xs text-amber-300 hover:opacity-80"
                                >
                                  Examiner
                                </button>
                              ) : null}
                            </div>
                          )}
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

      {section === "registrations" && (
        <div className="space-y-4">
          <div className="yj-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <UserPlus size={22} />
                <div>
                  <h2 className="text-lg font-semibold">
                    Demandes d&apos;inscription
                  </h2>
                  <p className="mt-1 text-sm opacity-65">
                    Examinez les nouvelles demandes et décidez de leur accès
                    à DATAYO-journal.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void loadRegistrations()}
                disabled={registrationsLoading}
                className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm hover:opacity-80 disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={
                    registrationsLoading ? "animate-spin" : ""
                  }
                />
                Actualiser
              </button>
            </div>
          </div>

          {registrationsError && (
            <div className="yj-card border-red-500/30 p-4 text-sm text-red-300">
              {registrationsError}
            </div>
          )}

          {registrationsLoading && pendingUsers.length === 0 ? (
            <div className="yj-card p-6 text-sm opacity-70">
              Chargement des demandes...
            </div>
          ) : pendingUsers.length === 0 ? (
            <div className="yj-card p-6">
              <div className="flex items-center gap-3">
                <UserCheck size={20} className="text-emerald-300" />
                <div>
                  <div className="font-medium">
                    Aucune demande en attente
                  </div>
                  <div className="mt-1 text-sm opacity-60">
                    Toutes les demandes d&apos;inscription ont été traitées.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingUsers.map((user) => (
                <div key={user.id} className="yj-card p-5">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="font-semibold">
                          {user.displayName}
                        </h3>
                        <span className="rounded-full border border-amber-500/30 px-2.5 py-1 text-xs text-amber-300">
                          En attente
                        </span>
                      </div>

                      <div className="mt-2 text-sm opacity-70">
                        {user.email}
                      </div>

                      <div className="mt-2 text-xs opacity-50">
                        Demande créée le {formatDate(user.createdAt)}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void approveRegistration(user.id)}
                        disabled={actionId === user.id}
                        className="flex items-center gap-2 rounded-xl border border-emerald-500/30 px-4 py-2.5 text-sm text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
                      >
                        <Check size={16} />
                        Approuver
                      </button>

                      <button
                        type="button"
                        onClick={() => void rejectRegistration(user.id)}
                        disabled={actionId === user.id}
                        className="flex items-center gap-2 rounded-xl border border-red-500/30 px-4 py-2.5 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                      >
                        <UserX size={16} />
                        Refuser
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
            <StatCard
              label="Sessions"
              value={sessions.length}
              icon={ShieldCheck}
            />
            <StatCard
              label="Actives"
              value={
                sessions.filter(
                  (session) =>
                    new Date(session.expiresAt).getTime() > now,
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
                    new Date(session.expiresAt).getTime() <= now,
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
                        new Date(session.expiresAt).getTime() > now;

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
                          <td className="whitespace-nowrap px-5 py-4 text-xs opacity-70">
                            {formatDate(session.createdAt)}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-xs opacity-70">
                            {formatDate(session.lastSeenAt)}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-xs opacity-70">
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
                              onClick={() =>
                                void revokeSession(session.id)
                              }
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
                <div className="font-medium">
                  Maintenance de rétention
                </div>
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
                  className={
                    maintenanceLoading ? "animate-spin" : ""
                  }
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
