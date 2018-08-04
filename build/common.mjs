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

export function saveJson(fileName, data) {
    // eslint-disable-next-line consistent-return
    fs.writeFile(fileName, JSON.stringify(data), "utf8", err => {
        if (err) {
            return console.log(err);
        }
    });
}

export const readJson = fileName => JSON.parse(fs.readFileSync(fileName, "utf8"));

export const readTextFile = fileName => fs.readFileSync(fileName, "utf8");



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
