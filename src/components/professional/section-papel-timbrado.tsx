import { useEffect, useMemo, useRef, useState } from "react";
import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_LETTERHEAD_MARGINS,
  letterheadStoragePath,
  type LetterheadMargins,
} from "@/lib/letterhead";
import { useAuth } from "@/lib/mock-auth";

const A4 = { width: 210, height: 297 };

function MarginPreview({
  previewUrl,
  margins,
}: {
  previewUrl: string | null;
  margins: LetterheadMargins;
}) {
  const safeStyle = useMemo(
    () => ({
      top: `${(margins.top / A4.height) * 100}%`,
      right: `${(margins.right / A4.width) * 100}%`,
      bottom: `${(margins.bottom / A4.height) * 100}%`,
      left: `${(margins.left / A4.width) * 100}%`,
    }),
    [margins],
  );

  return (
    <div className="mx-auto w-full max-w-xs">
      <div className="relative aspect-[210/297] overflow-hidden rounded-md border bg-muted/30 shadow-sm">
        {previewUrl ? (
          <img src={previewUrl} alt="Prévia do papel timbrado" className="size-full object-cover" />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageIcon className="size-8 opacity-40" />
            <p className="text-xs">Nenhuma imagem enviada</p>
          </div>
        )}
        <div
          className="pointer-events-none absolute border-2 border-dashed border-primary/70 bg-primary/5"
          style={safeStyle}
        />
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Área tracejada = zona segura para texto (margens em mm, formato A4)
      </p>
    </div>
  );
}

export function SectionPapelTimbrado() {
  const { profile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [margins, setMargins] = useState<LetterheadMargins>({ ...DEFAULT_LETTERHEAD_MARGINS });

  const loadPreview = async (path: string | null) => {
    if (!path) {
      setPreviewUrl(null);
      return;
    }
    const { data, error } = await supabase.storage
      .from("professional-assets")
      .createSignedUrl(path, 3600);
    if (error) {
      setPreviewUrl(null);
      return;
    }
    setPreviewUrl(data.signedUrl);
  };

  useEffect(() => {
    if (!profile) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "letterhead_path,letterhead_margin_top_mm,letterhead_margin_right_mm,letterhead_margin_bottom_mm,letterhead_margin_left_mm",
        )
        .eq("id", profile.id)
        .maybeSingle();

      if (error) toast.error(error.message);
      else {
        setStoragePath(data?.letterhead_path ?? null);
        setMargins({
          top: Number(data?.letterhead_margin_top_mm ?? DEFAULT_LETTERHEAD_MARGINS.top),
          right: Number(data?.letterhead_margin_right_mm ?? DEFAULT_LETTERHEAD_MARGINS.right),
          bottom: Number(data?.letterhead_margin_bottom_mm ?? DEFAULT_LETTERHEAD_MARGINS.bottom),
          left: Number(data?.letterhead_margin_left_mm ?? DEFAULT_LETTERHEAD_MARGINS.left),
        });
        await loadPreview(data?.letterhead_path ?? null);
      }
      setLoading(false);
    })();
  }, [profile]);

  const patchMargin = (key: keyof LetterheadMargins, value: string) => {
    const n = Math.max(0, parseFloat(value) || 0);
    setMargins((prev) => ({ ...prev, [key]: n }));
  };

  const uploadFile = async (file: File) => {
    if (!profile) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Envie uma imagem (JPG, PNG ou WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx. 5 MB).");
      return;
    }

    setUploading(true);
    try {
      const path = letterheadStoragePath(profile.id, file.name);
      const { error: upErr } = await supabase.storage
        .from("professional-assets")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw new Error(upErr.message);

      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ letterhead_path: path })
        .eq("id", profile.id);
      if (dbErr) throw new Error(dbErr.message);

      setStoragePath(path);
      await loadPreview(path);
      toast.success("Papel timbrado enviado");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const removeLetterhead = async () => {
    if (!profile || !storagePath) return;
    setUploading(true);
    try {
      await supabase.storage.from("professional-assets").remove([storagePath]);
      const { error } = await supabase
        .from("profiles")
        .update({ letterhead_path: null })
        .eq("id", profile.id);
      if (error) throw new Error(error.message);
      setStoragePath(null);
      setPreviewUrl(null);
      toast.success("Papel timbrado removido");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const saveMargins = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        letterhead_margin_top_mm: margins.top,
        letterhead_margin_right_mm: margins.right,
        letterhead_margin_bottom_mm: margins.bottom,
        letterhead_margin_left_mm: margins.left,
      })
      .eq("id", profile.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Margens salvas");
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando…</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Papel timbrado</CardTitle>
        <CardDescription>
          Envie a imagem do seu papel timbrado e defina as margens onde o conteúdo (receitas,
          documentos) deve ser impresso.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <MarginPreview previewUrl={previewUrl} margins={margins} />

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Arquivo do papel timbrado</Label>
              <p className="text-xs text-muted-foreground">
                Imagem em alta resolução do timbrado completo (A4). Formatos: JPG, PNG ou WebP.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 size-4" />
                  )}
                  {storagePath ? "Substituir imagem" : "Enviar imagem"}
                </Button>
                {storagePath && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    disabled={uploading}
                    onClick={() => void removeLetterhead()}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Remover
                  </Button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadFile(file);
                  e.target.value = "";
                }}
              />
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <p className="text-sm font-medium">Margens da área de conteúdo (mm)</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="margin-top">Superior</Label>
                  <Input
                    id="margin-top"
                    type="number"
                    min={0}
                    step={1}
                    value={margins.top}
                    onChange={(e) => patchMargin("top", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="margin-right">Direita</Label>
                  <Input
                    id="margin-right"
                    type="number"
                    min={0}
                    step={1}
                    value={margins.right}
                    onChange={(e) => patchMargin("right", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="margin-bottom">Inferior</Label>
                  <Input
                    id="margin-bottom"
                    type="number"
                    min={0}
                    step={1}
                    value={margins.bottom}
                    onChange={(e) => patchMargin("bottom", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="margin-left">Esquerda</Label>
                  <Input
                    id="margin-left"
                    type="number"
                    min={0}
                    step={1}
                    value={margins.left}
                    onChange={(e) => patchMargin("left", e.target.value)}
                  />
                </div>
              </div>
              <Button type="button" onClick={() => void saveMargins()} disabled={saving}>
                {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                Salvar margens
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
