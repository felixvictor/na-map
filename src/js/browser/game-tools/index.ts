/*!
 * This file is part of na-map.
 *
 * @file      Game tools main file.
 * @module    game-tools/index
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { default as semver } from "semver"

import { registerEvent } from "../analytics"
import { appVersion } from "../../common/common-browser"

import { CompareShips } from "./compare-ships"
import CompareWoods from "./compare-woods"
import ListBuildings from "./list-buildings"
import ListCannons from "./list-cannons"
import ListIngredients from "./list-ingredients"
import ListLoot from "./list-loot"
import ListModules from "./list-modules"
import ListPortOwnerships from "./list-port-ownerships"
import ListRecipes from "./list-recipes"
import ListShips from "./list-ships"
import ListShipBlueprints from "./list-ship-blueprints"
import ListWoods from "./list-woods"

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
            if (version && semver.lte(version, appVersion)) {
                registerEvent("Menu", "Paste ship compare")
                shipCompare.initFromClipboard(urlParams)
            }
        }
    }

    checkShipCompareData()

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const woodCompare = new CompareWoods("wood")

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const woodList = new ListWoods()

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const buildingList = new ListBuildings()

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const cannonList = new ListCannons()

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const ingredientList = new ListIngredients()

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const lootList = new ListLoot()

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const moduleList = new ListModules()

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const ownershipList = new ListPortOwnerships()

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const recipeList = new ListRecipes(serverId)

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const shipList = new ListShips()

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const blueprintList = new ListShipBlueprints()
}

export { init }
