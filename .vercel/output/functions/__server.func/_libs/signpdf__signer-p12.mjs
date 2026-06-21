import { r as requireLib } from "./node-forge.mjs";
import { r as requireDist } from "./signpdf__utils.mjs";
var P12Signer = {};
var hasRequiredP12Signer;
function requireP12Signer() {
  if (hasRequiredP12Signer) return P12Signer;
  hasRequiredP12Signer = 1;
  Object.defineProperty(P12Signer, "__esModule", {
    value: true
  });
  P12Signer.P12Signer = void 0;
  var _nodeForge = _interopRequireDefault(requireLib());
  var _utils = requireDist();
  function _interopRequireDefault(e) {
    return e && e.__esModule ? e : { default: e };
  }
  let P12Signer$1 = class P12Signer extends _utils.Signer {
    /**
     * @param {Buffer | Uint8Array | string} p12Buffer
     * @param {SignerOptions} additionalOptions
     */
    constructor(p12Buffer, additionalOptions = {}) {
      super();
      const buffer = (0, _utils.convertBuffer)(p12Buffer, "p12 certificate");
      this.options = {
        asn1StrictParsing: false,
        passphrase: "",
        ...additionalOptions
      };
      this.cert = _nodeForge.default.util.createBuffer(buffer.toString("binary"));
    }
    /**
     * @param {Buffer} pdfBuffer
     * @param {Date | undefined} signingTime
     * @returns {Promise<Buffer>}
     */
    async sign(pdfBuffer, signingTime = void 0) {
      if (!(pdfBuffer instanceof Buffer)) {
        throw new _utils.SignPdfError("PDF expected as Buffer.", _utils.SignPdfError.TYPE_INPUT);
      }
      const p12Asn1 = _nodeForge.default.asn1.fromDer(this.cert);
      const p12 = _nodeForge.default.pkcs12.pkcs12FromAsn1(p12Asn1, this.options.asn1StrictParsing, this.options.passphrase);
      const certBags = p12.getBags({
        bagType: _nodeForge.default.pki.oids.certBag
      })[_nodeForge.default.pki.oids.certBag];
      const keyBags = p12.getBags({
        bagType: _nodeForge.default.pki.oids.pkcs8ShroudedKeyBag
      })[_nodeForge.default.pki.oids.pkcs8ShroudedKeyBag];
      const privateKey = keyBags[0].key;
      const p7 = _nodeForge.default.pkcs7.createSignedData();
      p7.content = _nodeForge.default.util.createBuffer(pdfBuffer.toString("binary"));
      let certificate;
      Object.keys(certBags).forEach((i) => {
        const {
          publicKey
        } = certBags[i].cert;
        p7.addCertificate(certBags[i].cert);
        if (privateKey.n.compareTo(publicKey.n) === 0 && privateKey.e.compareTo(publicKey.e) === 0) {
          certificate = certBags[i].cert;
        }
      });
      if (typeof certificate === "undefined") {
        throw new _utils.SignPdfError("Failed to find a certificate that matches the private key.", _utils.SignPdfError.TYPE_INPUT);
      }
      p7.addSigner({
        key: privateKey,
        certificate,
        digestAlgorithm: _nodeForge.default.pki.oids.sha256,
        authenticatedAttributes: [{
          type: _nodeForge.default.pki.oids.contentType,
          value: _nodeForge.default.pki.oids.data
        }, {
          type: _nodeForge.default.pki.oids.signingTime,
          // value can also be auto-populated at signing time
          value: signingTime !== null && signingTime !== void 0 ? signingTime : /* @__PURE__ */ new Date()
        }, {
          type: _nodeForge.default.pki.oids.messageDigest
          // value will be auto-populated at signing time
        }]
      });
      p7.sign({
        detached: true
      });
      return Buffer.from(_nodeForge.default.asn1.toDer(p7.toAsn1()).getBytes(), "binary");
    }
  };
  P12Signer.P12Signer = P12Signer$1;
  return P12Signer;
}
var P12SignerExports = requireP12Signer();
export {
  P12SignerExports as P
};
