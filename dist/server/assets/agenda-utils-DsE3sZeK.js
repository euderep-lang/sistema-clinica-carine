const AGENDA_DAY_START = 8;
const AGENDA_DAY_END = 22;
const AGENDA_SLOT_MINUTES = 60;
function todayISO() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
function shiftDate(iso, days) {
  const d = /* @__PURE__ */ new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function startOfWeekMonday(iso) {
  const d = /* @__PURE__ */ new Date(`${iso}T12:00:00`);
  const weekday = d.getDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  return shiftDate(iso, diff);
}
function weekDaysFromMonday(mondayIso) {
  return Array.from({ length: 7 }, (_, i) => shiftDate(mondayIso, i));
}
function formatWeekRange(mondayIso) {
  const sunday = shiftDate(mondayIso, 6);
  const mon = /* @__PURE__ */ new Date(`${mondayIso}T12:00:00`);
  const sun = /* @__PURE__ */ new Date(`${sunday}T12:00:00`);
  const sameMonth = mon.getMonth() === sun.getMonth();
  const monPart = mon.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
  const sunPart = sun.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: sameMonth ? void 0 : "short",
    year: mon.getFullYear() !== sun.getFullYear() ? "numeric" : void 0
  });
  return `${monPart} – ${sunPart}`;
}
function addOneHour(time) {
  const [hh, mm] = time.split(":").map(Number);
  return `${String(Math.min((hh || 0) + 1, 23)).padStart(2, "0")}:${String(mm || 0).padStart(2, "0")}`;
}
function timeToMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}
function formatTimeInterval(start, end) {
  const fmt = (t) => {
    const [h, m] = t.slice(0, 5).split(":");
    const hour = Number(h);
    return m === "00" ? `${hour}h` : `${hour}h${m}`;
  };
  const endTime = (end ?? addOneHour(start)).slice(0, 5);
  return `${fmt(start)} às ${fmt(endTime)}`;
}
function phoneDigits(phone) {
  if (!phone) return "";
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("55")) return d;
  return d.length >= 10 ? `55${d}` : "";
}
function whatsappUrl(phone, message) {
  const digits = phoneDigits(phone);
  if (!digits) return null;
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
function telUrl(phone) {
  const digits = phone?.replace(/\D/g, "");
  if (!digits || digits.length < 10) return null;
  return `tel:+${digits.startsWith("55") ? digits : `55${digits}`}`;
}
function formatAgendaDate(date) {
  return (/* @__PURE__ */ new Date(`${date}T12:00:00`)).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "short"
  });
}
function buildHourSlots(startHour = AGENDA_DAY_START, endHour = AGENDA_DAY_END, stepMin = AGENDA_SLOT_MINUTES) {
  const slots = [];
  for (let m = startHour * 60; m < endHour * 60; m += stepMin) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
  }
  return slots;
}
function currentTimePercent(startHour = AGENDA_DAY_START, endHour = AGENDA_DAY_END) {
  const now = /* @__PURE__ */ new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const start = startHour * 60;
  const end = endHour * 60;
  if (mins < start || mins > end) return null;
  return (mins - start) / (end - start) * 100;
}
export {
  AGENDA_DAY_START as A,
  addOneHour as a,
  buildHourSlots as b,
  currentTimePercent as c,
  formatAgendaDate as d,
  AGENDA_SLOT_MINUTES as e,
  formatTimeInterval as f,
  AGENDA_DAY_END as g,
  todayISO as h,
  formatWeekRange as i,
  shiftDate as j,
  whatsappUrl as k,
  telUrl as l,
  startOfWeekMonday as s,
  timeToMinutes as t,
  weekDaysFromMonday as w
};
