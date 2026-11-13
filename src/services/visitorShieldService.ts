import { Request } from 'express';

export interface TelemetryProfile {
    visitorId: string;
    deviceType?: 'mobile' | 'tablet' | 'desktop';
    os?: string;
    browser?: string;
    screenResolution?: string;
    timeZone?: string;
    language?: string;
    attribution?: {
        utm_source?: string;
        utm_medium?: string;
        utm_campaign?: string;
        utm_content?: string;
        referrer?: string;
    };
    visitCount?: number;
    isHotLead?: boolean;
    recentSearches?: Array<{
        from: string;
        to: string;
        mode: string;
        date?: string;
    }>;
}

export interface EnrichedVisitorContext {
    ip: string;
    city: string;
    region: string;
    country: string;
    networkType: string;
    deviceSummary: string;
    sourceSummary: string;
    intentSummary: string;
    isBot: boolean;
    isVpnOrProxy: boolean;
    shieldVerdict: 'VERIFIED' | 'SUSPICIOUS_VPN' | 'BLOCKED_BOT';
}

class VisitorShieldService {
    private recentVisitors = new Map<string, { profile: TelemetryProfile; lastSeen: number; ip: string; city: string }>();
    private stats = {
        totalUniqueVisitors: 0,
        hotLeadsCount: 0,
        blockedBots: 0,
        topCities: {} as Record<string, number>,
        topSources: {} as Record<string, number>,
        deviceBreakdown: { mobile: 0, tablet: 0, desktop: 0 } as Record<string, number>,
    };

    /**
     * Resolves the real visitor IP from reverse proxy headers
     */
    extractClientIp(req: Request): string {
        const cfIp = req.headers['cf-connecting-ip'] as string;
        if (cfIp) return cfIp.trim();

        const xForwardedFor = req.headers['x-forwarded-for'] as string;
        if (xForwardedFor) {
            const first = xForwardedFor.split(',')[0].trim();
            if (first) return first;
        }

        const xRealIp = req.headers['x-real-ip'] as string;
        if (xRealIp) return xRealIp.trim();

        return req.ip || req.socket.remoteAddress || '127.0.0.1';
    }

    /**
     * Inspects inbound request headers for headless bots and scrapers
     */
    isBotRequest(req: Request): boolean {
        const ua = (req.headers['user-agent'] || '').toLowerCase();
        if (!ua || ua.length < 15) return true;

        const botSignatures = [
            'puppeteer', 'playwright', 'selenium', 'phantomjs', 'headlesschrome',
            'python-requests', 'aiohttp', 'curl/', 'wget/', 'go-http-client',
            'postmanruntime', 'scrapy', 'node-fetch', 'axios/0.', 'httpclient'
        ];

        return botSignatures.some(sig => ua.includes(sig));
    }

