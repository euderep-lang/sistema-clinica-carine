import { r as requireDist$1 } from "./signpdf__utils.mjs";
var dist = {};
var pdfkitAddPlaceholder = {};
var hasRequiredPdfkitAddPlaceholder;
function requirePdfkitAddPlaceholder() {
  if (hasRequiredPdfkitAddPlaceholder) return pdfkitAddPlaceholder;
  hasRequiredPdfkitAddPlaceholder = 1;
  Object.defineProperty(pdfkitAddPlaceholder, "__esModule", {
    value: true
  });
  pdfkitAddPlaceholder.pdfkitAddPlaceholder = void 0;
  var _utils = requireDist$1();
  const pdfkitAddPlaceholder$1 = ({
    pdf,
    pdfBuffer,
    reason,
    contactInfo,
    name,
    location,
    signingTime = void 0,
    signatureLength = _utils.DEFAULT_SIGNATURE_LENGTH,
    byteRangePlaceholder = _utils.DEFAULT_BYTE_RANGE_PLACEHOLDER,
    subFilter = _utils.SUBFILTER_ADOBE_PKCS7_DETACHED,
    widgetRect = [0, 0, 0, 0],
    appName = void 0
  }) => {
    const signature = pdf.ref({
      Type: "Sig",
      Filter: "Adobe.PPKLite",
      SubFilter: subFilter,
      ByteRange: [0, byteRangePlaceholder, byteRangePlaceholder, byteRangePlaceholder],
      Contents: Buffer.from(String.fromCharCode(0).repeat(signatureLength)),
      Reason: new String(reason),
      // eslint-disable-line no-new-wrappers
      M: signingTime !== null && signingTime !== void 0 ? signingTime : /* @__PURE__ */ new Date(),
      ContactInfo: new String(contactInfo),
      // eslint-disable-line no-new-wrappers
      Name: new String(name),
      // eslint-disable-line no-new-wrappers
      Location: new String(location),
      // eslint-disable-line no-new-wrappers
      Prop_Build: {
        Filter: {
          Name: "Adobe.PPKLite"
        },
        ...appName ? {
          App: {
            Name: appName
          }
        } : {}
      }
    });
    const isAcroFormExists = typeof pdf._root.data.AcroForm !== "undefined";
    let fieldIds = [];
    let acroFormId;
    if (isAcroFormExists) {
      const acroFormPosition = pdfBuffer.lastIndexOf("/Type /AcroForm");
      let acroFormStart = acroFormPosition;
      const charsUntilIdEnd = 10;
      const acroFormIdEnd = acroFormPosition - charsUntilIdEnd;
      const maxAcroFormIdLength = 12;
      let index = charsUntilIdEnd + 1;
      for (index; index < charsUntilIdEnd + maxAcroFormIdLength; index += 1) {
        const acroFormIdString = pdfBuffer.slice(acroFormPosition - index, acroFormIdEnd).toString();
        if (acroFormIdString[0] === "\n") {
          break;
        }
        acroFormStart = acroFormPosition - index;
      }
      const pdfSlice = pdfBuffer.slice(acroFormStart);
      const acroForm = pdfSlice.slice(0, pdfSlice.indexOf("endobj")).toString();
      acroFormId = parseInt(pdf._root.data.AcroForm.toString());
      const acroFormFields = acroForm.slice(acroForm.indexOf("/Fields [") + 9, acroForm.indexOf("]"));
      fieldIds = acroFormFields.split(" ").filter(Boolean).filter((element, i) => i % 3 === 0).map((fieldId) => new _utils.PDFKitReferenceMock(fieldId));
    }
    const signatureName = "Signature";
    const widget = pdf.ref({
      Type: "Annot",
      Subtype: "Widget",
      FT: "Sig",
      Rect: widgetRect,
      V: signature,
      T: new String(signatureName + (fieldIds.length + 1)),
      // eslint-disable-line no-new-wrappers
      F: _utils.ANNOTATION_FLAGS.PRINT,
      P: pdf.page.dictionary
      // eslint-disable-line no-underscore-dangle
    });
    pdf.page.dictionary.data.Annots = [widget];
    let form;
    if (!isAcroFormExists) {
      form = pdf.ref({
        Type: "AcroForm",
        SigFlags: _utils.SIG_FLAGS.SIGNATURES_EXIST | _utils.SIG_FLAGS.APPEND_ONLY,
        Fields: [...fieldIds, widget]
      });
    } else {
      form = pdf.ref({
        Type: "AcroForm",
        SigFlags: _utils.SIG_FLAGS.SIGNATURES_EXIST | _utils.SIG_FLAGS.APPEND_ONLY,
        Fields: [...fieldIds, widget]
      }, acroFormId);
    }
    pdf._root.data.AcroForm = form;
    return {
      signature,
      form,
      widget
    };
  };
  pdfkitAddPlaceholder.pdfkitAddPlaceholder = pdfkitAddPlaceholder$1;
  return pdfkitAddPlaceholder;
}
var hasRequiredDist;
function requireDist() {
  if (hasRequiredDist) return dist;
  hasRequiredDist = 1;
  (function(exports) {
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    var _exportNames = {
      PDFKitReferenceMock: true,
      PDFObject: true
    };
    Object.defineProperty(exports, "PDFKitReferenceMock", {
      enumerable: true,
      get: function() {
        return _utils.PDFKitReferenceMock;
      }
    });
    Object.defineProperty(exports, "PDFObject", {
      enumerable: true,
      get: function() {
        return _utils.PDFObject;
      }
    });
    var _pdfkitAddPlaceholder = requirePdfkitAddPlaceholder();
    Object.keys(_pdfkitAddPlaceholder).forEach(function(key) {
      if (key === "default" || key === "__esModule") return;
      if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
      if (key in exports && exports[key] === _pdfkitAddPlaceholder[key]) return;
      Object.defineProperty(exports, key, {
        enumerable: true,
        get: function() {
          return _pdfkitAddPlaceholder[key];
        }
      });
    });
    var _utils = requireDist$1();
  })(dist);
  return dist;
}
export {
  requireDist as r
};
