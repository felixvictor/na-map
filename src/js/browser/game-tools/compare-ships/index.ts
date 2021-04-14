/*!
 * This file is part of na-map.
 *
 * @file      Compare ships index file.
 * @module    game-tools/compare-ships
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { appVersion } from "common/common-browser"

import { initDefault } from "./init-default"
import { initFromClipboard } from "./init-from-clipboard"

const shipColumnType = ["base", "c1", "c2"]
export type ShipColumnType = typeof shipColumnType[number]

export { CompareShips } from "./compare-ships"
export { initFromJourney } from "./init-from-journey"

const hasShipCompareParams = (urlParams: URLSearchParams): boolean => {
    if (urlParams.has("cmp") && urlParams.has("v")) {
        const version = urlParams.get("v")
        // Compare main versions
        if (version && version.split(".")[0] === appVersion.split(".")[0]) {
            return true
        }
    }

    return false
}

export const checkShipCompareData = (urlParams: URLSearchParams): void => {
    if (hasShipCompareParams(urlParams)) {
        void initFromClipboard(urlParams)
    } else {
        void initDefault()
    }
}
