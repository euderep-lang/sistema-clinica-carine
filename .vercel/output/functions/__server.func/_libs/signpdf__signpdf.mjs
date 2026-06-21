import { r as requireDist } from "./signpdf__utils.mjs";
var signpdf = {};
var hasRequiredSignpdf;
function requireSignpdf() {
  if (hasRequiredSignpdf) return signpdf;
  hasRequiredSignpdf = 1;
  (function(exports) {
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.SignPdf = void 0;
    Object.defineProperty(exports, "SignPdfError", {
      enumerable: true,
      get: function() {
        return _utils.SignPdfError;
      }
    });
    Object.defineProperty(exports, "Signer", {
      enumerable: true,
      get: function() {
        return _utils.Signer;
      }
    });
    exports.default = void 0;
    var _utils = requireDist();
    class SignPdf {
      constructor() {
        this.lastSignature = null;
      }
      /**
       * @param {Buffer | Uint8Array | string} pdfBuffer
       * @param {Signer} signer
       * @param {Date | undefined} signingTime
       * @returns {Promise<Buffer>}
       */
      async sign(pdfBuffer, signer, signingTime = void 0) {
        if (!(signer instanceof _utils.Signer)) {
          throw new _utils.SignPdfError("Signer implementation expected.", _utils.SignPdfError.TYPE_INPUT);
        }
        let pdf = (0, _utils.removeTrailingNewLine)((0, _utils.convertBuffer)(pdfBuffer, "PDF"));
        const {
          byteRangePlaceholder,
          byteRangePlaceholderPosition
        } = (0, _utils.findByteRange)(pdf);
        if (!byteRangePlaceholder) {
          throw new _utils.SignPdfError("No ByteRangeStrings found within PDF buffer.", _utils.SignPdfError.TYPE_PARSE);
        }
        const byteRangeEnd = byteRangePlaceholderPosition + byteRangePlaceholder.length;
        const contentsTagPos = pdf.indexOf("/Contents ", byteRangeEnd);
        const placeholderPos = pdf.indexOf("<", contentsTagPos);
        const placeholderEnd = pdf.indexOf(">", placeholderPos);
        const placeholderLengthWithBrackets = placeholderEnd + 1 - placeholderPos;
        const placeholderLength = placeholderLengthWithBrackets - 2;
        const byteRange = [0, 0, 0, 0];
        byteRange[1] = placeholderPos;
        byteRange[2] = byteRange[1] + placeholderLengthWithBrackets;
        byteRange[3] = pdf.length - byteRange[2];
        let actualByteRange = `/ByteRange [${byteRange.join(" ")}]`;
        actualByteRange += " ".repeat(byteRangePlaceholder.length - actualByteRange.length);
        pdf = Buffer.concat([pdf.slice(0, byteRangePlaceholderPosition), Buffer.from(actualByteRange), pdf.slice(byteRangeEnd)]);
        pdf = Buffer.concat([pdf.slice(0, byteRange[1]), pdf.slice(byteRange[2], byteRange[2] + byteRange[3])]);
        const raw = await signer.sign(pdf, signingTime);
        if (raw.length * 2 > placeholderLength) {
          throw new _utils.SignPdfError(`Signature exceeds placeholder length: ${raw.length * 2} > ${placeholderLength}`, _utils.SignPdfError.TYPE_INPUT);
        }
        let signature = Buffer.from(raw, "binary").toString("hex");
        this.lastSignature = signature;
        signature += Buffer.from(String.fromCharCode(0).repeat(placeholderLength / 2 - raw.length)).toString("hex");
        pdf = Buffer.concat([pdf.slice(0, byteRange[1]), Buffer.from(`<${signature}>`), pdf.slice(byteRange[1])]);
        return pdf;
      }
    }
    exports.SignPdf = SignPdf;
    exports.default = new SignPdf();
  })(signpdf);
  return signpdf;
}
var signpdfExports = requireSignpdf();
export {
  signpdfExports as s
};
