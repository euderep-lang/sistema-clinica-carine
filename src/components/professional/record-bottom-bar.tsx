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

export function RecordBottomBar({
  patientId,
  onSessionsClick,
  onPhotosExamsClick,
  onPhotosBeforeAfterClick,
  onPhotosCompareClick,
}: RecordBottomBarProps) {
  const navigate = useNavigate();
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

  const items: BarItem[] = [
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
        aria-label="Ações da consulta"
        className="flex shrink-0 items-center justify-center overflow-x-auto border-t bg-card px-3 py-2.5"
      >
        <div className="flex items-center gap-1 sm:gap-0">
          {items.map((item, index) => (
            <div key={item.key} className="flex items-center">
              {index > 0 && (
                <span className="mx-2 hidden text-border sm:inline" aria-hidden>
                  |
                </span>
              )}
              <button
                type="button"
                onClick={item.onClick}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                  "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  item.key === "modules" && "text-foreground",
                )}
              >
                <item.icon className={cn("size-4", item.iconClass)} strokeWidth={2} />
                <span className="whitespace-nowrap">{item.label}</span>
              </button>
            </div>
          ))}
        </div>
      </nav>

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
              const item = items.find((i) => i.key === mod.key);
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
