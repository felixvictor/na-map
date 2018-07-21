/**
 * This file is part of na-map.
 *
 * @file      Utility functions.
 * @module    util
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018
 * @license   http://www.gnu.org/licenses/gpl.html
 */

/* global d3 : false
 */

/**
 * Default format
 */
const formatLocale = d3.formatLocale({
    decimal: ".",
    thousands: "\u202f",
    grouping: [3],
    currency: ["", "\u00a0gold"],
    percent: "\u202f%"
});

/**
 * format with SI suffix
 */
const formatPrefix = d3.formatPrefix(",.0", 1e3);

/**
 * Format float
 * @function
 * @param {Number} x - Float
 * @param {Number} s - Signifant digits
 * @return {String} - Formatted float
 */
export const formatFloat = (x, s = 2) =>
    formatLocale
        .format(`,.${s}r`)(x)
        .replace("-", "\u2212\u202f");

/**
 * Format F11 coordinate
 * @function
 * @param {Number} x - F11 coordinate
 * @return {String} Formatted F11 coordinate
 */
export const formatF11 = x => formatPrefix(x * -1).replace("-", "\u2212\u202f");

/**
 * Format integer
 * @function
 * @param {Number} x - Integer
 * @return {String} Formatted Integer
 */
export const formatInt = x =>
    formatLocale
        .format(",d")(x)
        .replace("-", "\u2212\u202f");

/**
 * Format integer with SI suffix
 * @function
 * @param {Number} x - Integer
 * @return {String} Formatted Integer
 */
export const formatSiInt = x =>
    formatLocale
        .format(",.2s")(x)
        .replace(".0", "")
        .replace("-", "\u2212\u202f");

/**
 * Format percent value
 * @function
 * @param {Number} x - Percent
 * @return {String} Formatted percent value
 */
export const formatPercent = x =>
    formatLocale
        .format(".1%")(x)
        .replace(".0", "")
        .replace("-", "\u2212\u202f");

/**
 * Format percent value with +/- sign
 * @function
 * @param {Number} x - Percent
 * @return {String} Formatted percent value
 */
export const formatSignPercent = x =>
    formatLocale
        .format("+.1%")(x)
        .replace(".0", "")
        .replace("-", "\u2212\u202f")
        .replace("+", "\uff0b\u202f");

/**
 * Format ordinal
 * @param {Number} n - Integer
 * @return {String} Formatted Ordinal
 */
