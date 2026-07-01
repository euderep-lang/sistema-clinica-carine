import { cn } from "@/lib/utils";

type ClinicOsIconVariant = "on-light" | "on-dark" | "auto";

const SRC = {
  light: "/logo-green.png",
  dark: "/logo-white.png",
} as const;

/** Tamanhos proporcionais do ícone da marca. */
export const CLINICOS_ICON_SIZE = {
  sm: "size-[1.2375rem]",
  md: "size-[1.8rem]",
  lg: "size-[2.475rem]",
  xl: "size-[3.96rem]",
} as const;

export type ClinicOsIconSize = keyof typeof CLINICOS_ICON_SIZE;

interface ClinicOsIconProps {
  /** `on-light` = verde. `on-dark` = branco. `auto` = verde no tema claro, branco no escuro. */
  variant?: ClinicOsIconVariant;
  size?: ClinicOsIconSize;
  className?: string;
  alt?: string;
}

export function ClinicOsIcon({
  variant = "on-light",
  size,
  className,
  alt = "ClinicOS",
}: ClinicOsIconProps) {
  const sizeClass = size ? CLINICOS_ICON_SIZE[size] : undefined;

  if (variant === "auto") {
    return (
      <>
        <img
          src={SRC.light}
          alt={alt}
          className={cn("object-contain shrink-0 dark:hidden", sizeClass, className)}
          draggable={false}
        />
        <img
          src={SRC.dark}
          alt={alt}
          className={cn("hidden object-contain shrink-0 dark:block", sizeClass, className)}
          draggable={false}
        />
      </>
    );
  }

  return (
    <img
      src={variant === "on-dark" ? SRC.dark : SRC.light}
      alt={alt}
      className={cn("object-contain shrink-0", sizeClass, className)}
      draggable={false}
    />
  );
}
