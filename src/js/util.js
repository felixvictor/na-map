/*
    util.js
 */

/* global d3 : false
 */

const formatLocale = d3.formatLocale({
        decimal: ".",
        thousands: "\u202f",
        grouping: [3],
        currency: ["", "\u00a0gold"],
        percent: "\u202f%"
    }),
    formatPrefix = d3.formatPrefix(",.0", 1e3);

export const formatFloat = x =>
    formatLocale
        .format(",.2r")(x)
        .replace("-", "\u2212\u202f");

export const formatF11 = x => formatPrefix(x).replace("-", "\u2212\u202f");

export const formatInt = x =>
    formatLocale
        .format(",d")(x)
        .replace("-", "\u2212\u202f");

export const formatSiInt = x =>
    formatLocale
        .format(",.2s")(x)
        .replace(".0", "")
        .replace("-", "\u2212\u202f");

export const formatPercent = x =>
    formatLocale
        .format(".1%")(x)
        .replace(".0", "")
        .replace("-", "\u2212\u202f");

export function getOrdinal(n) {
    const s = ["th", "st", "nd", "rd"],
        v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function isEmpty(obj) {
    return Object.getOwnPropertyNames(obj).length === 0 && obj.constructor === Object;
}

export const compassDirections = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW"
];

export const compassToDegrees = compass => {
    const degree = 360 / compassDirections.length;
    return compassDirections.indexOf(compass) * degree;
};

// https://stackoverflow.com/questions/7490660/converting-wind-direction-in-angles-to-text-words
export const degreesToCompass = degrees => {
    const val = Math.floor(degrees / 22.5 + 0.5);
    return compassDirections[val % 16];
};

// https://stackoverflow.com/questions/14718561/how-to-check-if-a-number-is-between-two-values
export const between = (value, a, b, inclusive) => {
    const min = Math.min.apply(Math, [a, b]),
        max = Math.max.apply(Math, [a, b]);
    return inclusive ? value >= min && value <= max : value > min && value < max;
};

// https://stackoverflow.com/questions/9970281/java-calculating-the-angle-between-two-points-in-degrees
export const rotationAngleInDegrees = (centerPt, targetPt) => {
    // Converts from radians to degrees
    // http://cwestblog.com/2012/11/12/javascript-degree-and-radian-conversion/
    Math.radiansToDegrees = radians => radians * 180 / Math.PI;

    let theta = Math.atan2(targetPt[1] - centerPt[1], targetPt[0] - centerPt[0]);
    theta -= Math.PI / 2.0;
    let angle = Math.radiansToDegrees(theta);
    if (angle < 0) {
        angle += 360;
    }
    return angle;
};

// https://bocoup.com/blog/find-the-closest-power-of-2-with-javascript
export const nearestPow2 = aSize => 2 ** Math.round(Math.log2(aSize));

// https://developers.google.com/web/updates/2015/03/introduction-to-fetch
export function checkFetchStatus(response) {
    if (response.status >= 200 && response.status < 300) {
        return Promise.resolve(response);
    }
    return Promise.reject(new Error(response.statusText));
}
export const getJsonFromFetch = response => response.json();
export const putFetchError = error => {
    console.log("Request failed -->", error);
};
