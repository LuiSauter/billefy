"use client";

import React from "react";
import { User, Mail, Phone, Pencil, CheckCircle2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { UserAvatar } from "../UserAvatar";
import type { UserDto } from "../../domain/identity.types";

interface ProfileSectionCardProps {
  user?: UserDto | null;
  phone: string;
  onOpenEditProfile: () => void;
}

export function ProfileSectionCard({
  user,
  phone,
  onOpenEditProfile,
}: ProfileSectionCardProps) {
  const displayName = user?.fullName || "Luis Gabriel";
  const email = user?.email || "luis.gabriel@mywallet.app";

  return (
    <Card className="lg:col-span-6 p-5 flex flex-col justify-between gap-5 bg-card border-border">
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <User className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-foreground leading-none">
                Perfil de usuario
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Gestiona tu información personal y de contacto.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenEditProfile}
            className="h-8 text-xs font-bold gap-1.5 rounded-lg border-border"
          >
            <Pencil className="size-3" />
            <span>Editar</span>
          </Button>
        </div>

        <div className="flex items-center gap-3.5 mt-4 p-3 rounded-xl bg-muted/30 border border-border/50">
          <div className="relative">
            <UserAvatar user={user} size="md" />
            <span className="size-2.5 rounded-full bg-emerald-500 border-2 border-background absolute -bottom-0.5 -right-0.5" />
          </div>
          <div className="flex flex-col min-w-0">
            <strong className="text-sm font-bold text-foreground truncate">
              {displayName}
            </strong>
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 truncate mt-0.5">
              <Mail className="size-3 shrink-0" />
              <span>{email}</span>
            </span>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
              <Phone className="size-3 shrink-0" />
              <span>{phone}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50 text-[11px] text-muted-foreground flex items-center gap-2">
        <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
        <span>Cuenta vinculada y verificada</span>
      </div>
    </Card>
  );
}
