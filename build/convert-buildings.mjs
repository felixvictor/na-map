/**
 * This file is part of na-map.
 *
 * @file      Building data.
 * @module    build/convert-buildings
 * @author    iB aka Felix Victor
 * @copyright 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import * as path from "path";
import {
    baseAPIFilename,
    cleanName,
    commonPaths,
    readJson,
    saveJsonAsync,
    serverNames,
    serverStartDate as serverDate,
    sortBy
} from "./common.mjs";

const idWorkshop = 450;
const idAcademy = 879;
const idSeasoningShed = 2291;
const idDoubloons = 989;
const idTools = 1825;
const obsoleteBuildings = [
    "Compass Wood Forest",
    "Copper Ore Mine",
    "Gold Mine",
    "Pine Forest",
    "Red Wood Forest",
    "Saltpeter Cave",
    "Silver Mine",
    "Sulphur Mine",
    "Tobacco Plantation"
];

let apiItems = [];

const getItemsCraftedByWorkshop = () =>
    apiItems
        .filter(
            item =>
                item.BuildingRequirements &&
                item.BuildingRequirements[0] &&
                item.BuildingRequirements[0].BuildingTemplate === idWorkshop
        )
        .map(recipe => ({
            name: cleanName(recipe.Name).replace(" Blueprint", ""),
            price: 0
        }))
        .sort(sortBy(["name"]));

const getItemsCraftedByAcademy = () =>
    apiItems
        .filter(
            item =>
                item.BuildingRequirements &&
                item.BuildingRequirements[0] &&
                item.BuildingRequirements[0].BuildingTemplate === idAcademy
        )
        .map(recipe => ({
            name: cleanName(recipe.Name).replace(" Blueprint", ""),
            price: 0
        }))
        .sort(sortBy(["name"]));

const getItemsCraftedBySeasoningShed = () =>
    apiItems
        .filter(
            item =>
                item.BuildingRequirements &&
                item.BuildingRequirements[0] &&
                item.BuildingRequirements[0].BuildingTemplate === idSeasoningShed
        )
        .map(recipe => ({
            name: cleanName(recipe.Name),
            price: 0
        }))
        .sort(sortBy(["name"]));

/**
 * Convert API building data and save sorted as JSON
 * @returns {void}
 */
const convertBuildings = () => {
    const buildings = new Map();

    const resources = new Map(
        apiItems.map(apiResource => [
            apiResource.Id,
            { name: cleanName(apiResource.Name), price: apiResource.BasePrice }
        ])
    );

    const resourceRecipes = new Map(
        apiItems
            .filter(item => item.ItemType === "RecipeResource")
            .map(recipe => [
                recipe.Results[0].Template,
                {
                    price: recipe.GoldRequirements,
                    amount: recipe.Results[0].Amount,
                    labour: recipe.LaborPrice
                }
            ])
    );

    apiItems
        .filter(item => item.ItemType === "Building" && !obsoleteBuildings.includes(item.Name))
        .forEach(apiBuilding => {
            const building = {
                id: apiBuilding.Id,
                name: cleanName(apiBuilding.Name),
                resource:
                    resources.get(
                        apiBuilding.ProduceResource ? apiBuilding.ProduceResource : apiBuilding.RequiredPortResource
                    ) || [],
                batch: resourceRecipes.get(apiBuilding.RequiredPortResource),
                levels: apiBuilding.Levels.map(level => ({
                    labourDiscount: level.LaborDiscount,
                    production: level.ProductionLevel * apiBuilding.BaseProduction,
                    maxStorage: level.MaxStorage,
                    price: level.UpgradePriceGold,
                    materials: level.UpgradePriceMaterials.map(material => ({
                        item: resources.get(material.Template).name,
                        amount: material.Amount
                    }))
                }))
            };

            // Ignore double entries
            if (!buildings.has(building.name)) {
                if (building.name === "Shipyard") {
                    building.resource = { name: "Ships", price: 0 };
                    building.byproduct = [];
                    building.batch = [];
                } else if (building.name === "Academy") {
                    building.resource = getItemsCraftedByAcademy();
                    building.byproduct = [];
                    building.batch = [];
                } else if (building.name === "Forge") {
                    building.resource = { name: "Cannons", price: 0 };
                    building.byproduct = [];
                    building.batch = [];
                } else if (building.name === "Workshop") {
                    building.resource = getItemsCraftedByWorkshop();
                    building.byproduct = [];
                    building.batch = [];
                } else if (building.name === "Seasoning Shed") {
                    building.resource = getItemsCraftedBySeasoningShed();
                    building.byproduct = [];
                    building.batch = [];
                }

                buildings.set(building.name, building);
            }
        });

    let result = [...buildings.values()];

    const getStandardPrices = name =>
        prices.standard.find(standardItem => standardItem.name === name.replace(" (S)", ""));

    const getSeasonedItemPrice = name =>
        apiItems.find(
            item =>
                item.ItemType === "Recipe" && item.Name.replace(" Log", "") === name.replace("White Oak", "White oak")
        );

    const prices = {};

    prices.standard = result
        .filter(building => !Array.isArray(building.resource) && building.resource.price)
        .map(building => ({
            name: building.resource.name.replace(" Log", ""),
            real: building.resource.price,
            labour: building.batch.labour
        }))
        .sort(sortBy(["name"]));

    prices.seasoned = getItemsCraftedBySeasoningShed()
        .map(seasonedItem => {
            const name = seasonedItem.name.replace(" Log", "");
            const seasonedItemPrices = getSeasonedItemPrice(name);
            return {
                name,
                real: getStandardPrices(name).real,
                labour: getSeasonedItemPrice(name).LaborPrice,
                doubloon: seasonedItemPrices.FullRequirements.find(requirement => requirement.Template === idDoubloons)
                    .Amount,
                tool: seasonedItemPrices.FullRequirements.find(requirement => requirement.Template === idTools).Amount
            };
        })
        .sort(sortBy(["name"]));

    saveJsonAsync(commonPaths.filePrices, prices);

    result = result.filter(building => Object.keys(building).length).sort(sortBy(["id"]));
    saveJsonAsync(commonPaths.fileBuilding, result);
};

convertBuildings();

export const convertBuildingData = () => {
    apiItems = readJson(path.resolve(baseAPIFilename, `${serverNames[0]}-ItemTemplates-${serverDate}.json`));

    convertBuildings();
};
