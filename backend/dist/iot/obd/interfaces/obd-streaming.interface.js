"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObdProtocol = exports.AdapterType = void 0;
var AdapterType;
(function (AdapterType) {
    AdapterType["ELM327_USB"] = "ELM327_USB";
    AdapterType["ELM327_BLUETOOTH"] = "ELM327_BLUETOOTH";
    AdapterType["ELM327_WIFI"] = "ELM327_WIFI";
    AdapterType["STN1110"] = "STN1110";
    AdapterType["STN2120"] = "STN2120";
    AdapterType["OBDLINK_MX"] = "OBDLINK_MX";
    AdapterType["OBDLINK_LX"] = "OBDLINK_LX";
    AdapterType["CUSTOM"] = "CUSTOM";
})(AdapterType || (exports.AdapterType = AdapterType = {}));
var ObdProtocol;
(function (ObdProtocol) {
    ObdProtocol["AUTO"] = "AUTO";
    ObdProtocol["J1850_PWM"] = "J1850_PWM";
    ObdProtocol["J1850_VPW"] = "J1850_VPW";
    ObdProtocol["ISO9141_2"] = "ISO9141_2";
    ObdProtocol["ISO14230_4_KWP"] = "ISO14230_4_KWP";
    ObdProtocol["ISO15765_4_CAN_11BIT"] = "ISO15765_4_CAN_11BIT";
    ObdProtocol["ISO15765_4_CAN_29BIT"] = "ISO15765_4_CAN_29BIT";
})(ObdProtocol || (exports.ObdProtocol = ObdProtocol = {}));
