function maskCPF(v) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
function maskPhone(v) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
  }
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
}
function maskCEP(v) {
  return v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
}
function isValidCPF(cpf) {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i);
  let r = sum * 10 % 11;
  if (r === 10) r = 0;
  if (r !== parseInt(d[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i);
  r = sum * 10 % 11;
  if (r === 10) r = 0;
  return r === parseInt(d[10]);
}
function shortDisplayName(fullName) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 2) return parts.join(" ");
  return parts.slice(0, 2).join(" ");
}
function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((n) => n[0]?.toUpperCase() ?? "").join("");
}
const AVATAR_COLORS = [
  "bg-rose-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-sky-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-fuchsia-500",
  "bg-pink-500"
];
function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = h * 31 + name.charCodeAt(i) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function formatPatientAddress(p) {
  if (!p) return "";
  const line1 = [p.address_street, p.address_number, p.address_complement].filter(Boolean).join(", ");
  const line2 = [p.address_neighborhood, p.address_city, p.address_state].filter(Boolean).join(" - ");
  const cep = p.address_zip ? `CEP ${maskCEP(p.address_zip)}` : "";
  return [line1, line2, cep].filter(Boolean).join(", ");
}
function ageFromBirthDate(birth) {
  if (!birth) return null;
  const b = new Date(birth);
  if (isNaN(b.getTime())) return null;
  const now = /* @__PURE__ */ new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || m === 0 && now.getDate() < b.getDate()) age--;
  return age;
}
async function fetchCEP(cep) {
  const d = cep.replace(/\D/g, "");
  if (d.length !== 8) return null;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
    const j = await r.json();
    if (j.erro) return null;
    return {
      address_street: j.logradouro ?? "",
      address_neighborhood: j.bairro ?? "",
      address_city: j.localidade ?? "",
      address_state: j.uf ?? "",
      address_complement: j.complemento ?? ""
    };
  } catch {
    return null;
  }
}
export {
  avatarColor as a,
  maskPhone as b,
  isValidCPF as c,
  ageFromBirthDate as d,
  maskCEP as e,
  fetchCEP as f,
  formatPatientAddress as g,
  initials as i,
  maskCPF as m,
  shortDisplayName as s
};
