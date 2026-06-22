import { useCallback, useRef, useState } from "react";
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

type PendingCancel = {
  patientName?: string | null;
  onConfirm: () => void | Promise<void>;
  onDismiss: () => void;
};

export function useAppointmentCancelConfirm() {
  const [pending, setPending] = useState<PendingCancel | null>(null);
  const dismissOnCloseRef = useRef(true);

  const requestStatusChange = useCallback(
    async <T,>(
      newStatus: string,
      apply: () => T | Promise<T>,
      opts?: { patientName?: string | null },
    ): Promise<T | undefined> => {
      if (newStatus !== "cancelled") {
        return apply();
      }

      return new Promise<T | undefined>((resolve) => {
        dismissOnCloseRef.current = true;
        setPending({
          patientName: opts?.patientName,
          onConfirm: async () => {
            dismissOnCloseRef.current = false;
            setPending(null);
            resolve(await apply());
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
              ? `Confirma o cancelamento da consulta de ${pending.patientName}? Essa ação pode ser revertida alterando a situação depois.`
              : "Confirma o cancelamento deste agendamento? Essa ação pode ser revertida alterando a situação depois."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Não, manter</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => void pending?.onConfirm()}
          >
            Sim, cancelar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { requestStatusChange, cancelConfirmDialog };
}
