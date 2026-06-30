import { FileAudio, FileImage, MapPin, Paperclip, UserRound, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CrmComposerAttachMenuProps {
  disabled?: boolean;
  onPickPhotoOrPdf: () => void;
  onShareContact: () => void;
  onShareLocation: () => void;
  onPickVideo: () => void;
  onPickAudioFile: () => void;
}

export function CrmComposerAttachMenu({
  disabled,
  onPickPhotoOrPdf,
  onShareContact,
  onShareLocation,
  onPickVideo,
  onPickAudioFile,
}: CrmComposerAttachMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 rounded-full"
          disabled={disabled}
          title="Anexos"
        >
          <Paperclip className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-52">
        <DropdownMenuItem onClick={onPickPhotoOrPdf}>
          <FileImage className="mr-2 size-4" />
          Foto ou PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onShareContact}>
          <UserRound className="mr-2 size-4" />
          Contato
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onShareLocation}>
          <MapPin className="mr-2 size-4" />
          Localização
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onPickVideo}>
          <Video className="mr-2 size-4" />
          Vídeo
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onPickAudioFile}>
          <FileAudio className="mr-2 size-4" />
          Arquivo de áudio
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
