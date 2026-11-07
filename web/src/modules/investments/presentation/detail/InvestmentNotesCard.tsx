"use client";

import React, { useState } from "react";
import { FileEdit, Pencil, Check } from "lucide-react";

interface InvestmentNotesCardProps {
  initialNotes?: string;
  onSaveNotes?: (notes: string) => void;
}

export function InvestmentNotesCard({
  initialNotes = "",
  onSaveNotes,
}: InvestmentNotesCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(initialNotes);

  const handleSave = () => {
    setIsEditing(false);
    onSaveNotes?.(notes);
  };

  return (
    <div className="rounded-2xl bg-card border border-border/80 p-5 shadow-2xs flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileEdit className="w-4 h-4 text-purple-400" />
          <h3 className="text-base font-bold text-foreground tracking-tight">
            Notas
          </h3>
        </div>

        {isEditing ? (
          <button
            type="button"
            onClick={handleSave}
            className="h-7 px-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
          >
            <Check className="w-3 h-3" />
            <span>Guardar</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition cursor-pointer"
            title="Editar notas"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isEditing ? (
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full text-xs text-foreground bg-muted/60 border border-border/80 rounded-xl p-2.5 outline-none focus:border-purple-500 transition resize-none"
          placeholder="Escribe tu tesis o recordatorios de esta inversión..."
          autoFocus
        />
      ) : (
        <p className="text-xs text-muted-foreground leading-relaxed bg-muted/30 p-3 rounded-xl border border-border/50">
          {notes || "Sin notas registradas. Tocá el lápiz para redactar tu tesis de inversión."}
        </p>
      )}
    </div>
  );
}
