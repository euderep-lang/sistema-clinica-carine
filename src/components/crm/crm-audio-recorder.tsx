import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, Mic, Pause, Play, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { canRecordAudio } from "@/lib/wa-audio-prepare";
import { isIosSafari, isMobileViewport } from "@/lib/crm-pwa";
import { cn } from "@/lib/utils";

interface Props {
  onRecorded: (file: File) => void;
  disabled?: boolean;
  /** Substitui a barra do composer enquanto grava (estilo WhatsApp). */
  composerMode?: boolean;
  onRecordingChange?: (recording: boolean) => void;
}

function micConstraints(mobile: boolean): MediaTrackConstraints {
  return mobile
    ? {
        channelCount: 1,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: true,
      }
    : {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };
}

function formatRecordingTime(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getSupportedMimeType(): string {
  const mobileFirst = [
    "audio/mp4",
    "audio/aac",
    "audio/ogg;codecs=opus",
    "audio/webm;codecs=opus",
    "audio/webm",
  ];
  const desktopFirst = [
    "audio/webm;codecs=opus",
    "audio/ogg;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ];
  const types = isIosSafari() || isMobileViewport() ? mobileFirst : desktopFirst;

  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

export function useCrmAudioRecorder({ onRecorded, disabled }: Pick<Props, "onRecorded" | "disabled">) {
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [waveform, setWaveform] = useState<number[]>(() => Array.from({ length: 36 }, () => 0.12));

  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const pausedTotalRef = useRef(0);
  const pauseStartedRef = useRef(0);
  const mimeRef = useRef("");
  const warmingRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef(0);

  const releaseAnalyser = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    void audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;
  }, []);

  const releaseStream = useCallback(() => {
    releaseAnalyser();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, [releaseAnalyser]);

  const resetState = useCallback(() => {
    setRecording(false);
    setPaused(false);
    setElapsedMs(0);
    setWaveform(Array.from({ length: 36 }, () => 0.12));
    pausedTotalRef.current = 0;
    pauseStartedRef.current = 0;
  }, []);

  useEffect(() => {
    return () => {
      mediaRef.current?.stop();
      releaseStream();
    };
  }, [releaseStream]);

  useEffect(() => {
    if (disabled) {
      mediaRef.current?.stop();
      releaseStream();
      resetState();
    }
  }, [disabled, releaseStream, resetState]);

  const ensureStream = useCallback(async (): Promise<MediaStream | null> => {
    if (streamRef.current?.active) return streamRef.current;
    if (!canRecordAudio()) return null;

    const mobile = isMobileViewport() || isIosSafari();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: micConstraints(mobile) });
    streamRef.current = stream;
    return stream;
  }, []);

  const startAnalyser = useCallback((stream: MediaStream) => {
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.65;
    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);
    audioCtxRef.current = ctx;
    analyserRef.current = analyser;

    const tick = () => {
      const node = analyserRef.current;
      if (!node) return;
      const bins = new Uint8Array(node.frequencyBinCount);
      node.getByteFrequencyData(bins);
      const bars: number[] = [];
      const step = Math.max(1, Math.floor(bins.length / 36));
      for (let i = 0; i < 36; i++) {
        const slice = bins.slice(i * step, (i + 1) * step);
        const avg = slice.reduce((a, b) => a + b, 0) / Math.max(slice.length, 1);
        bars.push(Math.min(1, Math.max(0.1, avg / 110)));
      }
      setWaveform(bars);
      rafRef.current = requestAnimationFrame(tick);
    };
    void ctx.resume();
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const warmMicrophone = useCallback(async () => {
    if (disabled || recording || warmingRef.current || streamRef.current?.active) return;
    warmingRef.current = true;
    try {
      await ensureStream();
    } catch {
      /* permissão será pedida ao gravar */
    } finally {
      warmingRef.current = false;
    }
  }, [disabled, recording, ensureStream]);

  const cancel = useCallback(() => {
    chunksRef.current = [];
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.onstop = null;
      mediaRef.current.stop();
    }
    mediaRef.current = null;
    releaseStream();
    resetState();
  }, [releaseStream, resetState]);

  const finishRecording = useCallback(() => {
    if (!mediaRef.current || mediaRef.current.state === "inactive") return;
    mediaRef.current.requestData();
    mediaRef.current.stop();
    setRecording(false);
    setPaused(false);
    releaseAnalyser();
  }, [releaseAnalyser]);

  const start = async () => {
    if (disabled || recording) return;

    if (!canRecordAudio()) {
      toast.error(
        "Microfone indisponível. Use HTTPS e permita o microfone nas configurações do app.",
        { duration: 8000 },
      );
      return;
    }

    const mobile = isMobileViewport() || isIosSafari();

    try {
      const stream = await ensureStream();
      if (!stream) throw new Error("Microfone indisponível");

      chunksRef.current = [];
      pausedTotalRef.current = 0;
      pauseStartedRef.current = 0;

      const mimeType = getSupportedMimeType();
      mimeRef.current = mimeType;
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType, audioBitsPerSecond: mobile ? 64_000 : 128_000 })
        : new MediaRecorder(stream, { audioBitsPerSecond: mobile ? 64_000 : 128_000 });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onerror = () => {
        toast.error("Erro na gravação. Tente novamente ou anexe um arquivo de áudio.");
        cancel();
      };

      recorder.onstop = () => {
        releaseStream();

        const durationMs = Date.now() - startedAtRef.current - pausedTotalRef.current;
        if (durationMs < 400 || chunksRef.current.length === 0) {
          toast.info("Gravação muito curta. Fale por pelo menos 1 segundo.");
          resetState();
          return;
        }

        const type = recorder.mimeType || mimeRef.current || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        const ext = type.includes("mp4") || type.includes("aac") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
        onRecorded(new File([blob], `audio-${Date.now()}.${ext}`, { type }));
        resetState();
      };

      mediaRef.current = recorder;
      startedAtRef.current = Date.now();
      recorder.start(100);
      startAnalyser(stream);
      setRecording(true);
      setPaused(false);
      setElapsedMs(0);
    } catch (e) {
      releaseStream();
      resetState();
      const err = e as DOMException;
      if (err.name === "NotAllowedError") {
        toast.error("Permissão do microfone negada. Ative em Ajustes → Safari/Chrome → Microfone.");
      } else if (err.name === "NotFoundError") {
        toast.error("Nenhum microfone encontrado neste dispositivo.");
      } else {
        const msg = e instanceof Error ? e.message : "Permissão negada";
        toast.error(`Não foi possível gravar áudio: ${msg}`);
      }
    }
  };

  const togglePause = () => {
    const recorder = mediaRef.current;
    if (!recorder || recorder.state === "inactive") return;

    if (paused) {
      if (recorder.state === "paused" && typeof recorder.resume === "function") {
        pausedTotalRef.current += Date.now() - pauseStartedRef.current;
        recorder.resume();
        if (streamRef.current) startAnalyser(streamRef.current);
      }
      setPaused(false);
      return;
    }

    if (recorder.state === "recording" && typeof recorder.pause === "function") {
      pauseStartedRef.current = Date.now();
      recorder.pause();
      releaseAnalyser();
      setPaused(true);
      return;
    }

    toast.info("Pausar gravação não é suportado neste navegador.");
  };

  useEffect(() => {
    if (!recording || paused) return;
    const id = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAtRef.current - pausedTotalRef.current);
    }, 100);
    return () => window.clearInterval(id);
  }, [recording, paused]);

  return {
    recording,
    paused,
    elapsedMs,
    waveform,
    warmMicrophone,
    start,
    cancel,
    finishRecording,
    togglePause,
  };
}

