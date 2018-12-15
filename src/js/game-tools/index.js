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
import ListRecipes from "./list-recipes";
import ListWoods from "./list-woods";
import { checkFetchStatus, getJsonFromFetch, putFetchError } from "../util";

let map;

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
    }
];

function setupData(data) {
    const cannonData = JSON.parse(JSON.stringify(data.cannons));
    const cannonList = new ListCannons(cannonData);

    const ownershipData = JSON.parse(JSON.stringify(data.ownership)),
        nationData = JSON.parse(JSON.stringify(data.nations));
    const ownershipList = new ListPortOwnerships(ownershipData, nationData);

    const moduleData = JSON.parse(JSON.stringify(data.modules));
    const moduleList = new ListModules(moduleData);

    const recipeData = JSON.parse(JSON.stringify(data.recipes.recipe));
    const recipeList = new ListRecipes(recipeData, moduleData);

    const ingredientData = JSON.parse(JSON.stringify(data.recipes.ingredient));
    const ingredientList = new ListIngredients(ingredientData, moduleData);

    const buildingData = JSON.parse(JSON.stringify(data.buildings));
    const buildingList = new ListBuildings(buildingData);
}

function readData() {
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
}

function init(mapInstance) {
    map = mapInstance;
    readData();
    console.log("init map", map);
    const shipCompare = new CompareShips(map._shipData, map._woodData);
    const woodCompare = new CompareWoods(map._woodData, "wood");
    const woodList = new ListWoods(map._woodData);
}

// eslint-disable-next-line import/prefer-default-export
export { init };
