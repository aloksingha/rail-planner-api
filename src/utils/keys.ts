const KEYS = [
    'rg_fb6bd463f9434bfdb4a1c4cf6ac2752d',
    'rg_2ec019e50b00458c9519d7bed9537dd6',
    'rg_5970d005f2cd4ada97c9690f33e72453'
];

export const NEW_API_BASE_URL = 'https://irctc1.p.rapidapi.com/api/v3';
export const NEW_API_KEY = 'bf2a3e5aebmsh47dd2454d86a94ep16d33ejsnbc06de274f3b';

let currentIndex = 0;

export const getRailRadarKey = () => {
    const key = KEYS[currentIndex];
    // Simple round-robin for now
    currentIndex = (currentIndex + 1) % KEYS.length;
    return key;
};