export function getOrdinal(n) {
    const s = ["th", "st", "nd", "rd"],
        v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Round to thousands
 * @param {Number} x - Integer
 * @return {Number} Rounded input
 */
export const roundToThousands = x => Math.round(x * 1000) / 1000;

/**
 * Test if object is empty
 * @param {Object} obj - Object
 * @return {Boolean} True if object is empty
 */
export function isEmpty(obj) {
    return Object.getOwnPropertyNames(obj).length === 0 && obj.constructor === Object;
}

/**
 * Compass directions
 * @enum {String}
 */
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

/**
 * Converts compass direction to degrees
 * @function
 * @param {String} compass - Compass direction
 * @return {Number} Degrees
 */
export const compassToDegrees = compass => {
    const degree = 360 / compassDirections.length;
    return compassDirections.indexOf(compass) * degree;
};

/**
 * Convert degrees to compass direction (see {@link https://stackoverflow.com/questions/7490660/converting-wind-direction-in-angles-to-text-words})
 * @function
 * @param {Number} degrees - Degrees
 * @return {String} Compass direction
 */
export const degreesToCompass = degrees => {
    const val = Math.floor(degrees / 22.5 + 0.5);
    return compassDirections[val % 16];
};

/**
 * Test if Number is between two unordered Numbers (see {@link https://stackoverflow.com/questions/14718561/how-to-check-if-a-number-is-between-two-values})
 * @function
 * @param {Number} value - Value to be tested
 * @param {Number} a - Upper/lower bound
 * @param {Number} b - Upper/lower bound
 * @param {Boolean} inclusive - True if bounds are inclusive
 * @return {Boolean} True if value is between a and b
 */
export const between = (value, a, b, inclusive) => {
    const min = Math.min.apply(Math, [a, b]),
        max = Math.max.apply(Math, [a, b]);
    return inclusive ? value >= min && value <= max : value > min && value < max;
};

/**
 * Convert radians to degrees (see {@link http://cwestblog.com/2012/11/12/javascript-degree-and-radian-conversion/})
 * @function
 * @param {Number} radians - Radians
 * @return {Number} Degrees
 */
export const radiansToDegrees = radians => radians * 180 / Math.PI;

/**
 * Convert degrees to radians
 * @function
 * @param {Number} degrees - Degrees
 * @return {Number} Radians
 */
export const degreesToRadians = degrees => Math.PI / 180 * (degrees - 90);

/**
 * @typedef {Array} Point
 * @property {number} 0 - X Coordinate
 * @property {number} 1 - Y Coordinate
 */

/**
 * Calculate the angle in degrees between two points
 * @see https://stackoverflow.com/questions/9970281/java-calculating-the-angle-between-two-points-in-degrees
 * @function
 * @param {Point} centerPt - Center point
 * @param {Point} targetPt - Target point
 * @return {Number} Degrees between centerPt and targetPt
 */
export const rotationAngleInDegrees = (centerPt, targetPt) => {
    let theta = Math.atan2(targetPt[1] - centerPt[1], targetPt[0] - centerPt[0]);
    theta -= Math.PI / 2.0;
    let degrees = radiansToDegrees(theta);
    if (degrees < 0) {
        degrees += 360;
    }
    return degrees;
};

/**
 * Calculate the distance between two points
 * @see https://www.mathsisfun.com/algebra/distance-2-points.html
 * @function
 * @param {Point} centerPt - Center point
 * @param {Point} targetPt - Target point
 * @return {Number} Distance between centerPt and targetPt
 */
export const distancePoints = (centerPt, targetPt) =>
    Math.sqrt((centerPt[0] - targetPt[0]) ** 2 + (centerPt[1] - targetPt[1]) ** 2);

/**
 * Calculate the closest power of 2 (see {@link https://bocoup.com/blog/find-the-closest-power-of-2-with-javascript})
 * @function
 * @param {Number} aSize - Input
 * @return {Number} Closest power of 2 of aSize
 */
export const nearestPow2 = aSize => 2 ** Math.round(Math.log2(aSize));

/**
 * Check fetch status (see {@link https://developers.google.com/web/updates/2015/03/introduction-to-fetch})
 * @param {Object} response - fetch response
 * @return {Promise<string>} Resolved or rejected promise
 */
export function checkFetchStatus(response) {
    if (response.status >= 200 && response.status < 300) {
        return Promise.resolve(response);
    }
    return Promise.reject(new Error(response.statusText));
}

/**
 * Get json from fetch response
 * @function
 * @param {Object} response - fetch response
 * @return {Object} json
 */
export const getJsonFromFetch = response => response.json();

/**
 * Get text from fetch response
 * @function
 * @param {Object} response - fetch response
 * @return {Object} String
 */
export const getTextFromFetch = response => response.text();

/**
 * Write error to console
 * @function
 * @param {String} error - Error message
 * @return {void}
 */
export const putFetchError = error => {
    console.log("Request failed -->", error);
};

/**
 * {@link https://stackoverflow.com/questions/1026069/how-do-i-make-the-first-letter-of-a-string-uppercase-in-javascript}
 */
export const capitalizeFirstLetter = string => string.charAt(0).toUpperCase() + string.slice(1);

/** Split array into n pieces
 * {@link https://stackoverflow.com/questions/8188548/splitting-a-js-array-into-n-arrays}
 * @param {Array} array Array to be split
 * @param {Integer} n Number of splits
 * @param {Boolean} balanced True if splits' lengths differ as less as possible
 * @return {Array} Split arrays
 */
export function chunkify(array, n, balanced = true) {
    if (n < 2) {
        return [array];
    }

    const len = array.length,
        out = [];
    let i = 0,
        size;

    if (len % n === 0) {
        size = Math.floor(len / n);
        while (i < len) {
            out.push(array.slice(i, (i += size)));
        }
    } else if (balanced) {
        while (i < len) {
            // eslint-disable-next-line no-param-reassign, no-plusplus
            size = Math.ceil((len - i) / n--);
            out.push(array.slice(i, (i += size)));
        }
    } else {
        // eslint-disable-next-line no-param-reassign
        n -= 1;
        size = Math.floor(len / n);
        if (len % size === 0) {
            size -= 1;
        }
        while (i < size * n) {
            out.push(array.slice(i, (i += size)));
        }
        out.push(array.slice(size * n));
    }

    return out;
}