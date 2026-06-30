import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  CalendarCheck,
  Camera,
  ClipboardList,
  Columns2,
  DollarSign,
  FileCheck2,
  FilePenLine,
  FileText,
  Flag,
  FlaskConical,
  LayoutGrid,
  Receipt,
  Salad,
  type LucideIcon,
} from "lucide-react";
import { ClinicalDocumentDialog } from "@/components/professional/clinical-document-dialog";
import { FinishConsultationDialog } from "@/components/professional/finish-consultation-dialog";
import { useClinicalTools } from "@/components/professional/use-clinical-tools";
import type { ClinicalDocType } from "@/lib/clinical-document-pdf";
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

type ItemKey =
  | "finish"
  | "rx"
  | "financeiro"
  | "budget"
  | "exames"
  | "modules"
  | "sessions"
  | "nutro"
  | "photos";

type BarItem = {
  key: ItemKey;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  iconClass: string;
  onClick: () => void;
};

const ICON_STYLES: Record<ItemKey, string> = {
  finish: "text-emerald-600",
  rx: "text-primary",
  financeiro: "text-sky-600",
  budget: "text-amber-600",
  exames: "text-violet-600",
  modules: "text-primary",
  sessions: "text-teal-600",
  nutro: "text-lime-600",
  photos: "text-rose-600",
};

const CLINICAL_MODULES = [
  { id: "plano-alimentar", label: "Plano Terapêutico", icon: Salad, iconClass: ICON_STYLES.nutro },
] as const;

const PHOTO_OPTIONS = [
  { id: "exams", label: "Exames", icon: FlaskConical, iconClass: "text-sky-600" },
  { id: "before_after", label: "Fotos Antes x Depois", icon: ArrowLeftRight, iconClass: "text-amber-600" },
  { id: "compare", label: "Comparação Antes x Depois", icon: Columns2, iconClass: "text-violet-600" },
] as const;

