/**
 * This file is part of na-map.
 *
 * @file      Utility functions.
 * @module    util
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { formatPrefix as d3FormatPrefix, formatLocale as d3FormatLocale } from "d3-format";
import { arc as d3Arc, pie as d3Pie } from "d3-shape";

/**
 * Default format
 */
const formatLocale = d3FormatLocale({
    decimal: ".",
    thousands: "\u202f",
    grouping: [3],
    currency: ["", "\u00a0reals"],
    percent: "\u202f%"
});

/**
 * format with SI suffix
 */
const formatPrefix = d3FormatPrefix(",.0", 1e3);

/**
 * Format float
 * @function
 * @param {Number} x - Float
 * @param {Number} s - Significant digits
 * @return {String} - Formatted float
 */
export const formatFloat = (x, s = 2) =>
    formatLocale
        .format(`,.${s}~r`)(x)
        .replace("-", "\u2212\u202f");

/**
 * Format float
 * @function
 * @param {Number} x - Float
 * @param {Number} f - digits following decimal point
 * @return {String} - Formatted float
 */
export const formatFloatFixed = (x, f = 2) =>
    formatLocale
        .format(`.${f}f`)(x)
        .replace("-", "\u2212\u202f")
        .replace(".00", '<span class="hidden">.00</span>')
        .replace(/\.(\d)0/g, '.$1<span class="hidden">0</span>');

/**
 * Format ShowF11 coordinate
 * @function
 * @param {Number} x - ShowF11 coordinate
 * @return {String} Formatted ShowF11 coordinate
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
 * @param {Number} f - digits following decimal point
 * @return {String} Formatted percent value
 */
export const formatPercent = (x, f = 1) =>
    formatLocale
        .format(`.${f}%`)(x)
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
 * @param {number} n - Integer
 * @param {bool} sup - True if superscript tags needed
 * @return {String} Formatted Ordinal
 */
export function getOrdinal(n, sup = true) {
    const s = ["th", "st", "nd", "rd"],
        v = n % 100,
        text = s[(v - 20) % 10] || s[v] || s[0];
    return n + (sup ? `<sup>${text}</sup>` : `${text}`);
}

/**
 * {@link https://github.com/30-seconds/30-seconds-of-code#round}
 * @param {number} n - number
 * @param {number} decimals - decimals
 * @return {number} Rounded number
 */
const round = (n, decimals = 0) => Number(`${Math.round(`${n}e${decimals}`)}e-${decimals}`);

/**
 * Round to thousands
 * @param {Number} x - Integer
 * @return {Number} Rounded input
 */
export const roundToThousands = x => round(x, 3);

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
    "N1/3NE",
    "N2/3NE",
    "NE",
    "E2/3NE",
    "E1/3NE",
    "E",
    "E1/3SE",
    "E2/3SE",
    "SE",
    "S2/3SE",
    "S1/3SE",
    "S",
    "S1/3SW",
    "S2/3SW",
    "SW",
    "W2/3SW",
    "W1/3SW",
    "W",
    "W1/3NW",
    "W2/3NW",
    "NW",
    "N2/3NW",
    "N1/3NW"
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
    const ticks = 360 / compassDirections.length;
    const val = Math.floor(degrees / ticks + 0.5);
    return compassDirections[val % compassDirections.length];
};

/**
 * Display formatted compass
 * @param {string} wind - Wind direction in compass or degrees
 * @param {bool} svg - True to use 'tspan' instead of 'span'
 * @return {string} HTML formatted compass
 */
export const displayCompass = (wind, svg = false) => {
    let compass;

    if (Number.isNaN(Number(wind))) {
        compass = wind;
    } else {
        compass = degreesToCompass(+wind);
    }

    return `<${svg ? "tspan" : "span"} class="fraction">${compass}</${svg ? "tspan" : "span"}>`;
};

/**
 * Display formatted compass and degrees
 * @param {string} wind - Wind direction in compass or degrees
 * @param {bool} svg - True to use 'tspan' instead of 'span'
 * @return {string} HTML formatted compass and degrees
 */
export const displayCompassAndDegrees = (wind, svg = false) => {
    let compass;
    let degrees;

    if (Number.isNaN(Number(wind))) {
        compass = wind;
        degrees = compassToDegrees(compass) % 360;
    } else {
        degrees = +wind;
        compass = degreesToCompass(degrees);
    }

    return `<${svg ? "tspan" : "span"} class="fraction">${compass}</${svg ? "tspan" : "span"}> (${degrees}°)`;
};

/**
 * Get wind in degrees from user input (rs-slider)
 * @param {string} sliderId - Slider id
 * @return {number} Wind in degrees
 */
