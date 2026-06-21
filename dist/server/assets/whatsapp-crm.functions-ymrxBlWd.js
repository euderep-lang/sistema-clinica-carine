import { c as createSsrRpc } from "./createSsrRpc-tPKO4KfQ.js";
import { a as createServerFn } from "./server-CAXiU2vY.js";
import { r as requireSupabaseAuth } from "./auth-middleware-BBfyoGmP.js";
const getWhatsAppConnection = createServerFn({
  method: "GET"
}).handler(createSsrRpc("f27d42c3ce51adfa7a79c7e5e40324215436e89ab8c95dad9e4ae5518e9c96f9"));
const getCrmMetrics = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(createSsrRpc("4aa2da792de5d4b9c7823144471171dec67c4059f2f5c1cd5a6544adfdbf8581"));
const closeWaConversation = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createSsrRpc("69582ce6c6f988d5d84638be7f0acfde2a645c12165ad9a689068518495e13cf"));
const reopenWaConversation = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createSsrRpc("279e782cdaa8df59cb3d7c343d79ceb5df13e00e2b098411af2b6495fe045495"));
const linkWaPatient = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createSsrRpc("44af6dd6f50019f39902e07fe7186ba1456e5be18764ea53c931b22ce1b134ab"));
const getWaQuickReplies = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(createSsrRpc("2a84e716e0a653cf67d1a4b8fc01e43c6b4b461774004d391c65ebf7ffee6b9e"));
const seedWaQuickReplies = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).handler(createSsrRpc("fc0cd45978a91ab0a63a1715b29163f2c2c0b43982f4ccd9a0865bba80db4ccd"));
const upsertWaQuickReply = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createSsrRpc("760852d44ddaf4f6f8ea0929642b4f715658bb767d0a894bbd1ad1bb5e36335a"));
const deleteWaQuickReply = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createSsrRpc("8732d73aa2f79181cabd57fd26276dee217c7ecc881668ddec45b73f00ad9643"));
const searchWaMessages = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createSsrRpc("e31f9aeaa969284b8f53a2c10f025c9ae07046bb6f5812c0fe8333517c7b0e49"));
const searchWaMessagesGlobal = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createSsrRpc("8abd1b2fa0d3d1064cfa94d9ffd68fa33bfe472dc64296c1d264b42dfa2395ad"));
const getWaPatientContext = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createSsrRpc("66a3519e0a676b3471aa961b3e78aade17b8af7d8aa3b5203a916b3c17ca3bb6"));
const assignWaConversation = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createSsrRpc("7e3fa0c774b8c8b528d61a16d35970df18ce4e679c1e3407c64d9062d7b8c6a6"));
const assignWaQueueToReception = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createSsrRpc("e1b99e9a817b7a11668ebf7cc0a70360825f208ffa0b2471e0f5f87b2df1e71f"));
const toggleWaConversationTag = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createSsrRpc("4442e7974b7b9af81ac416f0db3c8c283fabb5187bf7b51344290954fa48968d"));
createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createSsrRpc("2e34b9c43922e1b250acb296884332880a337ff3c35c54018154630c6896731c"));
const fetchWaContactPhoto = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createSsrRpc("4e872bbf5a301e00ffc48ce9f36c7bebf81d8ea0e31306d0ffbd6e445b315810"));
const syncWaChatsFromZApi = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).handler(createSsrRpc("fefa24a549fda13733190ca814994298a3c0ad40a8465af647e87d5c14bf8aa6"));
const getWaTagRules = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(createSsrRpc("ecbe918f1c6e07f50c80a89d22e4103d597b0dc60de48423d5547b857250ebbf"));
const upsertWaTagRule = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createSsrRpc("73f16b5d9a6f4a198fea001fbcef0a594213e1de50f1588b0a1dec74bc311e0e"));
const deleteWaTagRule = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createSsrRpc("849a3eb778b76b3b7879cc5d351307dfd5aa87c9553772c3b48dc49a01135ea5"));
const getWaTasks = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createSsrRpc("a8f5ca3a324ec2e8b1b7d39d4408c53c9ca0581f87f42a5a6dd534cbe38de342"));
const createWaTask = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createSsrRpc("1495dc7ac68b5d74e1e195d41b0e82bd340b3a15ea9b653508ee3821a209371e"));
const completeWaTask = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createSsrRpc("406e99b2d11572b6a337ecd70c5e39ea4c239edd9f1858ca31ac0158eafbd282"));
const ensureWaPipeline = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).handler(createSsrRpc("7423565d633f76094062bde7ca058901eaad6a4df5e08f995bb4c7daf1539caa"));
const getWaPipelineBoard = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(createSsrRpc("be72d6b913458bbf92cd2789f212eeb4e0cb4bf9c2e7da3f9fe8c25471701657"));
const createWaDeal = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createSsrRpc("83d4e1c06556eb56a5c8cd4a23d3e23f3b0cc905a532bc000fa76d12485fc802"));
const moveWaDealStage = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createSsrRpc("86b5eba7e0dcdfd97b1c7c77336286134a006c550270d95faa7f00003a5ae910"));
const getMetaWaTemplates = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(createSsrRpc("037cd96d37df64a6acf06ba5645a5a34fbb781929c32751cf20b297591b2b294"));
const sendWaBroadcast = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createSsrRpc("bb4b4b67e796b3982a1c08d2329975a71a8f7a5fffcd64c76ba4aaa3e43d74cb"));
const processWaFollowUps = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).handler(createSsrRpc("7a4c57afcfb8666fc0498bc3602b51af442f2995ba8bc288448239daaf3d5860"));
const setupPostConsultationFollowUp = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createSsrRpc("c7a96f2d1d245d3f01c8c4067b05ac75643729eb1b86853beee272b70d2b42e0"));
const triggerAppointmentFollowUp = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createSsrRpc("388f7c2a2e2922a711a118486bf3c7676db75d2575f986e976a1765f4a188e67"));
const triggerAppointmentStatusFollowUp = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createSsrRpc("768b4ba2b42860f66bba642e2c2c68c102603d27e4df3caab02de557637daac4"));
const markWaObjection = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createSsrRpc("e3dfb8cb8f9bc8ddd4bbda7fb3a2d4a00279564749dae2a047d879ba3230331c"));
const seedFollowUpQuickReplies = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).handler(createSsrRpc("f07a0a5ab4740d25788a20dcf547763aa55f4f577527fbdbf1b98941397b985a"));
const getCrmAnalytics = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(createSsrRpc("0966064fba5d0117e534488b29ec7b8cf77857bd5f3962d3df643901596a0d53"));
export {
  assignWaConversation as A,
  assignWaQueueToReception as B,
  toggleWaConversationTag as C,
  markWaObjection as D,
  processWaFollowUps as E,
  searchWaMessages as F,
  syncWaChatsFromZApi as G,
  createWaDeal as H,
  getCrmAnalytics as I,
  setupPostConsultationFollowUp as J,
  triggerAppointmentStatusFollowUp as a,
  getWhatsAppConnection as b,
  getCrmMetrics as c,
  getWaPatientContext as d,
  ensureWaPipeline as e,
  fetchWaContactPhoto as f,
  getWaPipelineBoard as g,
  getWaQuickReplies as h,
  seedFollowUpQuickReplies as i,
  deleteWaQuickReply as j,
  searchWaMessagesGlobal as k,
  getMetaWaTemplates as l,
  moveWaDealStage as m,
  sendWaBroadcast as n,
  getWaTasks as o,
  createWaTask as p,
  completeWaTask as q,
  getWaTagRules as r,
  seedWaQuickReplies as s,
  triggerAppointmentFollowUp as t,
  upsertWaQuickReply as u,
  upsertWaTagRule as v,
  deleteWaTagRule as w,
  closeWaConversation as x,
  reopenWaConversation as y,
  linkWaPatient as z
};