/** Barra de gravação estilo WhatsApp (timer + waveform + pausar + enviar). */
export function CrmAudioRecordingBar({
  elapsedMs,
  paused,
  waveform,
  onCancel,
  onTogglePause,
  onSend,
  className,
}: {
  elapsedMs: number;
  paused: boolean;
  waveform: number[];
  onCancel: () => void;
  onTogglePause: () => void;
  onSend: () => void;
  className?: string;
}) {
  const mobile = isMobileViewport() || isIosSafari();
  const [dragX, setDragX] = useState(0);
  const dragStartXRef = useRef(0);
  const dragXRef = useRef(0);
  const draggingRef = useRef(false);
  const cancelThreshold = mobile ? 72 : 96;
  const cancelReady = dragX <= -cancelThreshold;

  const onDragStart = useCallback(
    (clientX: number) => {
      if (paused) return;
      draggingRef.current = true;
      dragStartXRef.current = clientX;
    },
    [paused],
  );

  const onDragMove = useCallback((clientX: number) => {
    if (!draggingRef.current) return;
    const next = Math.min(0, clientX - dragStartXRef.current);
    dragXRef.current = next;
    setDragX(next);
  }, []);

  const onDragEnd = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (dragXRef.current <= -cancelThreshold) onCancel();
    dragXRef.current = 0;
    setDragX(0);
  }, [cancelThreshold, onCancel]);

  return (
    <div className={cn("flex min-w-0 flex-1 items-center gap-2", className)}>
      {!mobile ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 rounded-full text-muted-foreground hover:text-destructive"
          onClick={onCancel}
          title="Cancelar gravação"
        >
          <Trash2 className="size-4" />
        </Button>
      ) : null}

      <div className="relative min-w-0 flex-1">
        {mobile && !paused ? (
          <div
            className={cn(
              "pointer-events-none absolute inset-y-0 right-0 flex items-center gap-1 pr-2 text-[11px] transition-opacity",
              Math.abs(dragX) > 8 ? "opacity-100" : "opacity-55",
              cancelReady ? "text-destructive" : "text-muted-foreground",
            )}
          >
            <ChevronLeft className="size-3.5" />
            <span>{cancelReady ? "Solte para cancelar" : "Deslize para cancelar"}</span>
          </div>
        ) : null}

        <div
          className={cn(
            "relative flex touch-none items-center gap-2 rounded-full bg-muted/50 px-3 py-2 transition-[transform,background-color,opacity]",
            cancelReady && "bg-destructive/10",
          )}
          style={{ transform: dragX ? `translateX(${dragX}px)` : undefined }}
          onPointerDown={(e) => {
            if (!mobile || paused) return;
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            onDragStart(e.clientX);
          }}
          onPointerMove={(e) => {
            if (!mobile || paused) return;
            onDragMove(e.clientX);
          }}
          onPointerUp={() => onDragEnd()}
          onPointerCancel={() => onDragEnd()}
        >
          <span
            className={cn(
              "size-2 shrink-0 rounded-full bg-red-500",
              !paused && "animate-pulse",
            )}
            aria-hidden
          />
          <span className="shrink-0 text-[13px] font-medium tabular-nums text-foreground">
            {formatRecordingTime(elapsedMs)}
          </span>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-[2px] overflow-hidden px-1">
            {waveform.map((level, i) => (
              <span
                key={i}
                className="w-[2px] shrink-0 rounded-full bg-muted-foreground/45 transition-[height] duration-75"
                style={{ height: `${Math.round(4 + level * 18)}px` }}
              />
            ))}
          </div>
          {mobile && Math.abs(dragX) > 20 ? (
            <Trash2
              className={cn(
                "size-4 shrink-0 transition-colors",
                cancelReady ? "text-destructive" : "text-muted-foreground/70",
              )}
            />
          ) : null}
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 shrink-0 rounded-full"
        onClick={onTogglePause}
        title={paused ? "Continuar gravação" : "Pausar gravação"}
      >
        {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
      </Button>

      <Button
        type="button"
        size="icon"
        className="size-9 shrink-0 rounded-full bg-[#25D366] hover:bg-[#20bd5a]"
        onClick={onSend}
        title="Enviar áudio"
      >
        <Send className="size-4" />
      </Button>
    </div>
  );
}

export function CrmAudioRecorder({
  onRecorded,
  disabled,
  composerMode,
  onRecordingChange,
}: Props) {
  const recorder = useCrmAudioRecorder({ onRecorded, disabled });

  useEffect(() => {
    onRecordingChange?.(recorder.recording);
  }, [recorder.recording, onRecordingChange]);

  if (composerMode && recorder.recording) {
    return (
      <CrmAudioRecordingBar
        elapsedMs={recorder.elapsedMs}
        paused={recorder.paused}
        waveform={recorder.waveform}
        onCancel={recorder.cancel}
        onTogglePause={recorder.togglePause}
        onSend={recorder.finishRecording}
        className="w-full"
      />
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={disabled}
      className="size-9 shrink-0 rounded-full"
      onPointerDown={() => void recorder.warmMicrophone()}
      onTouchStart={() => void recorder.warmMicrophone()}
      onClick={() => void recorder.start()}
      title="Gravar áudio"
    >
      <Mic className="size-4" />
    </Button>
  );
}
