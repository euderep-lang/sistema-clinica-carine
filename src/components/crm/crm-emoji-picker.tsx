import { useMemo, useState } from "react";
import { Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** Conjuntos de emojis mais usados no atendimento — sem dependência externa. */
const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: "Frequentes",
    emojis: ["😀", "😊", "😍", "🥰", "😅", "😂", "🙏", "👍", "👏", "🙌", "❤️", "✨", "🎉", "✅", "🔥", "💪"],
  },
  {
    label: "Rostos",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰",
      "😘", "😗", "😙", "😚", "😋", "😛", "😜", "🤪", "🤗", "🤔", "😶", "😐", "😴", "😎", "🥳", "😢",
      "😭", "😅", "😞", "😔", "😟", "😕", "🙁", "😬", "😮", "😯", "😲", "😳", "🥺", "😡", "😱", "🤩",
    ],
  },
  {
    label: "Gestos",
    emojis: [
      "👍", "👎", "👌", "🤙", "✌️", "🤞", "🙏", "👏", "🙌", "👐", "🤝", "💪", "👋", "🖐️", "✋", "👉",
      "👆", "👇", "☝️", "✍️", "💅", "🤳",
    ],
  },
  {
    label: "Saúde",
    emojis: [
      "🩺", "💉", "💊", "🩹", "🦷", "🧬", "🫀", "🧠", "🩻", "🌡️", "🏥", "🚑", "♻️", "🧴", "🧼", "😷",
    ],
  },
  {
    label: "Símbolos",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💖", "💗", "💕", "✨", "⭐", "🌟", "🎉", "🎊",
      "✅", "❌", "❗", "❓", "⚠️", "🔔", "📌", "📅", "🕐", "💰", "💵", "🎁", "📞", "📲", "💬", "🔥",
    ],
  },
];

export function CrmEmojiPicker({
  onSelect,
  disabled,
}: {
  onSelect: (emoji: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState(0);

  // Remove eventuais entradas inválidas defensivamente.
  const groups = useMemo(
    () =>
      EMOJI_GROUPS.map((g) => ({
        ...g,
        emojis: g.emojis.filter((e) => e && !/\d{3,}/.test(e)),
      })),
    [],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 rounded-full"
          disabled={disabled}
          title="Emoji"
          aria-label="Inserir emoji"
        >
          <Smile className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className="w-72 p-2">
        <div className="mb-2 flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {groups.map((g, i) => (
            <button
              key={g.label}
              type="button"
              onClick={() => setGroup(i)}
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition",
                group === i ? "bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              {g.label}
            </button>
          ))}
        </div>
        <div className="grid max-h-48 grid-cols-8 gap-0.5 overflow-y-auto">
          {groups[group]?.emojis.map((emoji, idx) => (
            <button
              key={`${emoji}-${idx}`}
              type="button"
              className="flex size-8 items-center justify-center rounded-md text-lg transition hover:bg-muted"
              onClick={() => {
                onSelect(emoji);
                setOpen(false);
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
