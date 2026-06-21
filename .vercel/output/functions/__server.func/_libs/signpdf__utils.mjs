var dist = {};
var _const = {};
var hasRequired_const;
function require_const() {
  if (hasRequired_const) return _const;
  hasRequired_const = 1;
  Object.defineProperty(_const, "__esModule", {
    value: true
  });
  _const.SUBFILTER_ETSI_CADES_DETACHED = _const.SUBFILTER_ADOBE_X509_SHA1 = _const.SUBFILTER_ADOBE_PKCS7_SHA1 = _const.SUBFILTER_ADOBE_PKCS7_DETACHED = _const.SIG_FLAGS = _const.DEFAULT_SIGNATURE_LENGTH = _const.DEFAULT_BYTE_RANGE_PLACEHOLDER = _const.ANNOTATION_FLAGS = void 0;
  _const.DEFAULT_SIGNATURE_LENGTH = 8192;
  _const.DEFAULT_BYTE_RANGE_PLACEHOLDER = "**********";
  _const.SUBFILTER_ADOBE_PKCS7_DETACHED = "adbe.pkcs7.detached";
  _const.SUBFILTER_ADOBE_PKCS7_SHA1 = "adbe.pkcs7.sha1";
  _const.SUBFILTER_ADOBE_X509_SHA1 = "adbe.x509.rsa.sha1";
  _const.SUBFILTER_ETSI_CADES_DETACHED = "ETSI.CAdES.detached";
  _const.SIG_FLAGS = {
    /**
     * If set, the document contains at least one signature field.
     */
    SIGNATURES_EXIST: 1,
    /**
     * If set, the document contains signatures that may be invalidated
     * if the file is saved (written) in a way that alters its previous contents.
     */
    APPEND_ONLY: 2
  };
  _const.ANNOTATION_FLAGS = {
    /**
     * If set, do not display the annotation if it does not belong to one of the
     * standard annotation types and no annotation handler is available.
     */
    INVISIBLE: 1,
    /**
     * If set, do not display or print the annotation or allow it to interact with the user,
     * regardless of its annotation type or whether an annotation handler is available.
     */
    HIDDEN: 2,
    /**
     * If set, print the annotation when the page is printed. If clear, never print the
     * annotation, regardless of whether it is displayed on the screen.
     */
    PRINT: 4,
    /**
     * If set, do not scale the annotation’s appearance to match the magnification of the page.
     */
    NO_ZOOM: 8,
    /**
     * If set, do not rotate the annotation’s appearance to match the rotation of the page.
     */
    NO_ROTATE: 16,
    /**
     * If set, do not display the annotation on the screen or allow it to interact with the user.
     */
    NO_VIEW: 32,
    /**
     * If set, do not allow the annotation to interact with the user.
     */
    READ_ONLY: 64
  };
  return _const;
}
var convertBuffer = {};
var SignPdfError = {};
var hasRequiredSignPdfError;
function requireSignPdfError() {
  if (hasRequiredSignPdfError) return SignPdfError;
  hasRequiredSignPdfError = 1;
  Object.defineProperty(SignPdfError, "__esModule", {
    value: true
  });
  SignPdfError.SignPdfError = SignPdfError.ERROR_VERIFY_SIGNATURE = SignPdfError.ERROR_TYPE_UNKNOWN = SignPdfError.ERROR_TYPE_PARSE = SignPdfError.ERROR_TYPE_INPUT = void 0;
  const ERROR_TYPE_UNKNOWN = SignPdfError.ERROR_TYPE_UNKNOWN = 1;
  const ERROR_TYPE_INPUT = SignPdfError.ERROR_TYPE_INPUT = 2;
  const ERROR_TYPE_PARSE = SignPdfError.ERROR_TYPE_PARSE = 3;
  const ERROR_VERIFY_SIGNATURE = SignPdfError.ERROR_VERIFY_SIGNATURE = 4;
  let SignPdfError$1 = class SignPdfError extends Error {
    constructor(msg, type = ERROR_TYPE_UNKNOWN) {
      super(msg);
      this.type = type;
    }
  };
  SignPdfError.SignPdfError = SignPdfError$1;
  SignPdfError$1.TYPE_UNKNOWN = ERROR_TYPE_UNKNOWN;
  SignPdfError$1.TYPE_INPUT = ERROR_TYPE_INPUT;
  SignPdfError$1.TYPE_PARSE = ERROR_TYPE_PARSE;
  SignPdfError$1.VERIFY_SIGNATURE = ERROR_VERIFY_SIGNATURE;
  return SignPdfError;
}
var hasRequiredConvertBuffer;
function requireConvertBuffer() {
  if (hasRequiredConvertBuffer) return convertBuffer;
  hasRequiredConvertBuffer = 1;
  Object.defineProperty(convertBuffer, "__esModule", {
    value: true
  });
  convertBuffer.convertBuffer = convertBuffer$1;
  var _SignPdfError = requireSignPdfError();
  function convertBuffer$1(input, name) {
    if (typeof input === "string") {
      return Buffer.from(input, "base64");
    }
    if (input instanceof Buffer || input instanceof Uint8Array) {
      return Buffer.from(input);
    }
    throw new _SignPdfError.SignPdfError(`${name} expected as Buffer, Uint8Array or base64-encoded string.`, _SignPdfError.SignPdfError.TYPE_INPUT);
  }
  return convertBuffer;
}
var extractSignature = {};
var hasRequiredExtractSignature;
function requireExtractSignature() {
  if (hasRequiredExtractSignature) return extractSignature;
  hasRequiredExtractSignature = 1;
  Object.defineProperty(extractSignature, "__esModule", {
    value: true
  });
  extractSignature.extractSignature = void 0;
  var _SignPdfError = requireSignPdfError();
  const getSubstringIndex = (str, substring, n) => {
    let times = 0;
    let index = null;
    while (times < n && index !== -1) {
      index = str.indexOf(substring, index + 1);
      times += 1;
    }
    return index;
  };
  const extractSignature$1 = (pdf, signatureCount = 1) => {
    if (!(pdf instanceof Buffer)) {
      throw new _SignPdfError.SignPdfError("PDF expected as Buffer.", _SignPdfError.SignPdfError.TYPE_INPUT);
    }
    const byteRangePos = getSubstringIndex(pdf, "/ByteRange [", signatureCount);
    if (byteRangePos === -1) {
      throw new _SignPdfError.SignPdfError("Failed to locate ByteRange.", _SignPdfError.SignPdfError.TYPE_PARSE);
    }
    const byteRangeEnd = pdf.indexOf("]", byteRangePos);
    if (byteRangeEnd === -1) {
      throw new _SignPdfError.SignPdfError("Failed to locate the end of the ByteRange.", _SignPdfError.SignPdfError.TYPE_PARSE);
    }
    const byteRange = pdf.slice(byteRangePos, byteRangeEnd + 1).toString();
    const matches = /\/ByteRange \[(\d+) +(\d+) +(\d+) +(\d+) *\]/.exec(byteRange);
    if (matches === null) {
      throw new _SignPdfError.SignPdfError("Failed to parse the ByteRange.", _SignPdfError.SignPdfError.TYPE_PARSE);
    }
    const ByteRange = matches.slice(1).map(Number);
    const signedData = Buffer.concat([pdf.slice(ByteRange[0], ByteRange[0] + ByteRange[1]), pdf.slice(ByteRange[2], ByteRange[2] + ByteRange[3])]);
    const signatureHex = pdf.slice(ByteRange[0] + ByteRange[1] + 1, ByteRange[2]).toString("binary").replace(/(?:00|>)+$/, "");
    const signature = Buffer.from(signatureHex, "hex").toString("binary");
    return {
      ByteRange: matches.slice(1, 5).map(Number),
      signature,
      signedData
    };
  };
  extractSignature.extractSignature = extractSignature$1;
  return extractSignature;
}
var findByteRange = {};
var hasRequiredFindByteRange;
function requireFindByteRange() {
  if (hasRequiredFindByteRange) return findByteRange;
  hasRequiredFindByteRange = 1;
  Object.defineProperty(findByteRange, "__esModule", {
    value: true
  });
  findByteRange.findByteRange = void 0;
  var _SignPdfError = requireSignPdfError();
  var _const2 = require_const();
  const findByteRange$1 = (pdf, placeholder = _const2.DEFAULT_BYTE_RANGE_PLACEHOLDER) => {
    if (!(pdf instanceof Buffer)) {
      throw new _SignPdfError.SignPdfError("PDF expected as Buffer.", _SignPdfError.SignPdfError.TYPE_INPUT);
    }
    let byteRangePlaceholder;
    let byteRangePlaceholderPosition;
    const byteRangeStrings = [];
    const byteRanges = [];
    let offset = 0;
    do {
      const position = pdf.indexOf("/ByteRange", offset);
      if (position === -1) {
        break;
      }
      const rangeStart = pdf.indexOf("[", position);
      const rangeEnd = pdf.indexOf("]", rangeStart);
      const byteRangeString = pdf.subarray(position, rangeEnd + 1);
      byteRangeStrings.push(byteRangeString.toString());
      const range = pdf.subarray(rangeStart + 1, rangeEnd).toString().split(" ").filter((c) => c !== "").map((c) => c.trim());
      byteRanges.push(range);
      const placeholderName = `/${placeholder}`;
      if (range[0] === "0" && range[1] === placeholderName && range[2] === placeholderName && range[3] === placeholderName) {
        if (typeof byteRangePlaceholder !== "undefined") {
          throw new _SignPdfError.SignPdfError("Found multiple ByteRange placeholders.", _SignPdfError.SignPdfError.TYPE_INPUT);
        }
        byteRangePlaceholder = byteRangeString.toString();
        byteRangePlaceholderPosition = position;
      }
      offset = rangeEnd;
    } while (true);
    return {
      byteRangePlaceholder,
      byteRangePlaceholderPosition,
      byteRangeStrings,
      byteRanges
    };
  };
  findByteRange.findByteRange = findByteRange$1;
  return findByteRange;
}
var removeTrailingNewLine = {};
var hasRequiredRemoveTrailingNewLine;
function requireRemoveTrailingNewLine() {
  if (hasRequiredRemoveTrailingNewLine) return removeTrailingNewLine;
  hasRequiredRemoveTrailingNewLine = 1;
  Object.defineProperty(removeTrailingNewLine, "__esModule", {
    value: true
  });
  removeTrailingNewLine.removeTrailingNewLine = void 0;
  var _SignPdfError = requireSignPdfError();
  const sliceLastChar = (pdf, character) => {
    const lastChar = pdf.subarray(pdf.length - 1).toString();
    if (lastChar === character) {
      return pdf.subarray(0, pdf.length - 1);
    }
    return pdf;
  };
  const removeTrailingNewLine$1 = (pdf) => {
    if (!(pdf instanceof Buffer)) {
      throw new _SignPdfError.SignPdfError("PDF expected as Buffer.", _SignPdfError.SignPdfError.TYPE_INPUT);
    }
    let output = pdf;
    output = sliceLastChar(output, "\n");
    output = sliceLastChar(output, "\r");
    const lastLine = output.subarray(output.length - 6).toString();
    if (lastLine !== "\n%%EOF" && lastLine !== "\r%%EOF") {
      throw new _SignPdfError.SignPdfError("A PDF file must end with an EOF line.", _SignPdfError.SignPdfError.TYPE_PARSE);
    }
    return output;
  };
  removeTrailingNewLine.removeTrailingNewLine = removeTrailingNewLine$1;
  return removeTrailingNewLine;
}
var Signer = {};
var hasRequiredSigner;
function requireSigner() {
  if (hasRequiredSigner) return Signer;
  hasRequiredSigner = 1;
  Object.defineProperty(Signer, "__esModule", {
    value: true
  });
  Signer.Signer = void 0;
  var _SignPdfError = requireSignPdfError();
  let Signer$1 = class Signer {
    /**
     * @param {Buffer} pdfBuffer
     * @param {Date | undefined} signingTime
     * @returns {Promise<Buffer>}
     */
    async sign(pdfBuffer, signingTime = void 0) {
      throw new _SignPdfError.SignPdfError(`sign() is not implemented on ${this.constructor.name}`, _SignPdfError.SignPdfError.TYPE_INPUT);
    }
  };
  Signer.Signer = Signer$1;
  return Signer;
}
var PDFObject = {};
var PDFAbstractReference = {};
var hasRequiredPDFAbstractReference;
function requirePDFAbstractReference() {
  if (hasRequiredPDFAbstractReference) return PDFAbstractReference;
  hasRequiredPDFAbstractReference = 1;
  Object.defineProperty(PDFAbstractReference, "__esModule", {
    value: true
  });
  PDFAbstractReference.PDFAbstractReference = void 0;
  let PDFAbstractReference$1 = class PDFAbstractReference {
    toString() {
      throw new Error("Must be implemented by subclasses");
    }
    end() {
    }
  };
  PDFAbstractReference.PDFAbstractReference = PDFAbstractReference$1;
  return PDFAbstractReference;
}
var hasRequiredPDFObject;
function requirePDFObject() {
  if (hasRequiredPDFObject) return PDFObject;
  hasRequiredPDFObject = 1;
  Object.defineProperty(PDFObject, "__esModule", {
    value: true
  });
  PDFObject.PDFObject = void 0;
  var _PDFAbstractReference = requirePDFAbstractReference();
  const pad = (str, length) => (Array(length + 1).join("0") + str).slice(-length);
  const escapableRe = /[\n\r\t\b\f()\\]/g;
  const escapable = {
    "\n": "\\n",
    "\r": "\\r",
    "	": "\\t",
    "\b": "\\b",
    "\f": "\\f",
    "\\": "\\\\",
    "(": "\\(",
    ")": "\\)"
  };
  const swapBytes = (buff) => buff.swap16();
  let PDFObject$1 = class PDFObject2 {
    static convert(object, encryptFn = null) {
      if (typeof object === "string") {
        return `/${object}`;
      }
      if (object instanceof String) {
        let string = object;
        let isUnicode = false;
        for (let i = 0, end = string.length; i < end; i += 1) {
          if (string.charCodeAt(i) > 127) {
            isUnicode = true;
            break;
          }
        }
        let stringBuffer;
        if (isUnicode) {
          stringBuffer = swapBytes(Buffer.from(`\uFEFF${string}`, "utf16le"));
        } else {
          stringBuffer = Buffer.from(string, "ascii");
        }
        if (encryptFn) {
          string = encryptFn(stringBuffer).toString("binary");
        } else {
          string = stringBuffer.toString("binary");
        }
        string = string.replace(escapableRe, (c) => escapable[c]);
        return `(${string})`;
      }
      if (Buffer.isBuffer(object)) {
        return `<${object.toString("hex")}>`;
      }
      if (object instanceof _PDFAbstractReference.PDFAbstractReference) {
        return object.toString();
      }
      if (object instanceof Date) {
        let string = `D:${pad(object.getUTCFullYear(), 4)}${pad(object.getUTCMonth() + 1, 2)}${pad(object.getUTCDate(), 2)}${pad(object.getUTCHours(), 2)}${pad(object.getUTCMinutes(), 2)}${pad(object.getUTCSeconds(), 2)}Z`;
        if (encryptFn) {
          string = encryptFn(Buffer.from(string, "ascii")).toString("binary");
          string = string.replace(escapableRe, (c) => escapable[c]);
        }
        return `(${string})`;
      }
      if (Array.isArray(object)) {
        const items = object.map((e) => PDFObject2.convert(e, encryptFn)).join(" ");
        return `[${items}]`;
      }
      if ({}.toString.call(object) === "[object Object]") {
        const out = ["<<"];
        let streamData;
        Object.entries(object).forEach(([key, val]) => {
          let checkedValue = "";
          if (val.toString().indexOf("<<") !== -1) {
            checkedValue = val;
          } else {
            checkedValue = PDFObject2.convert(val, encryptFn);
          }
          if (key === "stream") {
            streamData = `${key}
${val}
endstream`;
          } else {
            out.push(`/${key} ${checkedValue}`);
          }
        });
        out.push(">>");
        if (streamData) {
          out.push(streamData);
        }
        return out.join("\n");
      }
      if (typeof object === "number") {
        return PDFObject2.number(object);
      }
      return `${object}`;
    }
    static number(n) {
      if (n > -1e21 && n < 1e21) {
        return Math.round(n * 1e6) / 1e6;
      }
      throw new Error(`unsupported number: ${n}`);
    }
  };
  PDFObject.PDFObject = PDFObject$1;
  return PDFObject;
}
var PDFKitReferenceMock = {};
var hasRequiredPDFKitReferenceMock;
function requirePDFKitReferenceMock() {
  if (hasRequiredPDFKitReferenceMock) return PDFKitReferenceMock;
  hasRequiredPDFKitReferenceMock = 1;
  Object.defineProperty(PDFKitReferenceMock, "__esModule", {
    value: true
  });
  PDFKitReferenceMock.PDFKitReferenceMock = void 0;
  var _PDFAbstractReference = requirePDFAbstractReference();
  let PDFKitReferenceMock$1 = class PDFKitReferenceMock extends _PDFAbstractReference.PDFAbstractReference {
    constructor(index, additionalData = void 0) {
      super();
      this.index = index;
      if (typeof additionalData !== "undefined") {
        Object.assign(this, additionalData);
      }
    }
    toString() {
      return `${this.index} 0 R`;
    }
  };
  PDFKitReferenceMock.PDFKitReferenceMock = PDFKitReferenceMock$1;
  return PDFKitReferenceMock;
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
      PDFObject: true
    };
    Object.defineProperty(exports, "PDFObject", {
      enumerable: true,
      get: function() {
        return _PDFObject.PDFObject;
      }
    });
    var _const2 = require_const();
    Object.keys(_const2).forEach(function(key) {
      if (key === "default" || key === "__esModule") return;
      if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
      if (key in exports && exports[key] === _const2[key]) return;
      Object.defineProperty(exports, key, {
        enumerable: true,
        get: function() {
          return _const2[key];
        }
      });
    });
    var _convertBuffer = requireConvertBuffer();
    Object.keys(_convertBuffer).forEach(function(key) {
      if (key === "default" || key === "__esModule") return;
      if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
      if (key in exports && exports[key] === _convertBuffer[key]) return;
      Object.defineProperty(exports, key, {
        enumerable: true,
        get: function() {
          return _convertBuffer[key];
        }
      });
    });
    var _extractSignature = requireExtractSignature();
    Object.keys(_extractSignature).forEach(function(key) {
      if (key === "default" || key === "__esModule") return;
      if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
      if (key in exports && exports[key] === _extractSignature[key]) return;
      Object.defineProperty(exports, key, {
        enumerable: true,
        get: function() {
          return _extractSignature[key];
        }
      });
    });
    var _findByteRange = requireFindByteRange();
    Object.keys(_findByteRange).forEach(function(key) {
      if (key === "default" || key === "__esModule") return;
      if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
      if (key in exports && exports[key] === _findByteRange[key]) return;
      Object.defineProperty(exports, key, {
        enumerable: true,
        get: function() {
          return _findByteRange[key];
        }
      });
    });
    var _removeTrailingNewLine = requireRemoveTrailingNewLine();
    Object.keys(_removeTrailingNewLine).forEach(function(key) {
      if (key === "default" || key === "__esModule") return;
      if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
      if (key in exports && exports[key] === _removeTrailingNewLine[key]) return;
      Object.defineProperty(exports, key, {
        enumerable: true,
        get: function() {
          return _removeTrailingNewLine[key];
        }
      });
    });
    var _SignPdfError = requireSignPdfError();
    Object.keys(_SignPdfError).forEach(function(key) {
      if (key === "default" || key === "__esModule") return;
      if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
      if (key in exports && exports[key] === _SignPdfError[key]) return;
      Object.defineProperty(exports, key, {
        enumerable: true,
        get: function() {
          return _SignPdfError[key];
        }
      });
    });
    var _Signer = requireSigner();
    Object.keys(_Signer).forEach(function(key) {
      if (key === "default" || key === "__esModule") return;
      if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
      if (key in exports && exports[key] === _Signer[key]) return;
      Object.defineProperty(exports, key, {
        enumerable: true,
        get: function() {
          return _Signer[key];
        }
      });
    });
    var _PDFObject = requirePDFObject();
    var _PDFAbstractReference = requirePDFAbstractReference();
    Object.keys(_PDFAbstractReference).forEach(function(key) {
      if (key === "default" || key === "__esModule") return;
      if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
      if (key in exports && exports[key] === _PDFAbstractReference[key]) return;
      Object.defineProperty(exports, key, {
        enumerable: true,
        get: function() {
          return _PDFAbstractReference[key];
        }
      });
    });
    var _PDFKitReferenceMock = requirePDFKitReferenceMock();
    Object.keys(_PDFKitReferenceMock).forEach(function(key) {
      if (key === "default" || key === "__esModule") return;
      if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
      if (key in exports && exports[key] === _PDFKitReferenceMock[key]) return;
      Object.defineProperty(exports, key, {
        enumerable: true,
        get: function() {
          return _PDFKitReferenceMock[key];
        }
      });
    });
  })(dist);
  return dist;
}
export {
  requireDist as r
};
