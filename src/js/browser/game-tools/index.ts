/*!
 * This file is part of na-map.
 *
 * @file      Game tools main file.
 * @module    game-tools/index
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { registerEvent } from "../analytics"
import { appVersion } from "../../common/common-browser"

import { CompareShips } from "./compare-ships"
import CompareWoods from "./compare-woods"
import ListBuildings from "./list-buildings"
import ListCannons from "./list-cannons"
import ListIngredients from "./list-ingredients"
import ListLoot from "./list-loot"
import ListModules from "./list-modules"
import ListPortBattles from "./list-pb"
import ListPortBonus from "./list-port-bonus"
import ListRecipes from "./list-recipes"
import ListShips from "./list-ships"
import ListShipBlueprints from "./list-ship-blueprints"
import ListWoods from "./list-woods"

import ShowIncomeMap from "./show-income-map"
import ShowPortOwnerships from "./show-port-ownerships"

import "../../../scss/game-tools.scss"

/**
 * Init
 * @param serverId - Server id
 * @param urlParams - Search Parameters
 */
const init = (serverId: string, urlParams: URLSearchParams): void => {
    const shipCompare = new CompareShips("ship-compare")

    const checkShipCompareData = (): void => {
        if (urlParams.has("cmp") && urlParams.has("v")) {
            const version = urlParams.get("v")
            // Compare main versions
            if (version && version.split(".")[0] === appVersion.split(".")[0]) {
                registerEvent("Menu", "Paste ship compare")
                void shipCompare.initFromClipboard(urlParams)
            }
        }
    }

    checkShipCompareData()

    void new CompareWoods("wood")
    void new ListWoods()
    void new ListBuildings()
    void new ListCannons()
    void new ListIngredients()
    void new ListLoot()
    void new ListModules()
    void new ListPortBattles(serverId)
    void new ListPortBonus(serverId)
    void new ListRecipes(serverId)
    void new ListShips()
    void new ListShipBlueprints()

    void new ShowIncomeMap(serverId)
    void new ShowPortOwnerships(serverId)
}

export { init }
