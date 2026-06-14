import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PatientSessionsContent } from "@/components/professional/patient-sessions-content";

interface PatientSessionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName?: string;
}

export function PatientSessionsDialog({
  open,
  onOpenChange,
  patientId,
  patientName,
}: PatientSessionsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Sessões do paciente</DialogTitle>
          <DialogDescription>
            {patientName
              ? `Protocolos e sessões de ${patientName}`
              : "Sessões realizadas e pendentes"}
          </DialogDescription>
        </DialogHeader>
        <PatientSessionsContent
          patientId={patientId}
          patientName={patientName}
          active={open}
        />
      </DialogContent>
    </Dialog>
  );
}
