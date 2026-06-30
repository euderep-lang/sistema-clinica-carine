import type { RefObject } from "react";
import { CalendarClock, Loader2, Send, Sparkles } from "lucide-react";
import { CrmComposerAttachMenu } from "@/components/crm/crm-composer-attach-menu";
import { CrmComposerAlerts } from "@/components/crm/crm-composer-alerts";
import { CrmAudioRecorder } from "@/components/crm/crm-audio-recorder";
import { CrmEmojiPicker } from "@/components/crm/crm-emoji-picker";
import { CrmQuickReplies } from "@/components/crm/crm-quick-replies";
import { crmComposerBar } from "@/components/crm/crm-inbox-theme";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { WaMessage } from "@/lib/whatsapp-crm";

type ScheduledItem = { id: string; send_at: string; body: string };

interface CrmInboxComposerProps {
  composeTarget: { phone: string; name: string } | null;
  selectedId: string | null;
  selectedStatus?: string;
  selectedChannel?: string | null;
  sending: boolean;
  humanizing: boolean;
  text: string;
  onTextChange: (value: string) => void;
  onComposerInput: () => void;
  onSend: () => void;
  onHumanize: () => void;
  onSchedule: () => void;
  onInsertEmoji: (emoji: string) => void;
  onSendFile: (file: File) => void;
  onShareContact: () => void;
  onShareLocation: () => void;
  composerRef: RefObject<HTMLTextAreaElement | null>;
  fileRef: RefObject<HTMLInputElement | null>;
  videoFileRef: RefObject<HTMLInputElement | null>;
  audioFileRef: RefObject<HTMLInputElement | null>;
  scheduledList: ScheduledItem[];
  replyTo: WaMessage | null;
  onCancelScheduled: (id: string) => void;
  onClearReply: () => void;
  quickRepliesDisabled: boolean;
  quickReplyVars: Record<string, string>;
  onQuickReplySelect: (text: string) => void;
}

export function CrmInboxComposer({
  composeTarget,
  selectedId,
  selectedStatus,
  selectedChannel,
  sending,
  humanizing,
  text,
  onTextChange,
  onComposerInput,
  onSend,
  onHumanize,
  onSchedule,
  onInsertEmoji,
  onSendFile,
  onShareContact,
  onShareLocation,
  composerRef,
  fileRef,
  videoFileRef,
  audioFileRef,
  scheduledList,
  replyTo,
  onCancelScheduled,
  onClearReply,
  quickRepliesDisabled,
  quickReplyVars,
  onQuickReplySelect,
}: CrmInboxComposerProps) {
  const channel = selectedChannel ?? "whatsapp";
  const closed = !composeTarget && selectedStatus === "closed";
  const attachDisabled =
    sending || !selectedId || closed || !!composeTarget || channel !== "whatsapp";

  return (
    <div className={crmComposerBar}>
      {!composeTarget ? (
        <CrmComposerAlerts
          scheduledList={scheduledList}
          replyTo={replyTo}
          onCancelScheduled={onCancelScheduled}
          onClearReply={onClearReply}
        />
      ) : null}
      <CrmQuickReplies
        disabled={quickRepliesDisabled}
        templateVars={quickReplyVars}
        onSelect={onQuickReplySelect}
      />
      <div className="flex w-full items-end gap-1 rounded-xl border border-border/50 bg-background p-1 shadow-sm">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.jpg,.jpeg,.png,.webp,.gif,.pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onSendFile(f);
            e.target.value = "";
          }}
        />
        <input
          ref={videoFileRef}
          type="file"
          accept="video/mp4,video/3gpp,video/quicktime,.mp4,.3gp,.mov"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onSendFile(f);
            e.target.value = "";
          }}
        />
        <input
          ref={audioFileRef}
          type="file"
          accept="audio/*,.mp3,.ogg,.m4a,.aac,.wav"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onSendFile(f);
            e.target.value = "";
          }}
        />
        <div className="flex shrink-0 items-center gap-0.5">
          <CrmComposerAttachMenu
            disabled={attachDisabled}
            onPickPhotoOrPdf={() => fileRef.current?.click()}
            onShareContact={onShareContact}
            onShareLocation={onShareLocation}
            onPickVideo={() => videoFileRef.current?.click()}
            onPickAudioFile={() => audioFileRef.current?.click()}
          />
          <CrmEmojiPicker
            onSelect={onInsertEmoji}
            disabled={closed || (!selectedId && !composeTarget)}
          />
          <CrmAudioRecorder
            disabled={attachDisabled}
            onRecorded={onSendFile}
          />
        </div>
        <Textarea
          ref={composerRef}
          placeholder="Digite uma mensagem…"
          title="Enter para enviar · Shift+Enter para nova linha"
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          onInput={onComposerInput}
          disabled={closed}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          rows={1}
          className="min-h-[2.25rem] min-w-0 flex-1 resize-none overflow-hidden border-0 bg-transparent px-2 py-2 text-[13px] leading-snug shadow-none focus-visible:ring-0"
        />
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 rounded-full text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
            onClick={onHumanize}
            disabled={humanizing || sending || !text.trim() || closed}
            title="Reformular com IA"
          >
            {humanizing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 rounded-full"
            onClick={onSchedule}
            disabled={sending || !text.trim() || !!composeTarget || !selectedId || closed}
            title="Agendar envio"
          >
            <CalendarClock className="size-4" />
          </Button>
          <Button
            size="icon"
            className="size-8 shrink-0 rounded-full bg-[#25D366] hover:bg-[#20bd5a]"
            onClick={onSend}
            disabled={sending || !text.trim() || closed}
          >
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
