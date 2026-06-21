import { n as normalizeBrazilPhone } from "../server.js";
function normalizeCrmPhone(phone) {
  if (!phone) return null;
  const d = normalizeBrazilPhone(phone);
  return d.length >= 12 ? d : null;
}
function buildCrmInboxSearch(options) {
  const search = {};
  if (options.conversationId) {
    search.conversation = options.conversationId;
  } else if (options.patientId) {
    search.patient = options.patientId;
  } else {
    const phone = normalizeCrmPhone(options.phone);
    if (phone) search.phone = phone;
  }
  const draft = options.draft?.trim();
  if (draft) search.draft = draft;
  return search;
}
function openCrmInbox(navigate, options) {
  const search = buildCrmInboxSearch(options);
  if (!search.conversation && !search.patient && !search.phone) return false;
  navigate({ to: "/crm/inbox", search });
  return true;
}
export {
  buildCrmInboxSearch as b,
  openCrmInbox as o
};
