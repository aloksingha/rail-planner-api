const KEYS = [
    'rr_b8bkpypd0wv94nokax545bbubtjf7tru',
    'rr_3qvr30o4au0u7mbkpx1ybuycxa5fiupc', // Corrected from trains.ts
    'rr_l5kw3cdiu6tmfmg2mnq6zlbuoo9ff4pw'  // Fallback
];

let currentIndex = 0;

export const getRailRadarKey = () => {
    const key = KEYS[currentIndex];
    // Simple round-robin for now
    currentIndex = (currentIndex + 1) % KEYS.length;
    return key;
};
