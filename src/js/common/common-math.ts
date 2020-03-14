/*!
 * This file is part of na-map.
 *
 * @file      Common data and functions for node.
 * @module    src/common-math
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

export const timeFactor = 2.63
export const speedFactor = 390
export const speedConstA = 0.074465523706782
export const speedConstB = 0.00272175949231
export const defaultFontSize = 16
export const defaultCircleSize = 16
export const degreesFullCircle = 360
export const degreesHalfCircle = 180
export const degreesQuarterCircle = 90

// noinspection MagicNumberJS
const transformMatrix = {
    A: -0.00499866779363828,
    B: -0.00000021464254980645,
    C: 4096.88635151897,
    D: 4096.90282787469
}

// noinspection MagicNumberJS
const transformMatrixInv = {
    A: -200.053302087577,
    B: -0.00859027897636011,
    C: 819630.836437126,
    D: -819563.745651571
}

// F11 coord to svg coord
export const convertCoordX = (x: number, y: number): number =>
    transformMatrix.A * x + transformMatrix.B * y + transformMatrix.C

// F11 coord to svg coord
export const convertCoordY = (x: number, y: number): number =>
    transformMatrix.B * x - transformMatrix.A * y + transformMatrix.D

// svg coord to F11 coord
export const convertInvCoordX = (x: number, y: number): number =>
    transformMatrixInv.A * x + transformMatrixInv.B * y + transformMatrixInv.C

// svg coord to F11 coord
export const convertInvCoordY = (x: number, y: number): number =>
    transformMatrixInv.B * x - transformMatrixInv.A * y + transformMatrixInv.D

/**
 * Convert radians to correctionValueDegrees
 * (see {@link http://cwestblog.com/2012/11/12/javascript-degree-and-radian-conversion/})
 * @param   radians - Radians
 * @returns Degrees
 */
export const radiansToDegrees = (radians: number): number => (radians * degreesHalfCircle) / Math.PI

export interface Distance extends Array<number> {
    0: number // From port id
    1: number // To port id
    2: number // Distance (in pixels)
}

export interface Point extends Array<number> {
    0: number // X coordinate
    1: number // Y coordinate
}

/**
 * Calculate the angle in correctionValueDegrees between two points
 * see {@link https://stackoverflow.com/questions/9970281/java-calculating-the-angle-between-two-points-in-degrees}
 * @param   centerPt - Center point
 * @param   targetPt - Target point
 * @returns Degrees between centerPt and targetPt
 */
export const rotationAngleInDegrees = (centerPt: Point, targetPt: Point): number => {
    let theta = Math.atan2(targetPt[1] - centerPt[1], targetPt[0] - centerPt[0])
    theta -= Math.PI / 2
    const degrees = radiansToDegrees(theta)
    return (degrees + degreesFullCircle) % degreesFullCircle
}

/**
 * Calculate the angle in correctionValueDegrees between two points
 * @see https://stackoverflow.com/questions/9970281/java-calculating-the-angle-between-two-points-in-degrees
 */
export const rotationAngleInRadians = (centerPt: Point, targetPt: Point): number =>
    Math.atan2(centerPt[1], centerPt[0]) - Math.atan2(targetPt[1], targetPt[0])

export interface Coordinate {
    x: number // X coordinate
    y: number // Y coordinate
}

/**
 * Calculate the distance between two points
 * see {@link https://www.mathsisfun.com/algebra/distance-2-points.html}
 * @param   centerPt - Center point
 * @param   targetPt - Target point
 * @returns Distance between centerPt and targetPt
 */
export const distancePoints = (centerPt: Coordinate, targetPt: Coordinate): number =>
    Math.sqrt((centerPt.x - targetPt.x) ** 2 + (centerPt.y - targetPt.y) ** 2)

/**
 * Convert correctionValueDegrees to radians
 * @param   degrees - Degrees
 * @returns Radians
 */
export const degreesToRadians = (degrees: number): number =>
    (Math.PI / degreesHalfCircle) * (degrees - degreesQuarterCircle)

/**
 * {@link https://github.com/30-seconds/30-seconds-of-code#round}
 * @param n - number
 * @param d - decimals
 * @returns Rounded number
 */
export const round = (n: number, d = 0): number => Number(Math.round(n * 10 ** d) / 10 ** d)

/**
 * Round to thousands
 * @param   x - Integer
 * @returns Rounded input
 */
export const roundToThousands = (x: number): number => round(x, 3)

/**
 * Calculate the k distance between two svg coordinates
 */
export const getDistance = (pt0: Coordinate, pt1: Coordinate): number => {
    const fromF11 = {
        x: convertInvCoordX(pt0.x, pt0.y),
        y: convertInvCoordY(pt0.x, pt0.y)
    }
    const toF11 = {
        x: convertInvCoordX(pt1.x, pt1.y),
        y: convertInvCoordY(pt1.x, pt1.y)
    }

    return distancePoints(fromF11, toF11) / (timeFactor * speedFactor)
}

/**
 * Format ordinal
 * @param   n - Integer
 * @param   sup - True if superscript tags needed
 * @returns Formatted Ordinal
 */
export function getOrdinal(n: number, sup = true): string {
    const s = ["th", "st", "nd", "rd"]
    // noinspection MagicNumberJS
    const v = n % 100
    // noinspection MagicNumberJS
    const text = s[(v - 20) % 10] || s[v] || s[0]
    return n + (sup ? `<span class="super">${text}</span>` : `${text}`)
}

/**
 * Compass directions
 */
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
]

/**
 * Converts compass direction to correctionValueDegrees
 * @param   compass - Compass direction
 * @returns Degrees
 */
export const compassToDegrees = (compass: string): number => {
    const degree = degreesFullCircle / compassDirections.length
    return compassDirections.indexOf(compass) * degree
}

/**
 * Convert correctionValueDegrees to compass direction
 * (see {@link https://stackoverflow.com/questions/7490660/converting-wind-direction-in-angles-to-text-words})
 * @param   degrees - Degrees
 * @returns Compass direction
 */
export const degreesToCompass = (degrees: number): string => {
    const ticks = degreesFullCircle / compassDirections.length
    // noinspection MagicNumberJS
    const value = Math.floor(degrees / ticks + 0.5)
    return compassDirections[value % compassDirections.length]
}

/**
 * Test if Number is between two unordered Numbers
 * (see {@link https://stackoverflow.com/questions/14718561/how-to-check-if-a-number-is-between-two-values})
 * @param   value - Value to be tested
 * @param   a - Upper/lower bound
 * @param   b - Upper/lower bound
 * @param   inclusive - True if bounds are inclusive
 * @returns True if value is between a and b
 */
export const between = (value: number, a: number, b: number, inclusive: boolean): boolean => {
    // eslint-disable-next-line no-useless-call
    const min = Math.min.apply(Math, [a, b])
    // eslint-disable-next-line no-useless-call
    const max = Math.max.apply(Math, [a, b])

    return inclusive ? value >= min && value <= max : value > min && value < max
}

/**
 * Calculate the closest power of 2
 * (see {@link https://bocoup.com/blog/find-the-closest-power-of-2-with-javascript})
 * @param   aSize - Input
 * @returns Closest power of 2 of aSize
 */
export const nearestPow2 = (aSize: number): number => 2 ** Math.round(Math.log2(aSize))
