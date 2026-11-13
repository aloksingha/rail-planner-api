"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.visitorShield = void 0;
class VisitorShieldService {
    recentVisitors = new Map();
    stats = {
        totalUniqueVisitors: 0,
        hotLeadsCount: 0,
        blockedBots: 0,
        topCities: {},
        topSources: {},
        deviceBreakdown: { mobile: 0, tablet: 0, desktop: 0 },
    };
    /**
     * Resolves the real visitor IP from reverse proxy headers
     */
    extractClientIp(req) {
        const cfIp = req.headers['cf-connecting-ip'];
        if (cfIp)
            return cfIp.trim();
        const xForwardedFor = req.headers['x-forwarded-for'];
        if (xForwardedFor) {
            const first = xForwardedFor.split(',')[0].trim();
            if (first)
                return first;
        }
        const xRealIp = req.headers['x-real-ip'];
        if (xRealIp)
            return xRealIp.trim();
        return req.ip || req.socket.remoteAddress || '127.0.0.1';
    }
    /**
     * Inspects inbound request headers for headless bots and scrapers
     */
    isBotRequest(req) {
        const ua = (req.headers['user-agent'] || '').toLowerCase();
        if (!ua || ua.length < 15)
            return true;
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
    inspectRequest(req, clientProfile, userPhone) {
        const ip = this.extractClientIp(req);
        const isBot = this.isBotRequest(req);
        // Extract Cloudflare Edge Geo headers
        const rawCity = req.headers['cf-ipcity'] || '';
        const region = req.headers['cf-region'] || req.headers['cf-region-code'] || '';
        const country = req.headers['cf-ipcountry'] || 'IN';
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
        let shieldVerdict = 'VERIFIED';
        if (isBot) {
            shieldVerdict = 'BLOCKED_BOT';
            this.stats.blockedBots++;
        }
        else if (isVpnOrProxy) {
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
            if (utmCampaign)
                sourceSummary += ` (${utmCampaign})`;
        }
        else if (clientProfile?.attribution?.referrer) {
            try {
                const refUrl = new URL(clientProfile.attribution.referrer);
                sourceSummary = refUrl.hostname.replace('www.', '');
            }
            catch {
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
            }
            else {
                intentSummary = `🔥 Hot Lead (${clientProfile.visitCount || 3} visits)`;
            }
        }
        else if (clientProfile?.visitCount && clientProfile.visitCount > 1) {
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
    registerHeartbeat(profile, req) {
        if (!profile?.visitorId)
            return;
        const isBot = this.isBotRequest(req);
        if (isBot) {
            this.stats.blockedBots++;
            return;
        }
        const ip = this.extractClientIp(req);
        const cityHeader = req.headers['cf-ipcity'] || '';
        const city = cityHeader ? decodeURIComponent(cityHeader) : 'Other';
        const isExisting = this.recentVisitors.has(profile.visitorId);
        if (!isExisting) {
            this.stats.totalUniqueVisitors++;
            if (this.recentVisitors.size > 500) {
                const oldest = this.recentVisitors.keys().next().value;
                if (oldest)
                    this.recentVisitors.delete(oldest);
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
     * Returns detailed list of active visitors for Super Admin Viewer
     */
    getRecentVisitorsList() {
        return Array.from(this.recentVisitors.values())
            .map(({ profile, lastSeen, ip, city }) => {
            const parts = ip.split('.');
            const maskedIp = parts.length === 4 ? `${parts[0]}.${parts[1]}.xx.${parts[3]}` : (ip.includes(':') ? 'IPv6' : ip);
            const devType = profile.deviceType === 'mobile' ? 'Mobile' : (profile.deviceType === 'tablet' ? 'Tablet' : 'Desktop');
            return {
                visitorId: profile.visitorId,
                maskedIp,
                city: city && city !== 'Other' ? city : 'India',
                deviceType: devType,
                deviceSummary: `${devType} (${profile.os || 'Device'} • ${profile.browser || 'Browser'})`,
                screenResolution: profile.screenResolution || '1080p',
                source: profile.attribution?.utm_source?.toUpperCase() || (profile.attribution?.referrer ? 'Referral' : 'Direct'),
                campaign: profile.attribution?.utm_campaign || '',
                visitCount: profile.visitCount || 1,
                isHotLead: !!profile.isHotLead,
                searches: profile.recentSearches || [],
                lastSeen: new Date(lastSeen).toISOString(),
            };
        })
            .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
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
exports.visitorShield = new VisitorShieldService();
