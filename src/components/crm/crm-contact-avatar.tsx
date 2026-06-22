import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { fetchWaContactPhoto } from "@/lib/whatsapp-crm.functions";
import { isContactPhotoCacheFresh, isValidContactPhotoUrl } from "@/lib/wa-contact-photo";
import { cn } from "@/lib/utils";

type PhotoSlice = {
  id: string;
  contact_photo_url?: string | null;
  contact_photo_fetched_at?: string | null;
};

/** Busca e cacheia fotos de perfil WhatsApp (Z-API) para a lista de conversas. */
export function useWaContactPhotos(conversations: PhotoSlice[], priorityIds: string[] = []) {
  const photoFn = useServerFn(fetchWaContactPhoto);
  const photoFnRef = useRef(photoFn);
  photoFnRef.current = photoFn;

  const [photos, setPhotos] = useState<Record<string, string | null>>({});
  const fetchedRef = useRef(new Set<string>());

  useEffect(() => {
    const seeded: Record<string, string | null> = {};
    for (const c of conversations) {
      if (isValidContactPhotoUrl(c.contact_photo_url)) {
        seeded[c.id] = c.contact_photo_url!;
        if (isContactPhotoCacheFresh(c.contact_photo_fetched_at)) {
          fetchedRef.current.add(c.id);
        }
      }
    }
    if (Object.keys(seeded).length > 0) {
      setPhotos((prev) => ({ ...prev, ...seeded }));
    }
  }, [conversations]);

  useEffect(() => {
    let cancelled = false;

    const priority = new Set(priorityIds);
    const pending = [
      ...conversations.filter((c) => priority.has(c.id) && !fetchedRef.current.has(c.id)),
      ...conversations.filter((c) => !priority.has(c.id) && !fetchedRef.current.has(c.id)),
    ].slice(0, 30);

    if (!pending.length) return;

    for (const c of pending) fetchedRef.current.add(c.id);

    void Promise.all(
      pending.map(async (c) => {
        try {
          const { url } = await photoFnRef.current({ data: { conversationId: c.id } });
          if (!cancelled) {
            setPhotos((prev) => ({ ...prev, [c.id]: url ?? null }));
          }
        } catch {
          if (!cancelled) {
            setPhotos((prev) => ({ ...prev, [c.id]: null }));
          }
        }
      }),
    );

    return () => {
      cancelled = true;
    };
  }, [conversations, priorityIds]);

  return photos;
}

interface CrmContactAvatarProps {
  name: string;
  conversationId: string;
  photoUrl?: string | null;
  tagColor?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  ringClassName?: string;
}

const SIZE_CLASS = {
  sm: "size-9",
  md: "size-10",
  lg: "size-12",
} as const;

const ICON_SIZE_CLASS = {
  sm: "size-4",
  md: "size-[1.125rem]",
  lg: "size-5",
} as const;

function CrmContactAvatarFallback({
  tagColor,
  size,
}: {
  tagColor?: string | null;
  size: "sm" | "md" | "lg";
}) {
  const hasTag = !!tagColor;

  return (
    <AvatarFallback
      className={cn(
        "flex items-center justify-center rounded-full",
        hasTag
          ? "border border-transparent text-white"
          : "border border-gray-200 bg-white text-gray-300 dark:border-gray-600 dark:bg-background dark:text-muted-foreground/40",
      )}
      style={hasTag ? { backgroundColor: tagColor } : undefined}
    >
      <UserRound className={ICON_SIZE_CLASS[size]} strokeWidth={2.25} aria-hidden />
    </AvatarFallback>
  );
}

export function CrmContactAvatar({
  name,
  conversationId,
  photoUrl,
  tagColor = null,
  size = "sm",
  className,
  ringClassName,
}: CrmContactAvatarProps) {
  return (
    <Avatar
      className={cn(
        SIZE_CLASS[size],
        ringClassName,
        className,
      )}
    >
      {photoUrl ? (
        <AvatarImage
          src={photoUrl}
          alt={name}
          referrerPolicy="no-referrer"
        />
      ) : null}
      <CrmContactAvatarFallback tagColor={tagColor} size={size} />
    </Avatar>
  );
}

/** Avatar com hook embutido — use na lista quando já tiver o mapa de fotos. */
export function CrmContactAvatarFromMap({
  name,
  conversationId,
  photos,
  tagColor,
  ...props
}: Omit<CrmContactAvatarProps, "photoUrl"> & {
  photos: Record<string, string | null | undefined>;
}) {
  return (
    <CrmContactAvatar
      name={name}
      conversationId={conversationId}
      photoUrl={photos[conversationId]}
      tagColor={tagColor}
      {...props}
    />
  );
}
