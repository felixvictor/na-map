/**
 * This file is part of na-map.
 *
 * @file      Game tools main file.
 * @module    game-tools/index
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import "bootstrap/js/dist/util";
import "bootstrap/js/dist/modal";

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

import { registerEvent } from "../analytics";
import { appVersion } from "../common";
import { checkFetchStatus, getJsonFromFetch, putFetchError } from "../util";

/**
 * Data directory
 * @type {string}
 */
const dataDirectory = "data";

let urlParams = "";
let serverId = "";

/**
 * @type {Array<fileName: string, name: string>}
 */
const dataSources = [
    {
        fileName: "ships.json",
        name: "ships"
    },
    {
        fileName: "woods.json",
        name: "woods"
    },
    {
        fileName: "cannons.json",
        name: "cannons"
    },
    {
        fileName: "loot.json",
        name: "loot"
    },
    {
        fileName: "modules.json",
        name: "modules"
    },
    {
        fileName: "recipes.json",
        name: "recipes"
    },
    {
        fileName: "buildings.json",
        name: "buildings"
    },
    {
        fileName: "ownership.json",
        name: "ownership"
    },
    {
        fileName: "nations.json",
        name: "nations"
    },
    {
        fileName: "ship-blueprints.json",
        name: "shipBlueprints"
    }
];

/**
 * Setup all game tool modules
 * @param {object} data - Data
 * @return {void}
 */
const setupData = data => {
    const shipCompare = new CompareShips({
        shipData: data.ships,
        woodData: data.woods,
        moduleData: data.modules
    });

    const checkShipCompareData = () => {
        if (urlParams.has("cmp") && urlParams.has("v") && urlParams.get("v") === appVersion) {
            registerEvent("Menu", "Paste ship compare");
            shipCompare.initFromClipboard(urlParams);
        }
    };

    // eslint-disable-next-line no-unused-vars
    const woodCompare = new CompareWoods(data.woods, "wood");
    // eslint-disable-next-line no-unused-vars
    const woodList = new ListWoods(data.woods);

    // eslint-disable-next-line no-unused-vars
    const cannonList = new ListCannons(data.cannons);

    // eslint-disable-next-line no-unused-vars
    const ownershipList = new ListPortOwnerships(data.ownership, data.nations);

    // eslint-disable-next-line no-unused-vars
    const lootList = new ListLoot(data.loot);

    // eslint-disable-next-line no-unused-vars
    const moduleList = new ListModules(data.modules);

    // eslint-disable-next-line no-unused-vars
    const recipeList = new ListRecipes(data.recipes.recipe, data.modules, serverId);

    // eslint-disable-next-line no-unused-vars
    const shipList = new ListShips(data.ships);

    // eslint-disable-next-line no-unused-vars
    const ingredientList = new ListIngredients(data.recipes.ingredient, data.modules);

    // eslint-disable-next-line no-unused-vars
    const buildingList = new ListBuildings(data.buildings);

    // eslint-disable-next-line no-unused-vars
    const blueprintList = new ListShipBlueprints(data.shipBlueprints, data.woods);

    checkShipCompareData();
};

/**
 * Fetch json data
 * @return {void}
 */
const readData = () => {
    const jsonData = [];
    const fileData = {};

    dataSources.forEach((datum, i) => {
        jsonData[i] = fetch(`${dataDirectory}/${datum.fileName}`)
            .then(checkFetchStatus)
            .then(getJsonFromFetch);
    });

    Promise.all(jsonData)
        .then(values => {
            values.forEach((value, i) => {
                fileData[dataSources[i].name] = value;
            });
            setupData(fileData);
        })
        .catch(putFetchError);
};

/**
 * Init
 * @param {string} id - Server id
 * @param {URLSearchParams} searchParams - Search Parameters
 * @return {void}
 */
const init = (id, searchParams) => {
    serverId = id;
    urlParams = searchParams;

    readData();
};

// eslint-disable-next-line import/prefer-default-export
export { init };
