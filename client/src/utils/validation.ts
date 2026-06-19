export const isValidIndianMobile = (mobile: string | null | undefined): boolean => {
    if (!mobile) return false;
    // 10 digits exactly, starting with 6, 7, 8, or 9
    return /^[6-9]\d{9}$/.test(mobile);
};
