import { r as requireDist$1 } from "./signpdf__placeholder-pdfkit010.mjs";
import { r as requireDist } from "./signpdf__utils.mjs";
var plainAddPlaceholder = {};
var getIndexFromRef = {};
var hasRequiredGetIndexFromRef;
function requireGetIndexFromRef() {
  if (hasRequiredGetIndexFromRef) return getIndexFromRef;
  hasRequiredGetIndexFromRef = 1;
  Object.defineProperty(getIndexFromRef, "__esModule", {
    value: true
  });
  getIndexFromRef.default = void 0;
  var _utils = requireDist();
  const getIndexFromRef$1 = (refTable, ref) => {
    let [index] = ref.split(" ");
    index = parseInt(index);
    if (!refTable.offsets.has(index)) {
      throw new _utils.SignPdfError(`Failed to locate object "${ref}".`, _utils.SignPdfError.TYPE_PARSE);
    }
    return index;
  };
  getIndexFromRef.default = getIndexFromRef$1;
  return getIndexFromRef;
}
var readPdf = {};
var readRefTable = {};
var xrefToRefMap = {};
var hasRequiredXrefToRefMap;
function requireXrefToRefMap() {
  if (hasRequiredXrefToRefMap) return xrefToRefMap;
  hasRequiredXrefToRefMap = 1;
  Object.defineProperty(xrefToRefMap, "__esModule", {
    value: true
  });
  xrefToRefMap.default = void 0;
  var _utils = requireDist();
  const xrefToRefMap$1 = (xrefString) => {
    const lines = xrefString.split("\n").filter((l) => l !== "");
    let index = 0;
    let expectedLines = 0;
    const xref = /* @__PURE__ */ new Map();
    lines.forEach((line) => {
      const split = line.split(" ");
      if (split.length === 2) {
        index = parseInt(split[0]);
        expectedLines = parseInt(split[1]);
        return;
      }
      if (expectedLines <= 0) {
        throw new _utils.SignPdfError("Too many lines in xref table.", _utils.SignPdfError.TYPE_PARSE);
      }
      expectedLines -= 1;
      const [offset, , inUse] = split;
      if (inUse.trim() === "f") {
        index += 1;
        return;
      }
      if (inUse.trim() !== "n") {
        throw new _utils.SignPdfError(`Unknown in-use flag "${inUse}". Expected "n" or "f".`, _utils.SignPdfError.TYPE_PARSE);
      }
      if (!/^\d+$/.test(offset.trim())) {
        throw new _utils.SignPdfError(`Expected integer offset. Got "${offset}".`, _utils.SignPdfError.TYPE_PARSE);
      }
      const storeOffset = parseInt(offset.trim());
      xref.set(index, storeOffset);
      index += 1;
    });
    return xref;
  };
  xrefToRefMap.default = xrefToRefMap$1;
  return xrefToRefMap;
}
var hasRequiredReadRefTable;
function requireReadRefTable() {
  if (hasRequiredReadRefTable) return readRefTable;
  hasRequiredReadRefTable = 1;
  Object.defineProperty(readRefTable, "__esModule", {
    value: true
  });
  readRefTable.getXref = readRefTable.getLastTrailerPosition = readRefTable.getFullXrefTable = readRefTable.default = void 0;
  var _utils = requireDist();
  var _xrefToRefMap = _interopRequireDefault(requireXrefToRefMap());
  function _interopRequireDefault(e) {
    return e && e.__esModule ? e : { default: e };
  }
  const getLastTrailerPosition = (pdf) => {
    const trailerStart = pdf.lastIndexOf(Buffer.from("trailer", "utf8"));
    const trailer = pdf.slice(trailerStart, pdf.length - 6);
    const xRefPosition = trailer.slice(trailer.lastIndexOf(Buffer.from("startxref", "utf8")) + 10).toString();
    return parseInt(xRefPosition);
  };
  readRefTable.getLastTrailerPosition = getLastTrailerPosition;
  const getXref = (pdf, position) => {
    let refTable = pdf.slice(position);
    const realPosition = refTable.indexOf(Buffer.from("xref", "utf8"));
    if (realPosition === -1) {
      throw new _utils.SignPdfError(`Could not find xref anywhere at or after ${position}.`, _utils.SignPdfError.TYPE_PARSE);
    }
    if (realPosition > 0) {
      const prefix = refTable.slice(0, realPosition);
      if (prefix.toString().replace(/\s*/g, "") !== "") {
        throw new _utils.SignPdfError(`Expected xref at ${position} but found other content.`, _utils.SignPdfError.TYPE_PARSE);
      }
    }
    const nextEofPosition = refTable.indexOf(Buffer.from("%%EOF", "utf8"));
    if (nextEofPosition === -1) {
      throw new _utils.SignPdfError("Expected EOF after xref and trailer but could not find one.", _utils.SignPdfError.TYPE_PARSE);
    }
    refTable = refTable.slice(0, nextEofPosition);
    refTable = refTable.slice(realPosition + 4);
    refTable = refTable.slice(refTable.indexOf("\n") + 1);
    let size = refTable.toString().split("/Size")[1];
    if (!size) {
      throw new _utils.SignPdfError("Size not found in xref table.", _utils.SignPdfError.TYPE_PARSE);
    }
    size = /^\s*(\d+)/.exec(size);
    if (size === null) {
      throw new _utils.SignPdfError("Failed to parse size of xref table.", _utils.SignPdfError.TYPE_PARSE);
    }
    size = parseInt(size[1]);
    const [objects, infos] = refTable.toString().split("trailer");
    const isContainingPrev = infos.split("/Prev")[1] != null;
    let prev;
    if (isContainingPrev) {
      const pagesRefRegex = /Prev (\d+)/g;
      const match = pagesRefRegex.exec(infos);
      const [, prevPosition] = match;
      prev = prevPosition;
    }
    const xRefContent = (0, _xrefToRefMap.default)(objects);
    return {
      size,
      prev,
      xRefContent
    };
  };
  readRefTable.getXref = getXref;
  const getFullXref = (pdf, xRefPosition) => {
    const lastXrefTable = getXref(pdf, xRefPosition);
    if (lastXrefTable.prev === void 0) {
      return lastXrefTable.xRefContent;
    }
    const partOfXrefTable = getFullXref(pdf, lastXrefTable.prev);
    const mergedXrefTable = new Map([...partOfXrefTable, ...lastXrefTable.xRefContent]);
    return mergedXrefTable;
  };
  const getFullXrefTable = (pdf) => {
    const lastTrailerPosition = getLastTrailerPosition(pdf);
    return getFullXref(pdf, lastTrailerPosition);
  };
  readRefTable.getFullXrefTable = getFullXrefTable;
  const readRefTable$1 = (pdf) => {
    const fullXrefTable = getFullXrefTable(pdf);
    const startingIndex = 0;
    const maxIndex = Math.max(...fullXrefTable.keys());
    return {
      startingIndex,
      maxIndex,
      offsets: fullXrefTable
    };
  };
  readRefTable.default = readRefTable$1;
  return readRefTable;
}
var findObject = {};
var hasRequiredFindObject;
function requireFindObject() {
  if (hasRequiredFindObject) return findObject;
  hasRequiredFindObject = 1;
  Object.defineProperty(findObject, "__esModule", {
    value: true
  });
  findObject.default = void 0;
  var _getIndexFromRef = _interopRequireDefault(requireGetIndexFromRef());
  function _interopRequireDefault(e) {
    return e && e.__esModule ? e : { default: e };
  }
  const findObject$1 = (pdf, refTable, ref) => {
    const index = (0, _getIndexFromRef.default)(refTable, ref);
    const offset = refTable.offsets.get(index);
    let slice = pdf.slice(offset);
    slice = slice.slice(0, slice.indexOf("endobj", "utf8"));
    slice = slice.slice(slice.indexOf("<<", "utf8") + 2);
    slice = slice.slice(0, slice.lastIndexOf(">>", "utf8"));
    return slice;
  };
  findObject.default = findObject$1;
  return findObject;
}
var hasRequiredReadPdf;
function requireReadPdf() {
  if (hasRequiredReadPdf) return readPdf;
  hasRequiredReadPdf = 1;
  Object.defineProperty(readPdf, "__esModule", {
    value: true
  });
  readPdf.getValue = readPdf.default = void 0;
  var _readRefTable = _interopRequireDefault(requireReadRefTable());
  var _findObject = _interopRequireDefault(requireFindObject());
  function _interopRequireDefault(e) {
    return e && e.__esModule ? e : { default: e };
  }
  const getValue = (trailer, key) => {
    let index = trailer.indexOf(key);
    if (index === -1) {
      return void 0;
    }
    const slice = trailer.slice(index);
    index = slice.indexOf("/", 1);
    if (index === -1) {
      index = slice.indexOf(">", 1);
    }
    return slice.slice(key.length + 1, index).toString().trim();
  };
  readPdf.getValue = getValue;
  const readPdf$1 = (pdfBuffer) => {
    const trailerStart = pdfBuffer.lastIndexOf("trailer");
    const trailer = pdfBuffer.slice(trailerStart, pdfBuffer.length - 6);
    let xRefPosition = trailer.slice(trailer.lastIndexOf("startxref") + 10).toString();
    xRefPosition = parseInt(xRefPosition);
    const refTable = (0, _readRefTable.default)(pdfBuffer);
    const rootRef = getValue(trailer, "/Root");
    const root = (0, _findObject.default)(pdfBuffer, refTable, rootRef).toString();
    const infoRef = getValue(trailer, "/Info");
    return {
      xref: refTable,
      rootRef,
      root,
      infoRef,
      trailerStart,
      previousXrefs: [],
      xRefPosition
    };
  };
  readPdf.default = readPdf$1;
  return readPdf;
}
var getPageRef = {};
var getPagesDictionaryRef = {};
var hasRequiredGetPagesDictionaryRef;
function requireGetPagesDictionaryRef() {
  if (hasRequiredGetPagesDictionaryRef) return getPagesDictionaryRef;
  hasRequiredGetPagesDictionaryRef = 1;
  Object.defineProperty(getPagesDictionaryRef, "__esModule", {
    value: true
  });
  getPagesDictionaryRef.default = getPagesDictionaryRef$1;
  var _utils = requireDist();
  function getPagesDictionaryRef$1(info) {
    const pagesRefRegex = /\/Pages\s+(\d+\s+\d+\s+R)/g;
    const match = pagesRefRegex.exec(info.root);
    if (match === null) {
      throw new _utils.SignPdfError("Failed to find the pages descriptor. This is probably a problem in node-signpdf.", _utils.SignPdfError.TYPE_PARSE);
    }
    return match[1];
  }
  return getPagesDictionaryRef;
}
var hasRequiredGetPageRef;
function requireGetPageRef() {
  if (hasRequiredGetPageRef) return getPageRef;
  hasRequiredGetPageRef = 1;
  Object.defineProperty(getPageRef, "__esModule", {
    value: true
  });
  getPageRef.default = getPageRef$1;
  var _getPagesDictionaryRef = _interopRequireDefault(requireGetPagesDictionaryRef());
  var _findObject = _interopRequireDefault(requireFindObject());
  function _interopRequireDefault(e) {
    return e && e.__esModule ? e : { default: e };
  }
  function getPageRef$1(pdfBuffer, info) {
    const pagesRef = (0, _getPagesDictionaryRef.default)(info);
    const pagesDictionary = (0, _findObject.default)(pdfBuffer, info.xref, pagesRef);
    const kidsPosition = pagesDictionary.indexOf("/Kids");
    const kidsStart = pagesDictionary.indexOf("[", kidsPosition) + 1;
    const kidsEnd = pagesDictionary.indexOf("]", kidsPosition);
    const pages = pagesDictionary.slice(kidsStart, kidsEnd).toString();
    const split = pages.trim().split(" ", 3);
    return `${split[0]} ${split[1]} ${split[2]}`;
  }
  return getPageRef;
}
var createBufferRootWithAcroform = {};
var hasRequiredCreateBufferRootWithAcroform;
function requireCreateBufferRootWithAcroform() {
  if (hasRequiredCreateBufferRootWithAcroform) return createBufferRootWithAcroform;
  hasRequiredCreateBufferRootWithAcroform = 1;
  Object.defineProperty(createBufferRootWithAcroform, "__esModule", {
    value: true
  });
  createBufferRootWithAcroform.default = void 0;
  var _getIndexFromRef = _interopRequireDefault(requireGetIndexFromRef());
  function _interopRequireDefault(e) {
    return e && e.__esModule ? e : { default: e };
  }
  const createBufferRootWithAcroform$1 = (pdf, info, form) => {
    const rootIndex = (0, _getIndexFromRef.default)(info.xref, info.rootRef);
    return Buffer.concat([Buffer.from(`${rootIndex} 0 obj
`), Buffer.from("<<\n"), Buffer.from(`${info.root}
`), Buffer.from(`/AcroForm ${form}`), Buffer.from("\n>>\nendobj\n")]);
  };
  createBufferRootWithAcroform.default = createBufferRootWithAcroform$1;
  return createBufferRootWithAcroform;
}
var createBufferPageWithAnnotation = {};
var hasRequiredCreateBufferPageWithAnnotation;
function requireCreateBufferPageWithAnnotation() {
  if (hasRequiredCreateBufferPageWithAnnotation) return createBufferPageWithAnnotation;
  hasRequiredCreateBufferPageWithAnnotation = 1;
  Object.defineProperty(createBufferPageWithAnnotation, "__esModule", {
    value: true
  });
  createBufferPageWithAnnotation.default = void 0;
  var _findObject = _interopRequireDefault(requireFindObject());
  var _getIndexFromRef = _interopRequireDefault(requireGetIndexFromRef());
  function _interopRequireDefault(e) {
    return e && e.__esModule ? e : { default: e };
  }
  const createBufferPageWithAnnotation$1 = (pdf, info, pagesRef, widget) => {
    const pagesDictionary = (0, _findObject.default)(pdf, info.xref, pagesRef).toString();
    let annotsStart;
    let annotsEnd;
    let annots;
    annotsStart = pagesDictionary.indexOf("/Annots");
    if (annotsStart > -1) {
      annotsEnd = pagesDictionary.indexOf("]", annotsStart);
      annots = pagesDictionary.substr(annotsStart, annotsEnd + 1 - annotsStart);
      annots = annots.substr(0, annots.length - 1);
    } else {
      annotsStart = pagesDictionary.length;
      annotsEnd = pagesDictionary.length;
      annots = "/Annots [";
    }
    const pagesDictionaryIndex = (0, _getIndexFromRef.default)(info.xref, pagesRef);
    const widgetValue = widget.toString();
    annots = `${annots} ${widgetValue}]`;
    const preAnnots = pagesDictionary.substr(0, annotsStart);
    let postAnnots = "";
    if (pagesDictionary.length > annotsEnd) {
      postAnnots = pagesDictionary.substr(annotsEnd + 1);
    }
    return Buffer.concat([Buffer.from(`${pagesDictionaryIndex} 0 obj
`), Buffer.from("<<\n"), Buffer.from(`${preAnnots + annots + postAnnots}
`), Buffer.from("\n>>\nendobj\n")]);
  };
  createBufferPageWithAnnotation.default = createBufferPageWithAnnotation$1;
  return createBufferPageWithAnnotation;
}
var createBufferTrailer = {};
var hasRequiredCreateBufferTrailer;
function requireCreateBufferTrailer() {
  if (hasRequiredCreateBufferTrailer) return createBufferTrailer;
  hasRequiredCreateBufferTrailer = 1;
  Object.defineProperty(createBufferTrailer, "__esModule", {
    value: true
  });
  createBufferTrailer.default = void 0;
  const createBufferTrailer$1 = (pdf, info, addedReferences) => {
    let rows = [];
    rows[0] = "0000000000 65535 f ";
    addedReferences.forEach((offset, index) => {
      const paddedOffset = `0000000000${offset}`.slice(-10);
      rows[index + 1] = `${index} 1
${paddedOffset} 00000 n `;
    });
    rows = rows.filter((row) => row !== void 0);
    return Buffer.concat([Buffer.from("xref\n"), Buffer.from(`${info.xref.startingIndex} 1
`), Buffer.from(rows.join("\n")), Buffer.from("\ntrailer\n"), Buffer.from("<<\n"), Buffer.from(`/Size ${info.xref.maxIndex + 1}
`), Buffer.from(`/Root ${info.rootRef}
`), Buffer.from(info.infoRef ? `/Info ${info.infoRef}
` : ""), Buffer.from(`/Prev ${info.xRefPosition}
`), Buffer.from(">>\n"), Buffer.from("startxref\n"), Buffer.from(`${pdf.length}
`), Buffer.from("%%EOF")]);
  };
  createBufferTrailer.default = createBufferTrailer$1;
  return createBufferTrailer;
}
var hasRequiredPlainAddPlaceholder;
function requirePlainAddPlaceholder() {
  if (hasRequiredPlainAddPlaceholder) return plainAddPlaceholder;
  hasRequiredPlainAddPlaceholder = 1;
  Object.defineProperty(plainAddPlaceholder, "__esModule", {
    value: true
  });
  plainAddPlaceholder.plainAddPlaceholder = void 0;
  var _placeholderPdfkit = requireDist$1();
  var _utils = requireDist();
  var _getIndexFromRef = _interopRequireDefault(requireGetIndexFromRef());
  var _readPdf = _interopRequireDefault(requireReadPdf());
  var _getPageRef = _interopRequireDefault(requireGetPageRef());
  var _createBufferRootWithAcroform = _interopRequireDefault(requireCreateBufferRootWithAcroform());
  var _createBufferPageWithAnnotation = _interopRequireDefault(requireCreateBufferPageWithAnnotation());
  var _createBufferTrailer = _interopRequireDefault(requireCreateBufferTrailer());
  function _interopRequireDefault(e) {
    return e && e.__esModule ? e : { default: e };
  }
  const getAcroFormRef = (slice) => {
    const bufferRootWithAcroformRefRegex = /\/AcroForm\s+(\d+\s\d+\sR)/g;
    const match = bufferRootWithAcroformRefRegex.exec(slice);
    if (match != null && match[1] != null && match[1] !== "") {
      return match[1];
    }
    return void 0;
  };
  const plainAddPlaceholder$1 = ({
    pdfBuffer,
    reason,
    contactInfo,
    name,
    location,
    signingTime = void 0,
    signatureLength = _utils.DEFAULT_SIGNATURE_LENGTH,
    subFilter = _utils.SUBFILTER_ADOBE_PKCS7_DETACHED,
    widgetRect = [0, 0, 0, 0],
    appName = void 0
  }) => {
    let pdf = (0, _utils.removeTrailingNewLine)(pdfBuffer);
    const info = (0, _readPdf.default)(pdf);
    const pageRef = (0, _getPageRef.default)(pdf, info);
    const pageIndex = (0, _getIndexFromRef.default)(info.xref, pageRef);
    const addedReferences = /* @__PURE__ */ new Map();
    const pdfKitMock = {
      ref: (input, knownIndex) => {
        info.xref.maxIndex += 1;
        const index = knownIndex != null ? knownIndex : info.xref.maxIndex;
        addedReferences.set(index, pdf.length + 1);
        pdf = Buffer.concat([pdf, Buffer.from("\n"), Buffer.from(`${index} 0 obj
`), Buffer.from(_utils.PDFObject.convert(input)), Buffer.from("\nendobj\n")]);
        return new _utils.PDFKitReferenceMock(info.xref.maxIndex);
      },
      page: {
        dictionary: new _utils.PDFKitReferenceMock(pageIndex, {
          data: {
            Annots: []
          }
        })
      },
      _root: {
        data: {}
      }
    };
    const acroFormRef = getAcroFormRef(info.root);
    if (acroFormRef) {
      pdfKitMock._root.data.AcroForm = acroFormRef;
    }
    const {
      form,
      widget
    } = (0, _placeholderPdfkit.pdfkitAddPlaceholder)({
      pdf: pdfKitMock,
      pdfBuffer,
      reason,
      contactInfo,
      name,
      location,
      signingTime,
      signatureLength,
      subFilter,
      widgetRect,
      appName
    });
    if (!getAcroFormRef(pdf.toString())) {
      const rootIndex = (0, _getIndexFromRef.default)(info.xref, info.rootRef);
      addedReferences.set(rootIndex, pdf.length + 1);
      pdf = Buffer.concat([pdf, Buffer.from("\n"), (0, _createBufferRootWithAcroform.default)(pdf, info, form)]);
    }
    addedReferences.set(pageIndex, pdf.length + 1);
    pdf = Buffer.concat([pdf, Buffer.from("\n"), (0, _createBufferPageWithAnnotation.default)(pdf, info, pageRef, widget)]);
    pdf = Buffer.concat([pdf, Buffer.from("\n"), (0, _createBufferTrailer.default)(pdf, info, addedReferences)]);
    return pdf;
  };
  plainAddPlaceholder.plainAddPlaceholder = plainAddPlaceholder$1;
  return plainAddPlaceholder;
}
var plainAddPlaceholderExports = requirePlainAddPlaceholder();
export {
  plainAddPlaceholderExports as p
};
