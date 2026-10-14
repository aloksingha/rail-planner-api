"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRailRadarKey = void 0;
const KEYS = [
    'rg_fb6bd463f9434bfdb4a1c4cf6ac2752d',
    'rg_2ec019e50b00458c9519d7bed9537dd6',
    'rg_5970d005f2cd4ada97c9690f33e72453'
];
let currentIndex = 0;
const getRailRadarKey = () => {
    const key = KEYS[currentIndex];
    // Simple round-robin for now
    currentIndex = (currentIndex + 1) % KEYS.length;
    return key;
};
exports.getRailRadarKey = getRailRadarKey;
