/*
    common.mjs
    Copy of ../src/js/common.js
 */

import fs from "fs";

const transformMatrix = {
        A: -0.00499866779363828,
        B: -0.00000021464254980645,
        C: 4096.88635151897,
        D: 4096.90282787469
    },
    transformMatrixInv = {
        A: -200.053302087577,
        B: -0.00859027897636011,
        C: 819630.836437126,
        D: -819563.745651571
    };

// F11 coord to svg coord
export const convertCoordX = (x, y) => transformMatrix.A * x + transformMatrix.B * y + transformMatrix.C;

// F11 coord to svg coord
export const convertCoordY = (x, y) => transformMatrix.B * x - transformMatrix.A * y + transformMatrix.D;

// svg coord to F11 coord
export const convertInvCoordX = () => transformMatrixInv.A * x + transformMatrixInv.B * y + transformMatrixInv.C;

// svg coord to F11 coord
export const convertInvCoordY = () => transformMatrixInv.B * x - transformMatrixInv.A * y + transformMatrixInv.D;

export const nations = [
    { id: 0, short: "NT", name: "Neutral", sortName: "Neutral" },
    { id: 1, short: "PR", name: "Pirates", sortName: "Pirates" },
    { id: 2, short: "ES", name: "España", sortName: "España" },
    { id: 3, short: "FR", name: "France", sortName: "France" },
    { id: 4, short: "GB", name: "Great Britain", sortName: "Great Britain" },
    { id: 5, short: "VP", name: "Verenigde Provinciën", sortName: "Verenigde Provinciën" },
    { id: 6, short: "DK", name: "Danmark-Norge", sortName: "Danmark-Norge" },
    { id: 7, short: "SE", name: "Sverige", sortName: "Sverige" },
    { id: 8, short: "US", name: "United States", sortName: "United States" },
    { id: 9, short: "FT", name: "Free Town", sortName: "Free Town" },
    { id: 10, short: "RU", name: "Russian Empire", sortName: "Russian Empire" },
    { id: 11, short: "DE", name: "Kingdom of Prussia", sortName: "Prussia" },
    { id: 12, short: "PL", name: "Commonwealth of Poland", sortName: "Poland" }
];

export const capitalToCounty = new Map([
    ["Arenas", "Cayos del Golfo"],
    ["Ays", "Costa del Fuego"],
    ["Baracoa", "Baracoa"],
    ["Basse-Terre", "Basse-Terre"],
    ["Belize", "Belize"],
    ["Black River", "North Mosquito"],
    ["Bluefields", "South Mosquito"],
    ["Brangman's Bluff", "Royal Mosquito"],
    ["Bridgetown", "Windward Isles"],
    ["Calobelo", "Portobelo"],
    ["Campeche", "Campeche"],
    ["Cap-Français", "Cap-Français"],
    ["Caracas", "Caracas"],
    ["Cartagena de Indias", "Cartagena"],
    ["Castries", "Sainte-Lucie"],
    ["Caymans", "George Town"],
    ["Charleston", "South Carolina"],
    ["Christiansted", "Vestindiske Øer"],
    ["Cumaná", "Cumaná"],
    ["Fort-Royal", "Martinique"],
    ["Gasparilla", "Costa de los Calos"],
    ["George Town", "Caymans"],
    ["George's Town", "Exuma"],
    ["Gibraltar", "Lago de Maracaibo"],
    ["Grand Turk", "Turks and Caicos"],
    ["Gustavia", "Gustavia"],
    ["Islamorada", "Los Martires"],
    ["Kidd's Harbour", "Kidd’s Island"],
    ["Kingston / Port Royal", "Surrey"],
    ["La Bahía", "Texas"],
    ["La Habana", "La Habana"],
    ["Les Cayes", "Les Cayes"],
    ["Maracaibo", "Golfo de Maracaibo"],
    ["Marsh Harbour", "Abaco"],
    ["Matina", "Costa Rica"],
    ["Morgan's Bluff", "Andros"],
    ["Mortimer Town", "Inagua"],
    ["Nassau", "New Providence"],
    ["Nouvelle-Orléans", "Louisiane"],
    ["Nuevitas", "Nuevitas del Principe"],
    ["Old Providence", "Providencia"],
    ["Omoa", "Comayaqua"],
    ["Oranjestad", "Bovenwinds"],
    ["Pampatar", "Margarita"],
    ["Pedro Cay", "South Cays"],
    ["Penzacola", "Florida Occidental"],
    ["Pinar del Río", "Filipina"],
    ["Pitt's Town", "Crooked"],
    ["Pointe-à-Pitre", "Grande-Terre"],
    ["Ponce", "Ponce"],
    ["Port-au-Prince", "Port-au-Prince"],
    ["Portobelo", "Portobelo"],
    ["Puerto de España", "Trinidad"],
    ["Puerto Plata", "La Vega"],
    ["Remedios", "Los Llanos"],
    ["Road Town", "Virgin Islands"],
    ["Roseau", "Dominica"],
    ["Saint George's Town", "Bermuda"],
    ["Saint John's", "Leeward Islands"],
    ["Salamanca", "Bacalar"],
    ["San Agustín", "Timucua"],
    ["San Juan", "San Juan"],
    ["San Marcos", "Apalache"],
    ["Sant Iago", "Cuidad de Cuba"],
    ["Santa Fe", "Isla de Pinos"],
    ["Santa Marta", "Santa Marta"],
    ["Santo Domingo", "Santo Domingo"],
    ["Santo Tomé de Guayana", "Orinoco"],
    ["Savanna la Mar", "Cornwall"],
    ["Savannah", "Georgia"],
    ["Selam", "Mérida"],
    ["Soto La Marina", "Nuevo Santander"],
    ["Trinidad", "Quatro Villas"],
    ["Vera Cruz", "Vera Cruz"],
    ["West End", "Grand Bahama"],
    ["Willemstad", "Benedenwinds"],
    ["Wilmington", "North Carolina"]
]);

