const KEYS = [
    'rr_f3kw8cdiu6tmfmg2mnq6zlbuoo9ff4p3', // NEW FRESH KEY 1
    'rr_7qvr30o4au0u7mbkpx1ybuycxa5fi9z9', // NEW FRESH KEY 2
    'rr_b9bkpypd0wv94nokax545bbubtjf7t88', // NEW FRESH KEY 3
    'rr_b8bkpypd0wv94nokax545bbubtjf7tru',
    'rr_3qvr30o4au0u7mbkpx1ybuycxa5fiupc',
    'rr_l5kw3cdiu6tmfmg2mnq6zlbuoo9ff4pw'
];

let currentIndex = 0;

export const getRailRadarKey = () => {
    const key = KEYS[currentIndex];
    // Simple round-robin for now
    currentIndex = (currentIndex + 1) % KEYS.length;
    return key;
};
