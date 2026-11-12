"use client";

import React from "react";
import { Mail } from "lucide-react";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { notify } from "@/shared/lib/notify";

interface EditProfileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fullName: string;
  phone: string;
  email?: string;
  onSave: (fullName: string, phone: string) => void;
}

export function EditProfileDrawer({
  open,
  onOpenChange,
  fullName: initialFullName,
  phone: initialPhone,
  email,
  onSave,
}: EditProfileDrawerProps) {
  const [fullName, setFullName] = React.useState(initialFullName);
  const [phone, setPhone] = React.useState(initialPhone);

  React.useEffect(() => {
    if (open) {
      setFullName(initialFullName);
      setPhone(initialPhone);
    }
  }, [open, initialFullName, initialPhone]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(fullName, phone);
    onOpenChange(false);
    notify.success("Perfil actualizado", "Los datos locales se guardaron.");
  };

  return (
    <ResponsiveDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Editar Perfil"
      description="Actualiza tu nombre y teléfono de contacto."
      size="sm"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="submit" form="edit-profile-form">
            Aceptar
          </Button>
        </div>
      }
    >
      <form id="edit-profile-form" onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
        <FormField label="Nombre completo">
          {(control) => (
            <Input
              {...control}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Tu nombre completo"
            />
          )}
        </FormField>

        <FormField label="Teléfono">
          {(control) => (
            <Input
              {...control}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+591 ..."
            />
          )}
        </FormField>

        <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground flex items-center gap-2">
          <Mail className="size-3.5 shrink-0" />
          <span>Correo asociado: {email || "No vinculado"}</span>
        </div>
      </form>
    </ResponsiveDrawer>
  );
}
