import { useCallback, useRef, useState } from "react";
import { FileText, ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  MediaCaptionDialog,
  type PendingMediaItem,
} from "@/components/professional/media-caption-dialog";
import { compressForUpload } from "@/lib/media-compress";
import { todayISO } from "@/lib/locale";
import {
  photoAttachmentCaption,
  photoDateLabel,
  photoGroupCaption,
  type PhotoUploadKind,
} from "@/lib/patient-media";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";
import { randomUUID } from "@/lib/utils";

interface PatientMediaAttacherProps {
  patientId: string;
  onUploaded?: () => void;
}

export function PatientMediaAttacher({ patientId, onUploaded }: PatientMediaAttacherProps) {
  const { profile } = useAuth();
  const [compressing, setCompressing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [captionDialogOpen, setCaptionDialogOpen] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<PendingMediaItem[]>([]);
  const [pendingPhotoKind, setPendingPhotoKind] = useState<PhotoUploadKind | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<"photo" | "document">("photo");

  const pickFiles = (category: "photo" | "document") => {
    categoryRef.current = category;
    if (fileRef.current) {
      fileRef.current.accept =
        category === "photo" ? "image/*" : "image/*,application/pdf";
      fileRef.current.click();
    }
  };

  const clearPendingMedia = useCallback(() => {
    setPendingMedia((prev) => {
      prev.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      return [];
    });
    setCaptionDialogOpen(false);
    setPendingPhotoKind(null);
  }, []);

  const prepareMediaFiles = async (list: FileList, kind?: PhotoUploadKind) => {
    setCompressing(true);
    try {
      const dateLabel = photoDateLabel();
      const items: PendingMediaItem[] = [];
      for (const raw of Array.from(list)) {
        const { file, sizeKb } = await compressForUpload(raw);
        const caption = kind ? photoAttachmentCaption(dateLabel, kind) : "";
        items.push({
          id: randomUUID(),
          file,
          sizeKb,
          previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
          caption,
        });
      }
      setPendingPhotoKind(kind ?? null);
      setPendingMedia(items);
      setCaptionDialogOpen(true);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCompressing(false);
    }
  };

  const confirmMediaUpload = async () => {
    if (!profile || pendingMedia.length === 0) return;
    if (!pendingPhotoKind && pendingMedia.some((item) => !item.caption.trim())) {
      toast.error("Preencha a legenda de todos os arquivos.");
      return;
    }

    setUploading(true);
    try {
      if (pendingPhotoKind) {
        const today = todayISO();
        const dateLabel = photoDateLabel();
        const groupText = photoGroupCaption(pendingPhotoKind, dateLabel);

        const { data: evolution, error: evErr } = await supabase
          .from("patient_evolutions")
          .insert({
            tenant_id: profile.tenant_id,
            patient_id: patientId,
            professional_id: profile.id,
            date: today,
            evolution_text: groupText,
          })
          .select("id")
          .single();

        if (evErr || !evolution) {
          throw new Error(evErr?.message ?? "Erro ao salvar fotos no histórico");
        }

        const evId = evolution.id;
        for (const item of pendingMedia) {
          const attachmentId = randomUUID();
          const safeName = item.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const storagePath = `${patientId}/media/${attachmentId}/${Date.now()}_${safeName}`;

          const { error: upErr } = await supabase.storage
            .from("patient-documents")
            .upload(storagePath, item.file, { upsert: false, contentType: item.file.type });
          if (upErr) throw new Error(upErr.message);

          const { error: attErr } = await supabase.from("evolution_attachments").insert({
            id: attachmentId,
            tenant_id: profile.tenant_id,
            evolution_id: evId,
            patient_id: patientId,
            professional_id: profile.id,
            storage_path: storagePath,
            file_name: item.file.name,
            mime_type: item.file.type,
            file_size_kb: item.sizeKb,
            caption: item.caption.trim() || dateLabel,
          });
          if (attErr) throw new Error(attErr.message);
        }

        clearPendingMedia();
        toast.success("Fotos salvas no histórico");
        onUploaded?.();
        return;
      }

      let saved = 0;
      for (const item of pendingMedia) {
        const mediaId = randomUUID();
        const safeName = item.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `${patientId}/media/${mediaId}/${Date.now()}_${safeName}`;

        const { error: upErr } = await supabase.storage
          .from("patient-documents")
          .upload(storagePath, item.file, { upsert: false, contentType: item.file.type });
        if (upErr) throw new Error(upErr.message);

        const { error: dbErr } = await supabase
          .from("patient_media_history" as never)
          .insert({
            id: mediaId,
            tenant_id: profile.tenant_id,
            patient_id: patientId,
            professional_id: profile.id,
            storage_path: storagePath,
            file_name: item.file.name,
            mime_type: item.file.type,
            file_size_kb: item.sizeKb,
            caption: item.caption.trim(),
          } as never);
        if (dbErr) throw new Error((dbErr as { message: string }).message);
        saved += 1;
      }

      clearPendingMedia();
      toast.success(saved === 1 ? "Documento salvo no histórico" : `${saved} documentos salvos`);
      onUploaded?.();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const busy = compressing || uploading;

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-24 flex-col gap-2"
          disabled={busy}
          onClick={() => pickFiles("photo")}
        >
          {compressing && categoryRef.current === "photo" ? (
            <Loader2 className="size-6 animate-spin" />
          ) : (
            <ImagePlus className="size-6 text-rose-600" />
          )}
          <span className="text-sm font-medium">Foto</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-24 flex-col gap-2"
          disabled={busy}
          onClick={() => pickFiles("document")}
        >
          {compressing && categoryRef.current === "document" ? (
            <Loader2 className="size-6 animate-spin" />
          ) : (
            <FileText className="size-6 text-sky-600" />
          )}
          <span className="text-sm font-medium">Documento</span>
        </Button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          const category = categoryRef.current;
          if (files?.length) {
            void prepareMediaFiles(files, category === "photo" ? "before_after" : undefined);
          }
          e.target.value = "";
        }}
      />

      <MediaCaptionDialog
        open={captionDialogOpen}
        items={pendingMedia}
        uploading={uploading}
        photoKind={pendingPhotoKind}
        groupCaption={pendingPhotoKind ? photoGroupCaption(pendingPhotoKind) : undefined}
        onCaptionChange={(itemId, caption) =>
          setPendingMedia((prev) =>
            prev.map((item) => (item.id === itemId ? { ...item, caption } : item)),
          )
        }
        onConfirm={() => void confirmMediaUpload()}
        onCancel={clearPendingMedia}
      />
    </>
  );
}
