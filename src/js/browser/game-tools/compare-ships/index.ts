/*!
 * This file is part of na-map.
 *
 * @file      Compare ships index file.
 * @module    game-tools/compare-ships
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { initDefault } from "./init-default"
import { initFromClipboard } from "./init-from-clipboard"
import { ShipCompareSearchParamsRead } from "./search-params-read"

export const shipColumnType = ["base", "c1", "c2"]
export type ShipColumnType = typeof shipColumnType[number]

export { CompareShips } from "./compare-ships"
export { initFromJourney } from "./init-from-journey"

export const checkShipCompareData = (readParams?: ShipCompareSearchParamsRead): void => {
    if (readParams === undefined) {
        void initDefault()
    } else {
        void initFromClipboard(readParams)
    }
}