function BarButton({
  label,
  shortLabel,
  icon: Icon,
  iconClass,
  onClick,
  emphasized,
  stacked,
}: {
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  iconClass: string;
  onClick: () => void;
  emphasized?: boolean;
  stacked?: boolean;
}) {
  const displayLabel = shortLabel ?? label;

  if (stacked) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex w-full min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-2.5 text-[11px] font-medium leading-tight transition-colors",
          "text-muted-foreground hover:bg-muted/60 hover:text-foreground active:bg-muted",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          emphasized && "bg-muted/40 text-foreground",
        )}
      >
        <Icon className={cn("size-5 shrink-0", iconClass)} strokeWidth={2} />
        <span className="w-full truncate text-center">{displayLabel}</span>
      </button>
    );
  }

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
  const [docType, setDocType] = useState<ClinicalDocType | null>(null);

  const openDoc = (type: ClinicalDocType) => {
    setModulesOpen(false);
    setDocType(type);
  };

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

  const openMealPlan = () => {
    navigate({
      to: "/professional/plano-alimentar",
      search: { patient_id: patientId },
    });
  };

  const openBudgetChat = () => {
    navigate({
      to: "/professional/orcamento",
      search: { patient_id: patientId },
    });
  };

  const openFinancial = () => {
    navigate({
      to: "/professional/patients/$id",
      params: { id: patientId },
      search: { tab: "financeiro" },
    });
  };

  const openModule = (moduleId: string) => {
    if (moduleId === "plano-alimentar") {
      setModulesOpen(false);
      openMealPlan();
    }
  };

  const actionItems: BarItem[] = [
    {
      key: "finish",
      label: "Finalizar Consulta",
      shortLabel: "Finalizar",
      icon: Flag,
      iconClass: ICON_STYLES.finish,
      onClick: () => setFinishOpen(true),
    },
    {
      key: "rx",
      label: "Receituário",
      icon: FilePenLine,
      iconClass: ICON_STYLES.rx,
      onClick: openPrescription,
    },
    {
      key: "financeiro",
      label: "Financeiro",
      icon: DollarSign,
      iconClass: ICON_STYLES.financeiro,
      onClick: openFinancial,
    },
    {
      key: "budget",
      label: "Orçamento",
      icon: Receipt,
      iconClass: ICON_STYLES.budget,
      onClick: openBudgetChat,
    },
    {
      key: "exames",
      label: "Solicitar pedido",
      shortLabel: "Pedido",
      icon: ClipboardList,
      iconClass: ICON_STYLES.exames,
      onClick: () => openDoc("exames"),
    },
    ...(onSessionsClick
      ? [
          {
            key: "sessions" as ItemKey,
            label: "Sessões",
            icon: CalendarCheck,
            iconClass: ICON_STYLES.sessions,
            onClick: () => onSessionsClick(),
          },
        ]
      : []),
    {
      key: "nutro",
      label: "Plano Terapêutico",
      shortLabel: "Plano",
      icon: Salad,
      iconClass: ICON_STYLES.nutro,
      onClick: openMealPlan,
    },
    {
      key: "modules",
      label: "Todos os módulos",
      shortLabel: "Módulos",
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
        <div className="grid grid-cols-4 gap-1 px-2 py-2 lg:hidden">
          {actionItems.map((item) => (
            <BarButton
              key={item.key}
              label={item.label}
              shortLabel={item.shortLabel}
              icon={item.icon}
              iconClass={item.iconClass}
              onClick={item.onClick}
              emphasized={item.key === "finish" || item.key === "modules"}
              stacked
            />
          ))}
        </div>
        <div className="hidden overflow-x-auto px-3 py-2.5 lg:block">
          <div className="mx-auto flex w-max max-w-full items-center justify-center gap-0.5">
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

      {docType && (
        <ClinicalDocumentDialog
          open={Boolean(docType)}
          onOpenChange={(o) => !o && setDocType(null)}
          docType={docType}
          patientId={patientId}
          patientName={patientName}
        />
      )}

      <Sheet open={photosOpen} onOpenChange={setPhotosOpen}>
        <SheetContent side="bottom" className="rounded-t-xl pb-8">
          <SheetHeader>
            <SheetTitle>Anexos</SheetTitle>
            <SheetDescription>Escolha o tipo de anexo que deseja adicionar.</SheetDescription>
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
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-xl pb-8">
          <SheetHeader>
            <SheetTitle>Todos os módulos</SheetTitle>
            <SheetDescription>
              Ferramentas clínicas e módulos de atendimento para {patientName}.
            </SheetDescription>
          </SheetHeader>

          <p className="mt-4 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Ferramentas
          </p>
          <ul className="mt-2 divide-y rounded-lg border">
            {clinicalItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => {
                      setModulesOpen(false);
                      item.onClick();
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50"
                  >
                    <Icon className={cn("size-4 shrink-0", item.iconClass)} strokeWidth={2} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <p className="mt-4 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Documentos
          </p>
          <ul className="mt-2 divide-y rounded-lg border">
            <li>
              <button
                type="button"
                onClick={() => openDoc("atestado")}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50"
              >
                <FileCheck2 className="size-4 shrink-0 text-emerald-600" strokeWidth={2} />
                <span className="font-medium">Atestado médico</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => openDoc("declaracao")}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50"
              >
                <FileText className="size-4 shrink-0 text-sky-600" strokeWidth={2} />
                <span className="font-medium">Declaração de comparecimento</span>
              </button>
            </li>
          </ul>

          <p className="mt-4 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Módulos clínicos
          </p>
          <ul className="mt-2 divide-y rounded-lg border">
            {CLINICAL_MODULES.map((mod) => {
              const Icon = mod.icon;
              return (
                <li key={mod.id}>
                  <button
                    type="button"
                    onClick={() => openModule(mod.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50"
                  >
                    <Icon className={cn("size-4 shrink-0", mod.iconClass)} strokeWidth={2} />
                    <span className="font-medium">{mod.label}</span>
                  </button>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                onClick={() => {
                  setModulesOpen(false);
                  openPrescription();
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50"
              >
                <FilePenLine className={cn("size-4 shrink-0", ICON_STYLES.rx)} strokeWidth={2} />
                <span className="font-medium">Receituário</span>
              </button>
            </li>
            {(onPhotosExamsClick || onPhotosBeforeAfterClick || onPhotosCompareClick) && (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setModulesOpen(false);
                    setPhotosOpen(true);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50"
                >
                  <Camera className={cn("size-4 shrink-0", ICON_STYLES.photos)} strokeWidth={2} />
                  <span className="font-medium">Anexos</span>
                </button>
              </li>
            )}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
}
