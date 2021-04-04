/*!
 * This file is part of na-map.
 *
 * @file      Compare ships index file.
 * @module    game-tools/compare-ships
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

const shipColumnType = ["Base", "C1", "C2"]
export type ShipColumnType = typeof shipColumnType[number]

export { Ship } from "./ship"
export { ShipBase } from "./ship-base"
export { ShipComparison } from "./ship-comparison"
export { CompareShips } from "./compare-ships"
