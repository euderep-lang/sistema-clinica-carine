import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  CalendarCheck,
  Camera,
  Columns2,
  FilePenLine,
  Flag,
  FlaskConical,
  LayoutGrid,
  Salad,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { FinishConsultationDialog } from "@/components/professional/finish-consultation-dialog";
import { useClinicalTools } from "@/components/professional/use-clinical-tools";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface RecordBottomBarProps {
  patientId: string;
  patientName: string;
  onSessionsClick?: () => void;
  onPhotosExamsClick?: () => void;
  onPhotosBeforeAfterClick?: () => void;
  onPhotosCompareClick?: () => void;
}

type ItemKey = "finish" | "sessions" | "rx" | "nutro" | "modules" | "photos";

type BarItem = {
  key: ItemKey;
  label: string;
  icon: LucideIcon;
  iconClass: string;
  onClick: () => void;
};

const MODULES = [
  { id: "receituario", label: "Receituário", key: "rx" as const },
  { id: "nutrologia", label: "Nutrologia", key: "nutro" as const },
];

const ICON_STYLES: Record<ItemKey, string> = {
  finish: "text-emerald-600",
  sessions: "text-violet-600",
  rx: "text-primary",
  nutro: "text-lime-600",
  modules: "text-primary",
  photos: "text-rose-600",
};

const PHOTO_OPTIONS = [
  { id: "exams", label: "Exames", icon: FlaskConical, iconClass: "text-sky-600" },
  { id: "before_after", label: "Anexar Antes x Depois", icon: ArrowLeftRight, iconClass: "text-amber-600" },
  { id: "compare", label: "Comparação Antes x Depois", icon: Columns2, iconClass: "text-violet-600" },
] as const;

function BarButton({
  label,
  icon: Icon,
  iconClass,
  onClick,
  emphasized,
}: {
  label: string;
  icon: LucideIcon;
  iconClass: string;
  onClick: () => void;
  emphasized?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
        "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        emphasized && "text-foreground",
      )}
    >
      <Icon className={cn("size-4", iconClass)} strokeWidth={2} />
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

function BarDivider() {
  return (
    <span
      className="mx-1 hidden h-6 w-px shrink-0 bg-border sm:block"
      aria-hidden
    />
  );
}

