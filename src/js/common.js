/*
    common.js
 */

import { distancePoints } from "./util";

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
export const convertInvCoordX = (x, y) => transformMatrixInv.A * x + transformMatrixInv.B * y + transformMatrixInv.C;

// svg coord to F11 coord
export const convertInvCoordY = (x, y) => transformMatrixInv.B * x - transformMatrixInv.A * y + transformMatrixInv.D;

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

export const defaultFontSize = 16;
export const defaultCircleSize = 16;

/**
 * Calculate the k distance between two svg coordinates
 * @function
 * @param {Point} pt0 - First point
 * @param {Point} pt1 - Second point
 * @return {Number} Distance between Pt0 and Pt1 in k
 */
export function getDistance(pt0, pt1) {
    const F11X0 = convertInvCoordX(pt0[0], pt0[1]),
        F11Y0 = convertInvCoordY(pt0[0], pt0[1]),
        F11X1 = convertInvCoordX(pt1[0], pt1[1]),
        F11Y1 = convertInvCoordY(pt1[0], pt1[1]),
        factor = 2.56,
        kFactor = 400 * factor;

    return distancePoints([F11X0, F11Y0], [F11X1, F11Y1]) / kFactor;
}

export const speedConstA = 0.074465523706782;
export const speedConstB = 0.00272175949231;
