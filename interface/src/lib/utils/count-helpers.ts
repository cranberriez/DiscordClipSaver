/*
 * Shorthand count formatter
 *
 * Formats a number with a suffix (k, M)
 * and up to 1 decimal place for numbers >= 10 (within subset of thousand or million)
 * I really do not expect anyone to reach even the millions of clips in a discord server but I'd like to get proven wrong
 *
 * e.g. 1234567 -> 1.2M
 *
 */
export function shorthandCount(number: number) {
    if (number < 1000) return number;

    if (number >= 1_000_000_000) return "999M+";

    if (number >= 1_000_000) {
        const m = number / 1_000_000;
        if (m < 10) {
            const floored1dp = Math.floor(m * 10) / 10;
            return floored1dp.toFixed(1) + "M";
        }
        const floored = Math.floor(m);
        const display = Math.min(floored, 999);
        return display + "M";
    }

    const k = number / 1000;
    if (k < 10) {
        const floored1dp = Math.floor(k * 10) / 10;
        return floored1dp.toFixed(1) + "k";
    }
    return Math.floor(k) + "k";
}
