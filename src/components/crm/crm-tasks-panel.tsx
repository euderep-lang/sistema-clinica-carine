import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fmtDateTime } from "@/lib/locale";
import { completeWaTask, createWaTask, getWaTasks } from "@/lib/whatsapp-crm.functions";
import { TASK_PRIORITY_LABEL, TASK_TYPE_LABEL } from "@/lib/whatsapp-crm";
import { CrmDetailEmpty, CrmDetailSection, crmNoteCard } from "@/components/crm/crm-detail-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface StaffMember {
  id: string;
  full_name: string;
}

interface Props {
  conversationId: string | null;
  staff: StaffMember[];
  currentUserId: string;
}

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  due_at: string;
  priority: string;
  task_type: string;
  assignee?: { full_name: string } | null;
};

export function CrmTasksPanel({ conversationId, staff, currentUserId }: Props) {
  const loadFn = useServerFn(getWaTasks);
  const createFn = useServerFn(createWaTask);
  const completeFn = useServerFn(completeWaTask);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [assignedTo, setAssignedTo] = useState(currentUserId);
  const [taskType, setTaskType] = useState("follow_up");
  const [priority, setPriority] = useState("normal");

  const reload = async () => {
    if (!conversationId) {
      setTasks([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await loadFn({ data: { conversationId, onlyOpen: true } });
      setTasks(rows as TaskRow[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, [conversationId]);

  const create = async () => {
    if (!conversationId || !title.trim() || !dueAt) return;
    try {
      await createFn({
        data: {
          conversationId,
          title: title.trim(),
          assignedTo,
          dueAt: new Date(dueAt).toISOString(),
          taskType: taskType as "call" | "follow_up" | "meeting" | "whatsapp" | "other",
          priority: priority as "low" | "normal" | "high" | "urgent",
          createReminder: true,
        },
      });
      setTitle("");
      setDueAt("");
      toast.success("Tarefa criada com lembrete");
      await reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const complete = async (taskId: string) => {
    try {
      await completeFn({ data: { taskId } });
      await reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (!conversationId) {
    return (
      <CrmDetailEmpty
        icon={Check}
        title="Selecione uma conversa"
        description="Abra um chat para criar tarefas de follow-up."
      />
    );
  }

  return (
    <div className="space-y-4">
      <CrmDetailSection title="Nova tarefa" description="Cria lembrete automático no prazo.">
        <Input placeholder="Título da tarefa" value={title} onChange={(e) => setTitle(e.target.value)} className="h-9" />
        <Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="mt-2 h-9" />
        <Select value={assignedTo} onValueChange={setAssignedTo}>
          <SelectTrigger className="mt-2 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {staff.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Select value={taskType} onValueChange={setTaskType}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(TASK_TYPE_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(TASK_PRIORITY_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => void create()} disabled={!title.trim() || !dueAt}>
          Criar tarefa + lembrete
        </Button>
      </CrmDetailSection>

      <CrmDetailSection title={tasks.length ? `Abertas (${tasks.length})` : "Abertas"} bare>
        {loading ? (
          <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
        ) : tasks.length === 0 ? (
          <CrmDetailEmpty icon={Check} title="Nenhuma tarefa aberta" />
        ) : (
          <div className="space-y-2">
            {tasks.map((t) => (
              <div key={t.id} className={cn(crmNoteCard, "flex items-start justify-between gap-2 before:bg-violet-500/70")}>
                <div>
                  <p className="text-sm font-medium">{t.title}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {TASK_TYPE_LABEL[t.task_type] ?? t.task_type} · {TASK_PRIORITY_LABEL[t.priority] ?? t.priority}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{fmtDateTime(t.due_at)}</p>
                  {t.assignee?.full_name ? (
                    <p className="text-[11px] text-muted-foreground">{t.assignee.full_name}</p>
                  ) : null}
                </div>
                <Button size="icon" variant="ghost" className="size-7 shrink-0" onClick={() => void complete(t.id)}>
                  <Check className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CrmDetailSection>
    </div>
  );
}
