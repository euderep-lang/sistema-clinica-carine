import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  APPOINTMENT_CANCEL_REASON_OTHER,
  APPOINTMENT_CANCEL_REASONS,
  resolveAppointmentCancelReason,
} from "@/lib/appointment-types";

type CancelContext = { cancelReason: string };

type PendingCancel = {
  patientName?: string | null;
  onConfirm: (ctx: CancelContext) => void | Promise<void>;
  onDismiss: () => void;
};

export function useAppointmentCancelConfirm() {
  const [pending, setPending] = useState<PendingCancel | null>(null);
  const [reasonPreset, setReasonPreset] = useState("");
  const [reasonCustom, setReasonCustom] = useState("");
  const dismissOnCloseRef = useRef(true);

  const resolvedReason = resolveAppointmentCancelReason(reasonPreset, reasonCustom);
  const showCustomReason = reasonPreset === APPOINTMENT_CANCEL_REASON_OTHER;

  useEffect(() => {
    if (!pending) {
      setReasonPreset("");
      setReasonCustom("");
    }
  }, [pending]);

  const requestStatusChange = useCallback(
    async <T,>(
      newStatus: string,
      apply: (ctx?: CancelContext) => T | Promise<T>,
      opts?: { patientName?: string | null },
    ): Promise<T | undefined> => {
      if (newStatus !== "cancelled") {
        return apply();
      }

      return new Promise<T | undefined>((resolve) => {
        dismissOnCloseRef.current = true;
        setPending({
          patientName: opts?.patientName,
          onConfirm: async (ctx) => {
            dismissOnCloseRef.current = false;
            setPending(null);
            resolve(await apply(ctx));
          },
          onDismiss: () => {
            setPending(null);
            resolve(undefined);
          },
        });
      });
    },
    [],
  );

  const handleConfirm = () => {
    if (!pending || !resolvedReason) return;
    void pending.onConfirm({ cancelReason: resolvedReason });
  };

  const cancelConfirmDialog = (
    <AlertDialog
      open={!!pending}
      onOpenChange={(open) => {
        if (!open && dismissOnCloseRef.current) pending?.onDismiss();
        dismissOnCloseRef.current = true;
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar agendamento?</AlertDialogTitle>
          <AlertDialogDescription>
            {pending?.patientName
              ? `Confirma o cancelamento da consulta de ${pending.patientName}? O horário será liberado na agenda.`
              : "Confirma o cancelamento deste agendamento? O horário será liberado na agenda."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Motivo do cancelamento</Label>
            <Select value={reasonPreset} onValueChange={setReasonPreset}>
              <SelectTrigger id="cancel-reason">
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {APPOINTMENT_CANCEL_REASONS.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showCustomReason && (
            <div className="space-y-2">
              <Label htmlFor="cancel-reason-custom">Descreva o motivo</Label>
              <Textarea
                id="cancel-reason-custom"
                value={reasonCustom}
                onChange={(e) => setReasonCustom(e.target.value)}
                placeholder="Informe o motivo do cancelamento…"
                rows={3}
              />
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Não, manter</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={!resolvedReason}
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
          >
            Sim, cancelar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { requestStatusChange, cancelConfirmDialog };
}
