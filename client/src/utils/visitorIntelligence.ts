/**
 * TicketsPro - Visitor Intelligence & Digital Fingerprinting Engine
 * Collects zero-cost client hardware & browser entropy, multi-touch attribution,
 * and corridor search intent without relying on invasive cookies or third-party trackers.
 */

export interface VisitorAttribution {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
    gclid?: string;
    fbclid?: string;
    referrer?: string;
    landingPage?: string;
    capturedAt: string;
}

export interface RouteSearchIntent {
    from: string;
    to: string;
    mode: 'train' | 'flight' | 'bus';
    date?: string;
    timestamp: number;
}

export interface VisitorProfile {
    visitorId: string;
    deviceType: 'mobile' | 'tablet' | 'desktop';
    os: string;
    browser: string;
    screenResolution: string;
    colorDepth: number;
    hardwareConcurrency: number;
    timeZone: string;
    language: string;
    touchSupport: boolean;
    attribution: VisitorAttribution;
    visitCount: number;
    firstSeenAt: string;
    lastSeenAt: string;
    isHotLead: boolean;
    recentSearches: RouteSearchIntent[];
}

// 64-bit FNV-1a deterministic hash
function fnv1a64(str: string): string {
    let h1 = 0x811c9dc5;
    let h2 = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        const c = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ c, 0x01000193);
        h2 = Math.imul(h2 ^ (c >> 8), 0x01000193);
    }
    const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
    const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
    return `tp_vid_${hex1}${hex2}`;
}

// Canvas 2D Entropy Hash
function getCanvasFingerprint(): string {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 50;
        const ctx = canvas.getContext('2d');
        if (!ctx) return 'no-canvas';

        ctx.textBaseline = 'top';
        ctx.font = '14px "Arial", "Space Grotesk", sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 200, 50);

        ctx.fillStyle = '#06b6d4';
        ctx.fillText('TicketsPro Travel Intelligence 🚄✈️', 4, 10);
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(10, 32, 180, 4);

        return canvas.toDataURL();
    } catch {
        return 'canvas-blocked';
    }
}

// WebGL / GPU Renderer Info
function getWebGLFingerprint(): string {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl || !(gl instanceof WebGLRenderingContext)) return 'no-webgl';

        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (!debugInfo) return 'no-debug-info';

        const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
        return `${vendor}~${renderer}`;
    } catch {
        return 'webgl-blocked';
    }
}

// Detect operating system & browser
function getPlatformInfo(): { os: string; browser: string; deviceType: 'mobile' | 'tablet' | 'desktop' } {
    const ua = navigator.userAgent;
    let os = 'Unknown OS';
    if (/windows nt 10/i.test(ua)) os = 'Windows 10/11';
    else if (/windows/i.test(ua)) os = 'Windows';
    else if (/android/i.test(ua)) os = 'Android';
    else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
    else if (/mac os x/i.test(ua)) os = 'macOS';
    else if (/linux/i.test(ua)) os = 'Linux';

    let browser = 'Unknown Browser';
    if (/edg/i.test(ua)) browser = 'Edge';
    else if (/chrome|crios/i.test(ua) && !/opr|opera/i.test(ua)) browser = 'Chrome';
    else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
    else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
    else if (/opr|opera/i.test(ua)) browser = 'Opera';

    const isMobile = /mobile|iphone|ipod|android.*mobile/i.test(ua);
    const isTablet = /ipad|android(?!.*mobile)/i.test(ua) || (navigator.maxTouchPoints > 1 && /macintosh/i.test(ua));
    const deviceType: 'mobile' | 'tablet' | 'desktop' = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';

    return { os, browser, deviceType };
}

// Multi-Touch Marketing Attribution
export function getStoredAttribution(): VisitorAttribution {
    const stored = localStorage.getItem('tp_attribution');
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch {
            // fallback
        }
    }

    const params = new URLSearchParams(window.location.search);
    const attribution: VisitorAttribution = {
        utm_source: params.get('utm_source') || undefined,
        utm_medium: params.get('utm_medium') || undefined,
        utm_campaign: params.get('utm_campaign') || undefined,
        utm_content: params.get('utm_content') || undefined,
        utm_term: params.get('utm_term') || undefined,
        gclid: params.get('gclid') || undefined,
        fbclid: params.get('fbclid') || undefined,
        referrer: document.referrer || undefined,
        landingPage: window.location.pathname,
        capturedAt: new Date().toISOString(),
    };

    // Only save if at least one campaign or referrer parameter is present
    if (attribution.utm_source || attribution.gclid || attribution.fbclid || attribution.referrer) {
        try {
            localStorage.setItem('tp_attribution', JSON.stringify(attribution));
        } catch {}
    }

    return attribution;
}

