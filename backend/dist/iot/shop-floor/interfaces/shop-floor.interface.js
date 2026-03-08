"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobStatus = exports.SensorType = exports.BayStatus = void 0;
var BayStatus;
(function (BayStatus) {
    BayStatus["AVAILABLE"] = "AVAILABLE";
    BayStatus["OCCUPIED"] = "OCCUPIED";
    BayStatus["RESERVED"] = "RESERVED";
    BayStatus["MAINTENANCE"] = "MAINTENANCE";
    BayStatus["CLEANING"] = "CLEANING";
})(BayStatus || (exports.BayStatus = BayStatus = {}));
var SensorType;
(function (SensorType) {
    SensorType["RFID"] = "RFID";
    SensorType["BLUETOOTH_BEACON"] = "BLUETOOTH_BEACON";
    SensorType["ULTRASONIC"] = "ULTRASONIC";
    SensorType["PIR"] = "PIR";
    SensorType["CAMERA"] = "CAMERA";
    SensorType["PRESSURE"] = "PRESSURE";
    SensorType["MAGNETIC"] = "MAGNETIC";
})(SensorType || (exports.SensorType = SensorType = {}));
var JobStatus;
(function (JobStatus) {
    JobStatus["PENDING"] = "PENDING";
    JobStatus["CHECKED_IN"] = "CHECKED_IN";
    JobStatus["IN_PROGRESS"] = "IN_PROGRESS";
    JobStatus["WAITING_PARTS"] = "WAITING_PARTS";
    JobStatus["QUALITY_CHECK"] = "QUALITY_CHECK";
    JobStatus["COMPLETED"] = "COMPLETED";
})(JobStatus || (exports.JobStatus = JobStatus = {}));