    /**
     * Enriches visitor context using client profile and server headers
     */
    inspectRequest(req: Request, clientProfile?: TelemetryProfile, userPhone?: string): EnrichedVisitorContext {
        const ip = this.extractClientIp(req);
        const isBot = this.isBotRequest(req);

        // Extract Cloudflare Edge Geo headers
        const rawCity = (req.headers['cf-ipcity'] as string) || '';
        const region = (req.headers['cf-region'] as string) || (req.headers['cf-region-code'] as string) || '';
        const country = (req.headers['cf-ipcountry'] as string) || 'IN';

        const city = rawCity ? decodeURIComponent(rawCity) : (country === 'IN' ? 'India' : country);

        // VPN / Proxy Mismatch detection
        let isVpnOrProxy = false;
        const isLocalIp = ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.');
        if (!isLocalIp && country !== 'IN') {
            // If contact is an Indian phone number (+91) but IP is from another country (e.g. US/DE/RU), flag as VPN
            if (userPhone && (/^(\+91|91)?[6-9]\d{9}$/.test(userPhone.replace(/\D/g, '')))) {
                isVpnOrProxy = true;
            }
        }

        let shieldVerdict: 'VERIFIED' | 'SUSPICIOUS_VPN' | 'BLOCKED_BOT' = 'VERIFIED';
        if (isBot) {
            shieldVerdict = 'BLOCKED_BOT';
            this.stats.blockedBots++;
        } else if (isVpnOrProxy) {
            shieldVerdict = 'SUSPICIOUS_VPN';
        }

        // Format device summary
        const os = clientProfile?.os || 'Device';
        const browser = clientProfile?.browser || 'Browser';
        const deviceType = clientProfile?.deviceType || (req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'desktop');
        const deviceSummary = `${deviceType === 'mobile' ? 'Mobile' : 'Desktop'} (${os} • ${browser})`;

        // Format source attribution
        const utmSource = clientProfile?.attribution?.utm_source;
        const utmCampaign = clientProfile?.attribution?.utm_campaign;
        let sourceSummary = 'Direct / Organic';
        if (utmSource) {
            sourceSummary = utmSource.toUpperCase();
            if (utmCampaign) sourceSummary += ` (${utmCampaign})`;
        } else if (clientProfile?.attribution?.referrer) {
            try {
                const refUrl = new URL(clientProfile.attribution.referrer);
                sourceSummary = refUrl.hostname.replace('www.', '');
            } catch {
                sourceSummary = 'Web Referral';
            }
        }

        // Format intent summary
        let intentSummary = 'New Visitor';
        if (clientProfile?.isHotLead) {
            const searches = clientProfile.recentSearches || [];
            if (searches.length > 0) {
                const topSearch = searches[0];
                intentSummary = `🔥 Hot Lead (${clientProfile.visitCount || 3} visits • Searched ${topSearch.from} ➔ ${topSearch.to})`;
            } else {
                intentSummary = `🔥 Hot Lead (${clientProfile.visitCount || 3} visits)`;
            }
        } else if (clientProfile?.visitCount && clientProfile.visitCount > 1) {
            intentSummary = `Returning Visitor (${clientProfile.visitCount} visits)`;
        }

        return {
            ip,
            city,
            region,
            country,
            networkType: deviceType === 'mobile' ? 'Mobile Carrier' : 'Broadband / WiFi',
            deviceSummary,
            sourceSummary,
            intentSummary,
            isBot,
            isVpnOrProxy,
            shieldVerdict,
        };
    }

    /**
     * Registers a client heartbeat beacon
     */
    registerHeartbeat(profile: TelemetryProfile, req: Request): void {
        if (!profile?.visitorId) return;

        const isBot = this.isBotRequest(req);
        if (isBot) {
            this.stats.blockedBots++;
            return;
        }

        const ip = this.extractClientIp(req);
        const cityHeader = (req.headers['cf-ipcity'] as string) || '';
        const city = cityHeader ? decodeURIComponent(cityHeader) : 'Other';

        const isExisting = this.recentVisitors.has(profile.visitorId);
        if (!isExisting) {
            this.stats.totalUniqueVisitors++;
            if (this.recentVisitors.size > 500) {
                const oldest = this.recentVisitors.keys().next().value;
                if (oldest) this.recentVisitors.delete(oldest);
            }
        }

        this.recentVisitors.set(profile.visitorId, {
            profile,
            lastSeen: Date.now(),
            ip,
            city,
        });

        // Update city aggregates
        if (city && city !== 'Other') {
            this.stats.topCities[city] = (this.stats.topCities[city] || 0) + 1;
        }

        // Update source aggregates
        const src = (profile.attribution?.utm_source || 'Direct').toUpperCase();
        this.stats.topSources[src] = (this.stats.topSources[src] || 0) + 1;

        // Update device aggregates
        const dev = profile.deviceType || 'mobile';
        this.stats.deviceBreakdown[dev] = (this.stats.deviceBreakdown[dev] || 0) + 1;

        if (profile.isHotLead) {
            this.stats.hotLeadsCount++;
        }
    }

    /**
     * Returns live telemetry statistics for Admin Dashboards
     */
    getStats() {
        return {
            ...this.stats,
            activeSessionsNow: Math.max(1, this.recentVisitors.size),
            timestamp: new Date().toISOString(),
        };
    }
}

export const visitorShield = new VisitorShieldService();
