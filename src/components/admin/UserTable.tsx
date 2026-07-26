"use client";

import { useState, useTransition } from "react";
import { setUserRole, deleteUser } from "@/lib/actions/admin";

interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  createdAt: Date;
}

export default function UserTable({
  users,
  currentUserId,
}: {
  users: AdminUser[];
  currentUserId: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRoleToggle(user: AdminUser) {
    setError(null);
    const nextRole = user.role === "admin" ? "user" : "admin";
    startTransition(async () => {
      try {
        await setUserRole(user.id, nextRole);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update role.");
      }
    });
  }

  function handleDelete(user: AdminUser) {
    setError(null);
    if (!confirm(`Delete ${user.email ?? user.id}? This can't be undone.`)) return;
    startTransition(async () => {
      try {
        await deleteUser(user.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete user.");
      }
    });
  }

  return (
    <div className="bg-panel border border-border rounded-lg overflow-hidden">
      {error && (
        <div className="px-4 py-2 bg-signal-red/10 text-signal-red text-sm border-b border-border">
          {error}
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-muted border-b border-border">
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium">Joined</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {users.map((u) => (
            <tr key={u.id}>
              <td className="px-4 py-3 font-mono text-xs">{u.email ?? "—"}</td>
              <td className="px-4 py-3 text-muted">{u.name ?? "—"}</td>
              <td className="px-4 py-3">
                <span
                  className={`text-xs font-mono px-2 py-0.5 rounded ${
                    u.role === "admin"
                      ? "bg-signal-cyan/15 text-signal-cyan"
                      : "bg-panel-raised text-muted"
                  }`}
                >
                  {u.role}
                </span>
              </td>
              <td className="px-4 py-3 text-muted-2 font-mono text-xs">
                {new Date(u.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-right space-x-2">
                <button
                  disabled={isPending || u.id === currentUserId}
                  onClick={() => handleRoleToggle(u)}
                  className="text-xs font-mono px-2 py-1 rounded border border-border text-muted hover:text-fg hover:border-muted-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {u.role === "admin" ? "Revoke admin" : "Make admin"}
                </button>
                <button
                  disabled={isPending || u.id === currentUserId}
                  onClick={() => handleDelete(u)}
                  className="text-xs font-mono px-2 py-1 rounded border border-signal-red/40 text-signal-red hover:bg-signal-red/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
