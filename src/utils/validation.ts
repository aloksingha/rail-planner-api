export const isValidIndianMobile = (mobile: string | null | undefined): boolean => {
    if (!mobile) return false;
    // 10 digits starting with 6, 7, 8, or 9
    const regex = /^[6-9]\d{9}$/;
    return regex.test(mobile);
};
