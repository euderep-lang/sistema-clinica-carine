import { shiftDateISO, todayISO, fmtDateLong } from "@/lib/locale";
import { startOfWeekMonday } from "@/lib/agenda-utils";

/** Extrai mês/dia (1–12 / 1–31) de birth_date YYYY-MM-DD. */
export function birthMonthDay(birthDate: string | null | undefined): { month: number; day: number } | null {
  if (!birthDate || birthDate.length < 10) return null;
  const month = Number(birthDate.slice(5, 7));
  const day = Number(birthDate.slice(8, 10));
  if (!Number.isFinite(month) || !Number.isFinite(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  return { month, day };
}

/** Aniversário neste ano civil (YYYY-MM-DD). Feb 29 em ano não-bissexto → 28/02. */
export function birthdayIsoInYear(birthDate: string, year: number): string | null {
  const md = birthMonthDay(birthDate);
  if (!md) return null;
  let { month, day } = md;
  if (month === 2 && day === 29) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    if (!leap) day = 28;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export type BirthdayWeekAlert = {
  birthdayIso: string;
  dayOfMonth: number;
  weekdayLong: string;
  /** Texto relativo ou "dia N (weekday)". */
  whenPhrase: string;
};

/**
 * Se o aniversário (neste ano) cai na semana vigente (seg–dom) que contém `refIso`,
 * retorna dados para o aviso ao profissional.
 */
export function resolveBirthdayInCurrentWeek(
  birthDate: string | null | undefined,
  refIso: string = todayISO(),
): BirthdayWeekAlert | null {
  if (!birthDate) return null;
  const year = Number(refIso.slice(0, 4));
  const birthdayIso = birthdayIsoInYear(birthDate, year);
  if (!birthdayIso) return null;

  const monday = startOfWeekMonday(refIso);
  const sunday = shiftDateISO(monday, 6);
  if (birthdayIso < monday || birthdayIso > sunday) return null;

  const dayOfMonth = Number(birthdayIso.slice(8, 10));
  const weekdayLong = fmtDateLong(birthdayIso).split(",")[0]?.trim().toLowerCase() || "";

  const yesterday = shiftDateISO(refIso, -1);
  const tomorrow = shiftDateISO(refIso, 1);

  let whenPhrase: string;
  if (birthdayIso === refIso) {
    whenPhrase = "hoje";
  } else if (birthdayIso === yesterday) {
    whenPhrase = "ontem";
  } else if (birthdayIso === tomorrow) {
    whenPhrase = "amanhã";
  } else {
    whenPhrase = `dia ${dayOfMonth} (${weekdayLong})`;
  }

  return { birthdayIso, dayOfMonth, weekdayLong, whenPhrase };
}

/** "Maria" → artigo da/do conforme sexo; neutro "de". */
export function patientPossessiveArticle(gender: string | null | undefined): "da" | "do" | "de" {
  const g = gender?.trim().toLowerCase();
  if (g === "feminino" || g === "f") return "da";
  if (g === "masculino" || g === "m") return "do";
  return "de";
}

export function buildProfessionalBirthdayAlertMessage(input: {
  professionalName: string;
  patientName: string;
  gender?: string | null;
  alert: BirthdayWeekAlert;
}): string {
  const prof = input.professionalName.trim() || "Profissional";
  const patientFirst = input.patientName.trim().split(/\s+/)[0] || "paciente";
  const art = patientPossessiveArticle(input.gender);
  return `${prof}, o aniversário ${art} ${patientFirst} é ${input.alert.whenPhrase}.`;
}
