import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { canRecordAudio } from "@/lib/wa-audio-prepare";
import { cn } from "@/lib/utils";

interface Props {
  onRecorded: (file: File) => void;
  disabled?: boolean;
}

export function CrmAudioRecorder({ onRecorded, disabled }: Props) {
  const [recording, setRecording] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);

  useEffect(() => {
    return () => {
      mediaRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const start = async () => {
    if (disabled || recording) return;

    if (!canRecordAudio()) {
      toast.error(
        "Microfone indisponível neste endereço. Use HTTPS (ngrok) ou anexe um arquivo de áudio pelo clipe.",
        { duration: 8000 },
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = getSupportedMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        const durationMs = Date.now() - startedAtRef.current;
        if (durationMs < 400 || chunksRef.current.length === 0) {
          toast.info("Gravação muito curta. Segure o botão e fale por pelo menos 1 segundo.");
          return;
        }

        const type = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
        onRecorded(new File([blob], `audio-${Date.now()}.${ext}`, { type }));
      };

      mediaRef.current = recorder;
      startedAtRef.current = Date.now();
      recorder.start(250);
      setRecording(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Permissão negada";
      toast.error(`Não foi possível gravar áudio: ${msg}`);
    }
  };

  const stop = () => {
    if (!recording || !mediaRef.current) return;
    if (mediaRef.current.state !== "inactive") {
      mediaRef.current.requestData();
      mediaRef.current.stop();
    }
    setRecording(false);
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={disabled}
      className={cn("size-9 shrink-0 rounded-full", recording && "animate-pulse bg-red-500/10 text-red-600 hover:bg-red-500/20")}
      onClick={() => (recording ? stop() : void start())}
      title={recording ? "Parar e enviar gravação" : "Gravar áudio"}
    >
      {recording ? <Square className="size-4" /> : <Mic className="size-4" />}
    </Button>
  );
}

function getSupportedMimeType(): string {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
    "audio/aac",
  ];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}
