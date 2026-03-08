"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntryExitType = exports.OcrProvider = void 0;
var OcrProvider;
(function (OcrProvider) {
    OcrProvider["GOOGLE_VISION"] = "GOOGLE_VISION";
    OcrProvider["AZURE_COMPUTER_VISION"] = "AZURE_COMPUTER_VISION";
    OcrProvider["AWS_REKOGNITION"] = "AWS_REKOGNITION";
    OcrProvider["OPENALPR"] = "OPENALPR";
    OcrProvider["CUSTOM_ML"] = "CUSTOM_ML";
})(OcrProvider || (exports.OcrProvider = OcrProvider = {}));
var EntryExitType;
(function (EntryExitType) {
    EntryExitType["ENTRY"] = "ENTRY";
    EntryExitType["EXIT"] = "EXIT";
})(EntryExitType || (exports.EntryExitType = EntryExitType = {}));
