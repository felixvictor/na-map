/**
 * This file is part of na-map.
 *
 * @file      Game tools main file.
 * @module    game-tools/index
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import CompareShips from "./compare-ships";
import CompareWoods from "./compare-woods";
import ListBuildings from "./list-buildings";
import ListCannons from "./list-cannons";
import ListIngredients from "./list-ingredients";
import ListModules from "./list-modules";
import ListPortOwnerships from "./list-port-ownerships";
import ListShipBlueprints from "./list-ship-blueprints";
import ListRecipes from "./list-recipes";
import ListWoods from "./list-woods";
import { checkFetchStatus, getJsonFromFetch, putFetchError } from "../util";

/**
 * Data directory
 * @type {string}
 */
const dataDir = "data";

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
        name: "blueprints"
    }
];

/**
 * Setup all game tool modules
 * @param {object} data - Data
 * @return {void}
 */
const setupData = data => {
    const shipCompare = new CompareShips(data.ships.shipData, data.woods);
    const woodCompare = new CompareWoods(data.woods, "wood");
    const woodList = new ListWoods(data.woods);

    const cannonList = new ListCannons(data.cannons);

    const ownershipList = new ListPortOwnerships(data.ownership, data.nations);

    const moduleList = new ListModules(data.modules);

    const recipeList = new ListRecipes(data.recipes.recipe, data.modules);

    const ingredientList = new ListIngredients(data.recipes.ingredient, data.modules);

    const buildingList = new ListBuildings(data.buildings);

    const blueprintList = new ListShipBlueprints(data.blueprints.shipBlueprints, data.woods);
};

/**
 * Fetch json data
 * @return {void}
 */
const readData = () => {
    const jsonData = [];
    const fileData = {};

    dataSources.forEach((datum, i) => {
        jsonData[i] = fetch(`${dataDir}/${datum.fileName}`)
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
 * @return {void}
 */
const init = () => {
    readData();
};

// eslint-disable-next-line import/prefer-default-export
export { init };
