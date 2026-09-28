"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const wallet_1 = __importDefault(require("./payments/wallet"));
const razorpay_1 = __importDefault(require("./payments/razorpay"));
const offline_1 = __importDefault(require("./payments/offline"));
const international_1 = __importDefault(require("./payments/international"));
const router = (0, express_1.Router)();
router.use('/', wallet_1.default);
router.use('/', razorpay_1.default);
router.use('/', offline_1.default);
router.use('/', international_1.default);
exports.default = router;