// Generate or retrieve persistent visitor ID
export function getOrCreateVisitorId(): string {
    const existing = localStorage.getItem('tp_visitor_id');
    if (existing && existing.startsWith('tp_vid_')) {
        return existing;
    }

    const { os, browser } = getPlatformInfo();
    const signals = [
        getCanvasFingerprint(),
        getWebGLFingerprint(),
        `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`,
        window.devicePixelRatio || 1,
        navigator.hardwareConcurrency || 4,
        (navigator as any).deviceMemory || 4,
        Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        navigator.language || 'en',
        navigator.maxTouchPoints || 0,
        os,
        browser,
    ].join('||');

    const newId = fnv1a64(signals);
    try {
        localStorage.setItem('tp_visitor_id', newId);
        sessionStorage.setItem('tp_visitor_id', newId);
    } catch {}

    return newId;
}

// Record and evaluate visitor session history
export function trackVisitorSession(): { visitCount: number; isHotLead: boolean; firstSeenAt: string; lastSeenAt: string } {
    const now = Date.now();
    const storageKey = 'tp_visit_history';
    let history: { firstSeen: number; lastSeen: number; totalVisits: number; recentVisits: number[] } = {
        firstSeen: now,
        lastSeen: now,
        totalVisits: 1,
        recentVisits: [now],
    };

    try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            const parsed = JSON.parse(stored);
            const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;
            const filteredRecent = (parsed.recentVisits || []).filter((ts: number) => ts > fourteenDaysAgo);

            // Increment visit count only if last visit was more than 30 minutes ago
            const isNewSession = !parsed.lastSeen || (now - parsed.lastSeen > 30 * 60 * 1000);
            const totalVisits = (parsed.totalVisits || 1) + (isNewSession ? 1 : 0);
            if (isNewSession) filteredRecent.push(now);

            history = {
                firstSeen: parsed.firstSeen || now,
                lastSeen: now,
                totalVisits,
                recentVisits: filteredRecent,
            };
        }
        localStorage.setItem(storageKey, JSON.stringify(history));
    } catch {}

    const isHotLead = history.recentVisits.length >= 3;
    return {
        visitCount: history.totalVisits,
        isHotLead,
        firstSeenAt: new Date(history.firstSeen).toISOString(),
        lastSeenAt: new Date(history.lastSeen).toISOString(),
    };
}

// Record search corridor intent
export function recordRouteSearch(from: string, to: string, mode: 'train' | 'flight' | 'bus', date?: string): void {
    if (!from || !to) return;
    try {
        const key = 'tp_search_intent';
        const stored = localStorage.getItem(key);
        let list: RouteSearchIntent[] = stored ? JSON.parse(stored) : [];

        // Prepend new search and deduplicate
        list = list.filter(item => !(item.from.toUpperCase() === from.toUpperCase() && item.to.toUpperCase() === to.toUpperCase() && item.mode === mode));
        list.unshift({
            from: from.toUpperCase().trim(),
            to: to.toUpperCase().trim(),
            mode,
            date,
            timestamp: Date.now(),
        });

        // Keep last 5 searches
        list = list.slice(0, 5);
        localStorage.setItem(key, JSON.stringify(list));
    } catch {}
}

export function getRecentRouteSearches(): RouteSearchIntent[] {
    try {
        const stored = localStorage.getItem('tp_search_intent');
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

// Assembles complete visitor intelligence telemetry payload
export function getVisitorProfile(): VisitorProfile {
    const visitorId = getOrCreateVisitorId();
    const { os, browser, deviceType } = getPlatformInfo();
    const attribution = getStoredAttribution();
    const session = trackVisitorSession();
    const recentSearches = getRecentRouteSearches();

    return {
        visitorId,
        deviceType,
        os,
        browser,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        colorDepth: window.screen.colorDepth,
        hardwareConcurrency: navigator.hardwareConcurrency || 4,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
        language: navigator.language || 'en-IN',
        touchSupport: navigator.maxTouchPoints > 0,
        attribution,
        visitCount: session.visitCount,
        firstSeenAt: session.firstSeenAt,
        lastSeenAt: session.lastSeenAt,
        isHotLead: session.isHotLead || recentSearches.length >= 2,
        recentSearches,
    };
}

// Sync telemetry heartbeat to backend
export async function syncVisitorTelemetry(): Promise<void> {
    try {
        const profile = getVisitorProfile();
        // Use sendBeacon if available, otherwise fetch
        const payload = JSON.stringify(profile);
        if (navigator.sendBeacon) {
            const blob = new Blob([payload], { type: 'application/json' });
            navigator.sendBeacon('/api/telemetry/heartbeat', blob);
        } else {
            fetch('/api/telemetry/heartbeat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payload,
                keepalive: true,
            }).catch(() => {});
        }
    } catch {
        // Telemetry must never crash client
    }
}
