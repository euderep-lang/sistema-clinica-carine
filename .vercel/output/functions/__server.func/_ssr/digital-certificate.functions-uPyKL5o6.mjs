import { c as createSsrRpc } from "./createSsrRpc-fdWaaOKT.mjs";
import { a as createServerFn } from "./server-GGhSSPgi.mjs";
import { r as requireSupabaseAuth } from "./auth-middleware-DmvhAnC4.mjs";
import { o as objectType, n as numberType, s as stringType, e as enumType } from "../_libs/zod.mjs";
const getDigitalCertificateStatus = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(createSsrRpc("71c750d70428e3315d5e6f7f5e07b03902a142c18010374780185f08aca58114"));
const discoverCloudCertificates = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator(objectType({
  cpf: stringType().min(11)
})).handler(createSsrRpc("97e11653be0aad1f47ca8ad1ca69c6615004ab8bd52076ba5ed19a98fd1326f5"));
const saveDigitalCertificate = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator(objectType({
  pfxBase64: stringType().min(1),
  password: stringType().min(1),
  provider: enumType(["safeid"]).default("safeid")
})).handler(createSsrRpc("3e5795ac05a0b4b4ed7b4908631ab620d52082a388db13a3632a1a444637a940"));
const saveCloudCertificate = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator(objectType({
  cpf: stringType().min(11),
  slotAlias: stringType().min(1),
  slotLabel: stringType().optional(),
  cloudProvider: stringType().optional(),
  certificateCn: stringType().optional()
})).handler(createSsrRpc("8ed8e718e1defd8fbdc2db81b3eff5b68f2d3737fbc98b026b662c3954510dc7"));
const removeDigitalCertificate = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).handler(createSsrRpc("868198d6e2dc50f3e3e2fe6e45a4facec2ebfc98db3febf596546e43ef3d24c3"));
const safeIdOriginSchema = stringType().url().optional();
const initiateSafeIdSignatureAuth = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator(objectType({
  origin: safeIdOriginSchema
}).optional()).handler(createSsrRpc("0cd4afa449a29eabe1f29776d69596bd1feb4d0927417bfdae398c4b84de1aa1"));
const completeSafeIdOAuthCallback = createServerFn({
  method: "POST"
}).inputValidator(objectType({
  code: stringType().min(1),
  state: stringType().uuid()
})).handler(createSsrRpc("f97c850bd9b7f03b57bd5e053e2ebafc02acb9651c52ccb36111979ccc57f1fd"));
const getSafeIdSignatureAuthStatus = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator(objectType({
  origin: safeIdOriginSchema
}).optional()).handler(createSsrRpc("828a3520a35bda80f540dcd768bdb1d1b70d6792f0cd8a58fabbeef723af6252"));
const revokeSafeIdSession = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).handler(createSsrRpc("8c275d432a9b490e80534a90558ab273209eb6ea9fb3c5aea358c7b6f07e2911"));
const signPrescriptionPdf = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator(objectType({
  pdfBase64: stringType().min(1),
  reason: stringType().optional(),
  location: stringType().optional(),
  bottomMarginMm: numberType().min(0).max(80).optional(),
  signatureLineMmFromTop: numberType().min(0).max(400).optional(),
  referencePageHeightMm: numberType().min(100).max(500).optional()
})).handler(createSsrRpc("f520501ed7d2ac7dfbf33c4e34afe538ab2e3bf9f7fbb97d7ddf80056da6fbb0"));
export {
  saveCloudCertificate as a,
  revokeSafeIdSession as b,
  completeSafeIdOAuthCallback as c,
  discoverCloudCertificates as d,
  getSafeIdSignatureAuthStatus as e,
  signPrescriptionPdf as f,
  getDigitalCertificateStatus as g,
  initiateSafeIdSignatureAuth as i,
  removeDigitalCertificate as r,
  saveDigitalCertificate as s
};
