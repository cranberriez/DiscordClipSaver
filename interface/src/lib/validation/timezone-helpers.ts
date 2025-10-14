/**
 * Timezone helpers for converting common abbreviations to IANA format
 */

// Map common timezone abbreviations to IANA identifiers
export const TIMEZONE_ABBREVIATIONS: Record<string, string> = {
    // UTC/GMT
    UTC: "Etc/UTC",
    GMT: "Etc/GMT",
    
    // US Timezones
    EST: "America/New_York",
    EDT: "America/New_York",
    CST: "America/Chicago",
    CDT: "America/Chicago",
    MST: "America/Denver",
    MDT: "America/Denver",
    PST: "America/Los_Angeles",
    PDT: "America/Los_Angeles",
    AKST: "America/Anchorage",
    AKDT: "America/Anchorage",
    HST: "Pacific/Honolulu",
    
    // Europe
    BST: "Europe/London",
    CET: "Europe/Paris",
    CEST: "Europe/Paris",
    EET: "Europe/Athens",
    EEST: "Europe/Athens",
    WET: "Europe/Lisbon",
    WEST: "Europe/Lisbon",
    
    // Asia
    JST: "Asia/Tokyo",
    KST: "Asia/Seoul",
    IST: "Asia/Kolkata",
    CST_CHINA: "Asia/Shanghai",
    HKT: "Asia/Hong_Kong",
    SGT: "Asia/Singapore",
    
    // Australia
    AEST: "Australia/Sydney",
    AEDT: "Australia/Sydney",
    ACST: "Australia/Adelaide",
    ACDT: "Australia/Adelaide",
    AWST: "Australia/Perth",
};

/**
 * Normalize a timezone input to IANA format.
 * Accepts both abbreviations (PST, UTC) and full IANA names (America/Los_Angeles).
 * 
 * @param input - User input (e.g., "PST", "UTC", "America/New_York")
 * @returns IANA timezone identifier or the original input if not found
 */
export function normalizeTimezone(input: string): string {
    if (!input) return input;
    
    const normalized = input.trim().toUpperCase();
    
    // Check if it's a known abbreviation
    if (TIMEZONE_ABBREVIATIONS[normalized]) {
        return TIMEZONE_ABBREVIATIONS[normalized];
    }
    
    // Otherwise return as-is (might be a full IANA name)
    return input.trim();
}

/**
 * Validate if a timezone is valid (after normalization).
 * 
 * @param input - User input
 * @returns true if valid, false otherwise
 */
export function isValidTimezone(input: string): boolean {
    if (!input) return false;
    
    const normalized = normalizeTimezone(input);
    
    try {
        new Intl.DateTimeFormat("en-US", { timeZone: normalized }).format(new Date());
        return true;
    } catch {
        return false;
    }
}

/**
 * Get the IANA timezone for storage/API.
 * 
 * @param input - User input (abbreviation or IANA)
 * @returns IANA timezone identifier
 */
export function getIANATimezone(input: string): string {
    return normalizeTimezone(input);
}

/**
 * Get a friendly display name for a timezone.
 * 
 * @param tz - IANA timezone
 * @returns Friendly name with current time
 */
export function getTimezoneDisplay(tz: string): string | null {
    try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat("en-US", {
            timeZone: tz,
            dateStyle: "medium",
            timeStyle: "short",
        });
        return formatter.format(now);
    } catch {
        return null;
    }
}
