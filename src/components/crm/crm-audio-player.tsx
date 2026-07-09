import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { isMobileViewport } from "@/lib/crm-pwa";
import { cn } from "@/lib/utils";

function formatDuration(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface Props {
  src: string;
  outbound?: boolean;
  className?: string;
}

const SPEEDS = [1, 1.5, 2] as const;

/** Converte data URI em blob URL — reprodução mais rápida no celular. */
function usePlaybackSrc(src: string): string {
  const [playbackSrc, setPlaybackSrc] = useState(src);

  useEffect(() => {
    if (!src.startsWith("data:")) {
      setPlaybackSrc(src);
      return;
    }

    let revoked = false;
    let objectUrl = "";

    void fetch(src)
      .then((r) => r.blob())
      .then((blob) => {
        if (revoked) return;
        objectUrl = URL.createObjectURL(blob);
        setPlaybackSrc(objectUrl);
      })
      .catch(() => {
        if (!revoked) setPlaybackSrc(src);
      });

    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  return playbackSrc;
}

/** Player compacto estilo WhatsApp — substitui o <audio controls> nativo. */
export function CrmAudioPlayer({ src, outbound, className }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const playbackSrc = usePlaybackSrc(src);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const mobile = isMobileViewport();

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onTime = () => setCurrent(el.currentTime);
    const onMeta = () => setDuration(el.duration);
    const onEnd = () => setPlaying(false);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("durationchange", onMeta);
    el.addEventListener("ended", onEnd);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);

    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("durationchange", onMeta);
      el.removeEventListener("ended", onEnd);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
    };
  }, [playbackSrc]);

  const toggle = async () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      return;
    }
    try {
      if (el.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
        el.load();
      }
      await el.play();
    } catch {
      setPlaying(false);
    }
  };

  const cycleSpeed = () => {
    const idx = SPEEDS.indexOf(speed);
    const next = SPEEDS[(idx + 1) % SPEEDS.length];
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const seek = (e: React.MouseEvent<HTMLButtonElement>) => {
    const el = audioRef.current;
    if (!el || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    el.currentTime = ratio * duration;
  };

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed, playbackSrc, playing]);

  const pct = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div className={cn("flex w-full items-center gap-1.5", className)}>
      <audio
        ref={audioRef}
        src={playbackSrc}
        preload={mobile ? "auto" : "metadata"}
        playsInline
        className="hidden"
      />
      <button
        type="button"
        onClick={() => void toggle()}
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full transition",
          outbound
            ? "bg-emerald-700/15 text-emerald-900 dark:text-emerald-100"
            : "bg-emerald-600/12 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-100",
        )}
        aria-label={playing ? "Pausar áudio" : "Reproduzir áudio"}
      >
        {playing ? (
          <Pause className="size-3 fill-current" />
        ) : (
          <Play className="size-3 fill-current pl-px" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          className="block h-1 w-full cursor-pointer rounded-full bg-black/8 dark:bg-white/12"
          onClick={seek}
          aria-label="Posição do áudio"
        >
          <span
            className={cn(
              "block h-full rounded-full transition-[width]",
              outbound ? "bg-emerald-700/55 dark:bg-emerald-400/70" : "bg-emerald-600/60",
            )}
            style={{ width: `${pct}%` }}
          />
        </button>
        <p className="mt-0.5 text-[9px] tabular-nums leading-none opacity-55">
          {formatDuration(playing || current > 0 ? current : duration)}
        </p>
      </div>
      <button
        type="button"
        onClick={cycleSpeed}
        className={cn(
          "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold tabular-nums transition",
          outbound
            ? "bg-emerald-700/15 text-emerald-900 dark:text-emerald-100"
            : "bg-emerald-600/12 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-100",
        )}
        aria-label="Velocidade de reprodução"
        title="Velocidade do áudio"
      >
        {speed}x
      </button>
    </div>
  );
}
