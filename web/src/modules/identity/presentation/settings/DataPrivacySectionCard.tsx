"use client";

import React from "react";
import { Database, Download, Upload, FileText, Trash2, ShieldAlert } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { SettingSwitchRow } from "./SettingSwitchRow";

interface DataPrivacySectionCardProps {
  autoBackup: boolean;
  onAutoBackupChange: (enabled: boolean) => void;
  onExportData: () => Promise<void>;
  onImportCsv?: () => void;
  onDownloadReport: () => void;
  onClearStorage: () => void;
  onOpenDeleteAccount: () => void;
}

export function DataPrivacySectionCard({
  autoBackup,
  onAutoBackupChange,
  onExportData,
  onImportCsv,
  onDownloadReport,
  onClearStorage,
  onOpenDeleteAccount,
}: DataPrivacySectionCardProps) {
  return (
    <Card className="lg:col-span-7 p-5 flex flex-col justify-between gap-4 bg-card border-border">
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <div className="size-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Database className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-foreground leading-none">
              Privacidad y datos
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Gestiona tus datos, exportaciones y respaldos.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-2 border-t border-border/60">
          {/* Exportar datos */}
          <div className="p-3 rounded-xl bg-muted/30 border border-border/50 flex flex-col justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Download className="size-3.5 text-primary" />
                Exportar datos
              </span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Descarga un respaldo JSON con tus movimientos y cuentas.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onExportData}
              className="w-full text-xs font-bold border-border"
            >
              Exportar JSON
            </Button>
          </div>

          {/* Importar CSV */}
          <div className="p-3 rounded-xl bg-muted/30 border border-border/50 flex flex-col justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Upload className="size-3.5 text-primary" />
                Importar CSV
              </span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Carga extractos bancarios o movimientos masivos.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onImportCsv}
              className="w-full text-xs font-bold border-border"
            >
              Importar CSV
            </Button>
          </div>

          {/* Respaldo automático */}
          <div className="sm:col-span-2 p-3 rounded-xl bg-muted/30 border border-border/50">
            <SettingSwitchRow
              label="Respaldo automático"
              description="Guarda una instantánea cifrada de tu configuración en almacenamiento local."
              checked={autoBackup}
              onCheckedChange={onAutoBackupChange}
            />
          </div>

          {/* Descargar reporte completo */}
          <div className="sm:col-span-2 flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-primary shrink-0" />
              <div>
                <span className="text-xs font-bold text-foreground block">
                  Descargar reporte completo
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Resumen de auditoría de tu cuenta en texto plano.
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDownloadReport}
              className="text-xs font-bold border-border shrink-0"
            >
              Descargar
            </Button>
          </div>
        </div>
      </div>

      {/* Zona de peligro */}
      <div className="pt-3 border-t border-destructive/20 flex flex-col sm:flex-row items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClearStorage}
          className="w-full sm:w-auto text-xs font-bold text-muted-foreground hover:text-foreground gap-1.5"
        >
          <Trash2 className="size-3.5" />
          <span>Borrar datos financieros</span>
        </Button>

        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={onOpenDeleteAccount}
          className="w-full sm:w-auto text-xs font-bold gap-1.5"
        >
          <ShieldAlert className="size-3.5" />
          <span>Eliminar cuenta</span>
        </Button>
      </div>
    </Card>
  );
}
