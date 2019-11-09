/**
 * This file is part of na-map.
 *
 * @file      Game tools main file.
 * @module    game-tools/index
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018, 2019
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import "bootstrap/js/dist/util";
import "bootstrap/js/dist/modal";

import { default as semver } from "semver";

import { registerEvent } from "../analytics";
import { appVersion } from "../common";

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

/**
 * Init
 * @param {string} serverId - Server id
 * @param {URLSearchParams} urlParams - Search Parameters
 * @return {void}
 */
const init = (serverId, urlParams) => {
    const shipCompare = new CompareShips("ship-compare");

    const checkShipCompareData = () => {
        if (urlParams.has("cmp") && urlParams.has("v") && semver.lte(urlParams.get("v"), appVersion)) {
            registerEvent("Menu", "Paste ship compare");
            shipCompare.initFromClipboard(urlParams);
        }
    };

    // eslint-disable-next-line no-unused-vars
    const woodCompare = new CompareWoods("wood");

    // eslint-disable-next-line no-unused-vars
    const woodList = new ListWoods();

    // eslint-disable-next-line no-unused-vars
    const cannonList = new ListCannons();

    // eslint-disable-next-line no-unused-vars
    const ownershipList = new ListPortOwnerships();

    // eslint-disable-next-line no-unused-vars
    const lootList = new ListLoot();

    // eslint-disable-next-line no-unused-vars
    const moduleList = new ListModules();

    // eslint-disable-next-line no-unused-vars
    const recipeList = new ListRecipes(serverId);

    // eslint-disable-next-line no-unused-vars
    const shipList = new ListShips();

    // eslint-disable-next-line no-unused-vars
    const ingredientList = new ListIngredients();

    // eslint-disable-next-line no-unused-vars
    const buildingList = new ListBuildings();

    // eslint-disable-next-line no-unused-vars
    const blueprintList = new ListShipBlueprints();

    checkShipCompareData();
};

export { init };
