/*!
 * This file is part of na-map.
 *
 * @file      Game tools main file.
 * @module    game-tools/index
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import { default as semver } from "semver";
import { registerEvent } from "../analytics";
import { appVersion } from "../../common/common-browser";
import { CompareShips } from "./compare-ships";
import CompareWoods from "./compare-woods";
import ListBuildings from "./list-buildings";
import ListCannons from "./list-cannons";
import ListIngredients from "./list-ingredients";
import ListLoot from "./list-loot";
import ListModules from "./list-modules";
import ListPortOwnerships from "./list-port-ownerships";
const init = (serverId, urlParams) => {
    const shipCompare = new CompareShips("ship-compare");
    const checkShipCompareData = () => {
        if (urlParams.has("cmp") && urlParams.has("v")) {
            const version = urlParams.get("v");
            if (version && semver.lte(version, appVersion)) {
                registerEvent("Menu", "Paste ship compare");
                shipCompare.initFromClipboard(urlParams);
            }
        }
    };
    checkShipCompareData();
    const woodCompare = new CompareWoods("wood");
    const buildingList = new ListBuildings();
    const cannonList = new ListCannons();
    const ingredientList = new ListIngredients();
    const lootList = new ListLoot();
    const moduleList = new ListModules();
    const ownershipList = new ListPortOwnerships();
};
export { init };
//# sourceMappingURL=index.js.map