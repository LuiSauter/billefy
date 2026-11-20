"use client";

import React from "react";
import { Switch } from "@/shared/ui/switch";

interface SettingSwitchRowProps {
  label: React.ReactNode;
  description?: React.ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function SettingSwitchRow({
  label,
  description,
  checked,
  onCheckedChange,
  disabled = false,
}: SettingSwitchRowProps) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer select-none py-1.5">
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-semibold text-foreground">{label}</span>
        {description && (
          <span className="text-[11px] text-muted-foreground">{description}</span>
        )}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </label>
  );
}
