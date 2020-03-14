/*!
 * This file is part of na-map.
 *
 * @file      Game tools main file.
 * @module    game-tools/index
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import "bootstrap/js/dist/util";
import "bootstrap/js/dist/modal";
import { default as semver } from "semver";
import { registerEvent } from "../analytics.js";
import { appVersion } from "../../common/common-browser";
import CompareShips from "./compare-ships";
import CompareWoods from "./compare-woods";
import ListBuildings from "./list-buildings";
import ListCannons from "./list-cannons";
import ListIngredients from "./list-ingredients";
import ListLoot from "./list-loot";
import ListModules from "./list-modules";
import ListPortOwnerships from "./list-port-ownerships";
import ListShipBlueprints from "./list-ship-blueprints";
import ListRecipes from "./list-recipes";
import ListShips from "./list-ships";
import ListWoods from "./list-woods";
const init = (serverId, urlParams) => {
    const shipCompare = new CompareShips("ship-compare");
    const checkShipCompareData = () => {
        if (urlParams.has("cmp") && urlParams.has("v") && semver.lte(urlParams.get("v"), appVersion)) {
            registerEvent("Menu", "Paste ship compare");
            shipCompare.initFromClipboard(urlParams);
        }
    };
    checkShipCompareData();
    const woodCompare = new CompareWoods("wood");
    const woodList = new ListWoods();
    const cannonList = new ListCannons();
    const ownershipList = new ListPortOwnerships();
    const lootList = new ListLoot();
    const moduleList = new ListModules();
    const recipeList = new ListRecipes(serverId);
    const shipList = new ListShips();
    const ingredientList = new ListIngredients();
    const buildingList = new ListBuildings();
    const blueprintList = new ListShipBlueprints();
};
export { init };
//# sourceMappingURL=index.js.map