export const getUserWind = sliderId => {
    const currentUserWind = degreesToCompass($(`#${sliderId}`).roundSlider("getValue"));
    let windDegrees;

    if (Number.isNaN(Number(currentUserWind))) {
        windDegrees = compassToDegrees(currentUserWind);
    } else {
        windDegrees = +currentUserWind;
    }
    return windDegrees;
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
export const radiansToDegrees = radians => (radians * 180) / Math.PI;

/**
 * Convert degrees to radians
 * @function
 * @param {Number} degrees - Degrees
 * @return {Number} Radians
 */
export const degreesToRadians = degrees => (Math.PI / 180) * (degrees - 90);

/**
 * @typedef {Object} Point
 * @property {number} x - X Coordinate
 * @property {number} y - Y Coordinate
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
    let theta = Math.atan2(targetPt.y - centerPt.y, targetPt.x - centerPt.x);
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
    Math.sqrt((centerPt.x - targetPt.x) ** 2 + (centerPt.y - targetPt.y) ** 2);

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
    console.error("Fetch request failed -->", error);
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

/**
 * Print compass
 * @param {object} elem - Element to append compass
 * @return {void}
 */
export function printCompassRose({ elem, compassSize }) {
    const steps = 24,
        stepRadians = (2 * Math.PI) / steps,
        radius = compassSize / (2 * Math.PI),
        outerRadius = radius - 1,
        innerRadius = radius * 0.8;
    const data = Array.from(new Array(steps), () => 1);
    const textArc = d3Arc()
            .outerRadius(outerRadius)
            .innerRadius(innerRadius),
        textPie = d3Pie()
            .startAngle(0 - stepRadians / 2)
            .endAngle(2 * Math.PI - stepRadians / 2)
            .sort(null)
            .value(d => d),
        textArcs = textPie(data);

    elem.append("circle").attr("r", Math.floor(innerRadius));

    // Cardinal and intercardinal winds
    elem.selectAll("text")
        .data(textArcs.filter((d, i) => i % 3 === 0))
        .enter()
        .append("text")
        .attr("transform", d => {
            const [tx, ty] = textArc.centroid(d),
                translate = [Math.round(tx), Math.round(ty)];
            let rotate = Math.round(((d.startAngle + d.endAngle) / 2) * (180 / Math.PI));
            if (rotate === 90 || rotate === 270) {
                rotate = 0;
            } else if (rotate > 90 && rotate < 270) {
                rotate -= 180;
            }
            return `rotate(${rotate}, ${translate}) translate(${translate})`;
        })
        .attr("dx", d => (degreesToCompass((360 / steps) * d.index) === "E" ? "-.2em" : "0"))
        .text(d => degreesToCompass((360 / steps) * d.index));

    // Ticks
    const y1 = Math.floor(-outerRadius * 0.95),
        y2 = Math.floor(-innerRadius);
    elem.selectAll("line")
        .data(textArcs.filter((d, i) => i % 3 !== 0))
        .enter()
        .append("line")
        .attr("x1", 0)
        .attr("x2", 0)
        .attr("y1", y1)
        .attr("y2", y2)
        .attr("transform", d => `rotate(${Math.round(((d.startAngle + d.endAngle) / 2) * (180 / Math.PI))})`);
}

/**
 * Print small compass
 * @param {object} elem - Element to append compass
 * @return {void}
 */
export function printSmallCompassRose({ elem, compassSize }) {
    const steps = 24,
        stepRadians = (2 * Math.PI) / steps,
        radius = compassSize / (2 * Math.PI),
        outerRadius = radius,
        innerRadius = radius * 0.8;
    const data = Array.from(new Array(steps), () => 1);
    const textPie = d3Pie()
        .startAngle(0 - stepRadians / 2)
        .endAngle(2 * Math.PI - stepRadians / 2)
        .sort(null)
        .value(d => d);
    const textArcs = textPie(data);

    elem.append("circle").attr("r", Math.floor(innerRadius));

    // Ticks
    const y1Card = Math.floor(-outerRadius * 0.85);
    const y1InterCard = Math.floor(-outerRadius * 0.9);
    const y1 = Math.floor(-outerRadius);
    const y2 = Math.floor(-innerRadius);
    elem.selectAll("line")
        .data(textArcs)
        .enter()
        .append("line")
        .attr("x1", 0)
        .attr("x2", 0)
        .attr("y1", (d, i) => (i % 3 !== 0 ? y1Card : i % 6 !== 0 ? y1InterCard : y1))
        .attr("y2", y2)
        .attr("transform", d => `rotate(${Math.round(((d.startAngle + d.endAngle) / 2) * (180 / Math.PI))})`);
}
