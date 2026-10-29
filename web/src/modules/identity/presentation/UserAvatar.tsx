"use client";

import React from "react";
import { UserDto, getUserDisplayName, getUserInitials } from "../domain/identity.types";

interface UserAvatarProps {
  user?: UserDto | null;
  size?: "sm" | "md";
}

export function UserAvatar({ user, size = "md" }: UserAvatarProps) {
  const displayName = getUserDisplayName(user);
  const initials = getUserInitials(user);
  const dim = size === "sm" ? "w-8 h-8 text-xs" : "w-9 h-9 text-xs";

  if (user?.pictureUrl) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={user.pictureUrl}
        alt={displayName}
        referrerPolicy="no-referrer"
        className={`${dim} rounded-full object-cover shrink-0 ring-1 ring-slate-200`}
      />
    );
  }

  return (
    <div
      className={`${dim} rounded-full bg-slate-900 text-white font-bold flex items-center justify-center shrink-0`}
    >
      {initials}
    </div>
  );
}
