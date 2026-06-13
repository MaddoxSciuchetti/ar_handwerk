"use client";

import type { ProfileUser } from "@/components/profile-menu";

type ProfileSettingsViewProps = {
  user: ProfileUser;
  email: string;
  onSignOut: () => void;
};

export function ProfileSettingsView({ user, email, onSignOut }: ProfileSettingsViewProps) {
  return (
    <div className="flex w-full max-w-5xl flex-col gap-3">
      <div>
        <h1 className="page-title">Profile</h1>
        <p className="page-desc">Your account details and session.</p>
      </div>

      <div className="widget-card flex flex-col gap-4 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-700 ring-1 ring-zinc-200/80">
            {user.initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-medium text-zinc-900">{user.name}</p>
            <p className="truncate text-[13px] text-zinc-500">{email}</p>
          </div>
        </div>

        <dl className="grid gap-3 border-t border-zinc-100 pt-4 sm:grid-cols-2">
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">Name</dt>
            <dd className="mt-0.5 text-[13px] text-zinc-800">{user.name}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">Email</dt>
            <dd className="mt-0.5 text-[13px] text-zinc-800">{email}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">Account</dt>
            <dd className="mt-0.5 text-[13px] text-zinc-800">{user.role}</dd>
          </div>
        </dl>

        <div className="border-t border-zinc-100 pt-4">
          <button
            type="button"
            onClick={onSignOut}
            className="btn-secondary focus-ring text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
