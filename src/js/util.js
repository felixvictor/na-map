/*
    util.js
 */

export const formatNumber = x => {
    let r = Math.abs(x);
    if (x < 0) {
        r = `\u2212\u202f${r}`;
    }
    return r;
};

export function getOrdinal(n) {
    const s = ["th", "st", "nd", "rd"],
        v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function isEmpty(obj) {
    return Object.getOwnPropertyNames(obj).length === 0 && obj.constructor === Object;
}

export const thousandsWithBlanks = x => x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");

export const formatCoord = x => {
    let r = thousandsWithBlanks(Math.abs(Math.trunc(x)));
    if (x < 0) {
        r = `\u2212\u202f${r}`;
    }
    return r;
};