export function saveJson(fileName, data) {
    // eslint-disable-next-line consistent-return
    fs.writeFile(fileName, JSON.stringify(data), "utf8", err => {
        if (err) {
            return console.log(err);
        }
    });
}

export function readTextFile(fileName) {
    let data = "";
    try {
        data = fs.readFileSync(fileName, "utf8");
    } catch (err) {
        if (err.code === "ENOENT") {
            // console.log("File", fileName, "not found");
        } else {
            throw err;
        }
    }
    return data;
}

export function readJson(fileName) {
    return JSON.parse(readTextFile(fileName));
}

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
    console.error("Request failed -->", error);
};

/**
 * Test if object is empty
 * @param {Object} obj - Object
 * @return {Boolean} True if object is empty
 */
export function isEmpty(obj) {
    return Object.getOwnPropertyNames(obj).length === 0 && obj.constructor === Object;
}

/**
 * Convert radians to degrees (see {@link http://cwestblog.com/2012/11/12/javascript-degree-and-radian-conversion/})
 * @function
 * @param {Number} radians - Radians
 * @return {Number} Degrees
 */
Math.radiansToDegrees = radians => (radians * 180) / Math.PI;

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
    const degrees = Math.radiansToDegrees(theta);
    return (degrees + 360) % 360;
};

/**
 * Calculate the angle in degrees between two points
 * @see https://stackoverflow.com/questions/9970281/java-calculating-the-angle-between-two-points-in-degrees
 * @function
 * @param {Point} centerPt - Center point
 * @param {Point} targetPt - Target point
 * @return {Number} Degrees between centerPt and targetPt
 */
export const rotationAngleInRadians = (centerPt, targetPt) =>
    Math.atan2(centerPt[1], centerPt[0]) - Math.atan2(targetPt[1], targetPt[0]);

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
 * Convert degrees to radians
 * @function
 * @param {Number} degrees - Degrees
 * @return {Number} Radians
 */
export const degreesToRadians = degrees => (Math.PI / 180) * (degrees - 90);

/**
 * {@link https://stackoverflow.com/questions/1026069/how-do-i-make-the-first-letter-of-a-string-uppercase-in-javascript}
 */
export const capitalizeFirstLetter = string => string.charAt(0).toUpperCase() + string.slice(1);

export const defaultFontSize = 16;
export const defaultCircleSize = 16;

/**
 * {@link https://github.com/30-seconds/30-seconds-of-code#round}
 * @param {number} n - number
 * @param {number} decimals - decimals
 * @return {number} Rounded number
 */
export const round = (n, decimals = 0) => Number(`${Math.round(`${n}e${decimals}`)}e-${decimals}`);

/**
 * Round to thousands
 * @param {Number} x - Integer
 * @return {Number} Rounded input
 */
export const roundToThousands = x => round(x, 3);

export const speedConstA = 0.074465523706782;
export const speedConstB = 0.00272175949231;

/**
 * Group by
 * {@link https://stackoverflow.com/questions/14446511/what-is-the-most-efficient-method-to-groupby-on-a-javascript-array-of-objects}
 * @param {*} list - list
 * @param {*} keyGetter - key getter
 * @return {Map<any, any>} Map
 */
export function groupBy(list, keyGetter) {
    const map = new Map();
    list.forEach(item => {
        const key = keyGetter(item);
        const collection = map.get(key);
        if (!collection) {
            map.set(key, [item]);
        } else {
            collection.push(item);
        }
    });
    return map;
}
