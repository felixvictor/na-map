/*!
 * This file is part of na-map.
 *
 * @file      Common data and functions for node.
 * @module    src/common-math
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
export const timeFactor = 2.63;
export const speedFactor = 390;
export const speedConstA = 0.074465523706782;
export const speedConstB = 0.00272175949231;
export const defaultFontSize = 16;
export const defaultCircleSize = 16;
export const degreesFullCircle = 360;
export const degreesHalfCircle = 180;
export const degreesQuarterCircle = 90;
const transformMatrix = {
    A: -0.00499866779363828,
    B: -0.00000021464254980645,
    C: 4096.88635151897,
    D: 4096.90282787469
};
const transformMatrixInv = {
    A: -200.053302087577,
    B: -0.00859027897636011,
    C: 819630.836437126,
    D: -819563.745651571
};
export const convertCoordX = (x, y) => transformMatrix.A * x + transformMatrix.B * y + transformMatrix.C;
export const convertCoordY = (x, y) => transformMatrix.B * x - transformMatrix.A * y + transformMatrix.D;
export const convertInvCoordX = (x, y) => transformMatrixInv.A * x + transformMatrixInv.B * y + transformMatrixInv.C;
export const convertInvCoordY = (x, y) => transformMatrixInv.B * x - transformMatrixInv.A * y + transformMatrixInv.D;
export const radiansToDegrees = (radians) => (radians * degreesHalfCircle) / Math.PI;
export const rotationAngleInDegrees = (centerPt, targetPt) => {
    let theta = Math.atan2(targetPt[1] - centerPt[1], targetPt[0] - centerPt[0]);
    theta -= Math.PI / 2;
    const degrees = radiansToDegrees(theta);
    return (degrees + degreesFullCircle) % degreesFullCircle;
};
export const rotationAngleInRadians = (centerPt, targetPt) => Math.atan2(centerPt[1], centerPt[0]) - Math.atan2(targetPt[1], targetPt[0]);
export const distancePoints = (centerPt, targetPt) => Math.sqrt((centerPt.x - targetPt.x) ** 2 + (centerPt.y - targetPt.y) ** 2);
export const degreesToRadians = (degrees) => (Math.PI / degreesHalfCircle) * (degrees - degreesQuarterCircle);
export const round = (n, d = 0) => Number(Math.round(n * 10 ** d) / 10 ** d);
export const roundToThousands = (x) => round(x, 3);
export const getDistance = (pt0, pt1) => {
    const fromF11 = {
        x: convertInvCoordX(pt0.x, pt0.y),
        y: convertInvCoordY(pt0.x, pt0.y)
    };
    const toF11 = {
        x: convertInvCoordX(pt1.x, pt1.y),
        y: convertInvCoordY(pt1.x, pt1.y)
    };
    return distancePoints(fromF11, toF11) / (timeFactor * speedFactor);
};
export function getOrdinal(n, sup = true) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    const text = s[(v - 20) % 10] || s[v] || s[0];
    return n + (sup ? `<span class="super">${text}</span>` : `${text}`);
}
export const compassDirections = [
    "N",
    "N⅓NE",
    "N⅔NE",
    "NE",
    "E⅔NE",
    "E⅓NE",
    "E",
    "E⅓SE",
    "E⅔SE",
    "SE",
    "S⅔SE",
    "S⅓SE",
    "S",
    "S⅓SW",
    "S⅔SW",
    "SW",
    "W⅔SW",
    "W⅓SW",
    "W",
    "W⅓NW",
    "W⅔NW",
    "NW",
    "N⅔NW",
    "N⅓NW"
];
export const compassToDegrees = (compass) => {
    const degree = degreesFullCircle / compassDirections.length;
    return compassDirections.indexOf(compass) * degree;
};
export const degreesToCompass = (degrees) => {
    const ticks = degreesFullCircle / compassDirections.length;
    const value = Math.floor(degrees / ticks + 0.5);
    return compassDirections[value % compassDirections.length];
};
export const between = (value, a, b, inclusive) => {
    const min = Math.min.apply(Math, [a, b]);
    const max = Math.max.apply(Math, [a, b]);
    return inclusive ? value >= min && value <= max : value > min && value < max;
};
export const nearestPow2 = (aSize) => 2 ** Math.round(Math.log2(aSize));
//# sourceMappingURL=common-math.js.map