"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refundWorker = exports.refundQueue = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Temporary mock for development since Redis isn't running on this machine
exports.refundQueue = {
    add: async () => { console.log("Mock queue add called"); }
};
exports.refundWorker = null;
