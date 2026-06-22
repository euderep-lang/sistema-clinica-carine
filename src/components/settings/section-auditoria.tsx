import { Fragment, useCallback, useEffect, useState } from "react";
import { RefreshCw, Search, Shield } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/feedback-states";
import { DateRangeFilter, firstDayOfMonth, todayISO } from "@/components/professional/date-range-filter";
import { listAuditLogs, type AuditLogRow } from "@/lib/audit.functions";
import {
  auditActionLabel,
  auditCategoryLabel,
  auditSourceLabel,
  AUDIT_CATEGORY_LABEL,
} from "@/lib/audit-labels";
import { fmtDateTime } from "@/lib/currency";

const CATEGORY_OPTIONS = Object.entries(AUDIT_CATEGORY_LABEL);

export function SectionAuditoria() {
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(todayISO());
  const [category, setCategory] = useState("all");
  const [source, setSource] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (from > to) {
      toast.error("A data inicial não pode ser maior que a final");
      return;
    }
    setLoading(true);
    try {
      const result = await listAuditLogs({
        data: {
          from,
          to,
          category,
          source,
          search: search.trim() || undefined,
          limit: 150,
        },
      });
      setRows(result.rows);
      setTotal(result.total);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [from, to, category, source, search]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="size-5 text-primary" />
            Auditoria do sistema
          </CardTitle>
          <CardDescription>
            Registro completo de ações: financeiro, WhatsApp (incluindo mensagens automáticas Z-API),
            usuários, pacientes e agenda. Somente administradores e financeiro podem consultar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
            <div>
              <Label className="text-xs">Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {CATEGORY_OPTIONS.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Origem</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="ui">Interface</SelectItem>
                  <SelectItem value="automation">Automação</SelectItem>
                  <SelectItem value="cron">Cron</SelectItem>
                  <SelectItem value="rpc">Sistema</SelectItem>
                  <SelectItem value="webhook">Webhook</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[200px] flex-1">
              <Label className="text-xs">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Resumo, usuário, ação…"
                  className="pl-9"
                />
              </div>
            </div>
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {total} registro{total === 1 ? "" : "s"} encontrado{total === 1 ? "" : "s"}
            {rows.length < total ? ` · exibindo ${rows.length}` : ""}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6">
              <TableSkeleton rows={8} />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">Nenhum registro no período.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/hora</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Resumo</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Origem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <Fragment key={row.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                    >
                      <TableCell className="whitespace-nowrap text-xs">
                        {fmtDateTime(row.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{auditCategoryLabel(row.category)}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{auditActionLabel(row.action)}</TableCell>
                      <TableCell className="max-w-md text-sm">{row.summary}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.actor_name ?? "Sistema"}
                        {row.actor_role ? ` · ${row.actor_role}` : ""}
                      </TableCell>
                      <TableCell className="text-xs">{auditSourceLabel(row.source)}</TableCell>
                    </TableRow>
                    {expandedId === row.id && row.details && (
                      <TableRow>
                        <TableCell colSpan={6} className="bg-muted/20 p-4">
                          <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all text-xs">
                            {JSON.stringify(row.details, null, 2)}
                          </pre>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