export function RecordBottomBar({
  patientId,
  patientName,
  onSessionsClick,
  onPhotosExamsClick,
  onPhotosBeforeAfterClick,
  onPhotosCompareClick,
}: RecordBottomBarProps) {
  const navigate = useNavigate();
  const { barItems: clinicalItems, dialogs: clinicalDialogs } = useClinicalTools(
    patientId,
    patientName,
  );
  const [finishOpen, setFinishOpen] = useState(false);
  const [modulesOpen, setModulesOpen] = useState(false);
  const [photosOpen, setPhotosOpen] = useState(false);

  const openPhotoOption = (id: (typeof PHOTO_OPTIONS)[number]["id"]) => {
    setPhotosOpen(false);
    if (id === "exams") onPhotosExamsClick?.();
    if (id === "before_after") onPhotosBeforeAfterClick?.();
    if (id === "compare") onPhotosCompareClick?.();
  };

  const openPrescription = () => {
    navigate({
      to: "/professional/prescriptions/new",
      search: { patient_id: patientId },
    });
  };

  const openModule = (moduleId: string) => {
    if (moduleId === "receituario") {
      setModulesOpen(false);
      openPrescription();
      return;
    }
    toast.info("Módulo em desenvolvimento.");
  };

  const actionItems: BarItem[] = [
    {
      key: "finish",
      label: "Finalizar Consulta",
      icon: Flag,
      iconClass: ICON_STYLES.finish,
      onClick: () => setFinishOpen(true),
    },
    ...(onSessionsClick
      ? [
          {
            key: "sessions" as const,
            label: "Dar baixa em sessões",
            icon: CalendarCheck,
            iconClass: ICON_STYLES.sessions,
            onClick: onSessionsClick,
          },
        ]
      : []),
    {
      key: "rx",
      label: "Receituário",
      icon: FilePenLine,
      iconClass: ICON_STYLES.rx,
      onClick: openPrescription,
    },
    ...(onPhotosExamsClick || onPhotosBeforeAfterClick || onPhotosCompareClick
      ? [
          {
            key: "photos" as const,
            label: "Fotos",
            icon: Camera,
            iconClass: ICON_STYLES.photos,
            onClick: () => setPhotosOpen(true),
          },
        ]
      : []),
    {
      key: "nutro",
      label: "Nutrologia",
      icon: Salad,
      iconClass: ICON_STYLES.nutro,
      onClick: () => toast.info("Módulo de nutrologia em desenvolvimento."),
    },
    {
      key: "modules",
      label: "Todos os módulos",
      icon: LayoutGrid,
      iconClass: ICON_STYLES.modules,
      onClick: () => setModulesOpen(true),
    },
  ];

  return (
    <>
      <nav
        aria-label="Ferramentas e ações da consulta"
        className={cn(
          "sticky bottom-0 z-30 shrink-0 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/90",
          "shadow-[0_-4px_16px_rgba(0,0,0,0.06)]",
        )}
      >
        <div className="overflow-x-auto px-3 py-2.5">
          <div className="flex min-w-max items-center gap-0.5">
            {clinicalItems.map((item) => (
              <BarButton
                key={item.key}
                label={item.label}
                icon={item.icon}
                iconClass={item.iconClass}
                onClick={item.onClick}
              />
            ))}
            <BarDivider />
            {actionItems.map((item) => (
              <BarButton
                key={item.key}
                label={item.label}
                icon={item.icon}
                iconClass={item.iconClass}
                onClick={item.onClick}
                emphasized={item.key === "modules"}
              />
            ))}
          </div>
        </div>
      </nav>

      {clinicalDialogs}

      <FinishConsultationDialog
        open={finishOpen}
        onOpenChange={setFinishOpen}
        patientId={patientId}
      />

      <Sheet open={photosOpen} onOpenChange={setPhotosOpen}>
        <SheetContent side="bottom" className="rounded-t-xl pb-8">
          <SheetHeader>
            <SheetTitle>Fotos</SheetTitle>
            <SheetDescription>Escolha o tipo de foto que deseja anexar.</SheetDescription>
          </SheetHeader>
          <ul className="mt-4 divide-y rounded-lg border">
            {PHOTO_OPTIONS.map((option) => {
              const disabled =
                option.id === "exams"
                  ? !onPhotosExamsClick
                  : option.id === "before_after"
                    ? !onPhotosBeforeAfterClick
                    : !onPhotosCompareClick;
              if (disabled) return null;
              const Icon = option.icon;
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => openPhotoOption(option.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50"
                  >
                    <Icon className={cn("size-4 shrink-0", option.iconClass)} strokeWidth={2} />
                    <span className="font-medium">{option.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </SheetContent>
      </Sheet>

      <Sheet open={modulesOpen} onOpenChange={setModulesOpen}>
        <SheetContent side="bottom" className="rounded-t-xl pb-8">
          <SheetHeader>
            <SheetTitle>Módulos clínicos</SheetTitle>
            <SheetDescription>Selecione uma ferramenta para este atendimento.</SheetDescription>
          </SheetHeader>
          <ul className="mt-4 divide-y rounded-lg border">
            {MODULES.map((mod) => {
              const item = actionItems.find((i) => i.key === mod.key);
              if (!item) return null;
              const Icon = item.icon;
              return (
                <li key={mod.id}>
                  <button
                    type="button"
                    onClick={() => openModule(mod.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50"
                  >
                    <Icon className={cn("size-4 shrink-0", item.iconClass)} strokeWidth={2} />
                    <span className="font-medium">{mod.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
}
