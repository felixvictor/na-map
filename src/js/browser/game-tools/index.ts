/*!
 * This file is part of na-map.
 *
 * @file      Game tools main file.
 * @module    game-tools/index
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { checkShipCompareData } from "./compare-ships"
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
import { CompareWoods } from "./compare-woods"
import { ShipCompareSearchParamsRead } from "./compare-ships/search-params-read"

/**
 * Init
 */
const init = (serverId: string, readParams?: ShipCompareSearchParamsRead): void => {
    checkShipCompareData(readParams)

    void new CompareWoods()
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
