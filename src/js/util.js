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
