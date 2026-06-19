"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidIndianMobile = void 0;
const isValidIndianMobile = (mobile) => {
    if (!mobile)
        return false;
    // 10 digits starting with 6, 7, 8, or 9
    const regex = /^[6-9]\d{9}$/;
    return regex.test(mobile);
};
exports.isValidIndianMobile = isValidIndianMobile;
