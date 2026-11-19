"use client";

import React, { useState } from "react";
import { FileEdit, Pencil } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Textarea } from "@/shared/ui/textarea";
import {
  appCardContentClassName,
  appCardHeaderClassName,
  appCardTitleClassName,
} from "@/shared/presentation/card-variants";
import { InvestmentsCard } from "../InvestmentsCard";

interface InvestmentNotesCardProps {
  notes?: string;
  /**
   * Persists the notes. Without it nothing can store them (the investment API has no notes field yet),
   * so the card renders read-only with an explicit notice instead of pretending to save.
   */
  onSaveNotes?: (notes: string) => Promise<void> | void;
}

export function InvestmentNotesCard({ notes = "", onSaveNotes }: InvestmentNotesCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(notes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!onSaveNotes) return;
    setSaving(true);
    setError("");
    try {
      await onSaveNotes(draft);
      setIsEditing(false);
    } catch (reason) {
      // Stay in edit mode with the typed text: nothing was saved.
      setError(reason instanceof Error ? reason.message : "No se pudieron guardar las notas.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <InvestmentsCard>
      <CardHeader className={`${appCardHeaderClassName} flex flex-row items-center justify-between space-y-0`}>
        <div className="flex items-center gap-2">
          <FileEdit className="w-4 h-4 text-purple-400" aria-hidden="true" />
          <CardTitle className={appCardTitleClassName}>Notas</CardTitle>
        </div>

        {onSaveNotes && !isEditing && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            title="Editar notas"
            aria-label="Editar notas"
            onClick={() => {
              setDraft(notes);
              setIsEditing(true);
            }}
          >
            <Pencil aria-hidden="true" />
          </Button>
        )}
      </CardHeader>

      <CardContent className={`${appCardContentClassName} flex flex-col gap-3`}>
        {!onSaveNotes ? (
          <p className="text-xs text-muted-foreground leading-relaxed bg-muted/30 p-3 rounded-xl border border-border/50">
            Las notas todavía no se guardan en tu cuenta. Esta función estará disponible próximamente.
          </p>
        ) : isEditing ? (
          <>
            <Textarea
              aria-label="Notas de la inversión"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              className="min-h-20 text-xs md:text-xs"
              placeholder="Escribe tu tesis o recordatorios de esta inversión..."
              autoFocus
            />
            {error && (
              <p role="alert" className="text-xs text-destructive">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="xs" disabled={saving} onClick={() => setIsEditing(false)}>
                Cancelar
              </Button>
              <Button type="button" size="xs" loading={saving} onClick={() => void handleSave()}>
                Guardar
              </Button>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground leading-relaxed bg-muted/30 p-3 rounded-xl border border-border/50">
            {notes || "Sin notas registradas. Tocá el lápiz para redactar tu tesis de inversión."}
          </p>
        )}
      </CardContent>
    </InvestmentsCard>
  );
}
