/*!
 * This file is part of na-map.
 *
 * @file      Compare woods.
 * @module    game-tools/compare-woods
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

export const woodFamily = ["regular", "seasoned", "exceptional"]!
export type WoodFamily = typeof woodFamily[number]

export const woodType = ["frame", "trim"]!
export type WoodType = typeof woodType[number]

export const woodColumnType = ["base", "c1", "c2", "c3"]!
export type WoodColumnType = typeof woodColumnType[number]

export { CompareWoods } from "./compare-woods"
