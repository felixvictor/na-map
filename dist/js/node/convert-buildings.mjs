/*!
 * This file is part of na-map.
 *
 * @file      Building data.
 * @module    src/node/convert-buildings
 * @author    iB aka Felix Victor
 * @copyright 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import path from "path";
import { baseAPIFilename, commonPaths, serverStartDate as serverDate } from "../common/common-dir";
import { readJson, saveJsonAsync } from "../common/common-file";
import { cleanName, sortBy } from "../common/common-node";
import { serverIds } from "../common/servers";
const idWorkshop = 450;
const idAcademy = 879;
const idSeasoningShed = 2291;
const idDoubloons = 989;
const idTools = 1825;
const obsoleteBuildings = new Set([
    "Compass Wood Forest",
    "Copper Ore Mine",
    "Gold Mine",
    "Pine Forest",
    "Red Wood Forest",
    "Saltpeter Cave",
    "Silver Mine",
    "Sulphur Mine",
    "Tobacco Plantation",
]);
const itemIsUsed = new Set([
    1525,
    1939,
    2336,
    2460,
    2461,
    2480,
    2482,
]);
let apiItems;
const getItemsCrafted = (buildingId) => apiItems
    .filter((item) => (!item.NotUsed || itemIsUsed.has(item.Id)) &&
    item.BuildingRequirements?.[0]?.BuildingTemplate === buildingId)
    .map((recipe) => ({
    id: recipe.Id,
    name: cleanName(recipe.Name).replace(" Blueprint", ""),
    price: 0,
}))
    .sort((a, b) => a.name.localeCompare(b.name));
const getItemsCraftedByWorkshop = () => getItemsCrafted(idWorkshop);
const getItemsCraftedByAcademy = () => getItemsCrafted(idAcademy);
const getItemsCraftedBySeasoningShed = () => getItemsCrafted(idSeasoningShed);
const getBuildings = () => {
    const buildings = new Map();
    const buildingResources = new Map(apiItems.map((apiResource) => [
        Number(apiResource.Id),
        { id: apiResource.Id, name: cleanName(apiResource.Name), price: apiResource.BasePrice },
    ]));
    const apiRecipeResources = apiItems.filter((item) => item.ItemType === "RecipeResource");
    const resourceRecipes = new Map(apiRecipeResources.map((recipe) => [
        recipe.Results[0].Template,
        {
            price: recipe.GoldRequirements,
            amount: recipe.Results[0].Amount,
            labour: recipe.LaborPrice,
        },
    ]));
    const apiBuilding = apiItems.filter((item) => item.ItemType === "Building" && !obsoleteBuildings.has(item.Name));
    apiBuilding.forEach((apiBuilding) => {
        const building = {
            id: Number(apiBuilding.Id),
            name: cleanName(apiBuilding.Name),
            result: [
                buildingResources.get(apiBuilding.ProduceResource ? apiBuilding.ProduceResource : apiBuilding.RequiredPortResource),
            ],
            batch: resourceRecipes.get(apiBuilding.RequiredPortResource),
            levels: apiBuilding.Levels.map((level) => ({
                labourDiscount: level.LaborDiscount,
                production: level.ProductionLevel * apiBuilding.BaseProduction,
                maxStorage: level.MaxStorage,
                price: level.UpgradePriceGold,
                materials: level.UpgradePriceMaterials.map((material) => ({
                    item: buildingResources.get(material.Template)?.name ?? "",
                    amount: material.Amount,
                })),
            })),
        };
        if (!buildings.has(building.name)) {
            switch (building.name) {
                case "Shipyard":
                    building.result = [{ id: 0, name: "Ships", price: 0 }];
                    building.byproduct = [];
                    break;
                case "Academy":
                    building.result = getItemsCraftedByAcademy();
                    building.byproduct = [];
                    break;
                case "Forge":
                    building.result = [{ id: 0, name: "Cannons", price: 0 }];
                    building.byproduct = [];
                    break;
                case "Workshop":
                    building.result = getItemsCraftedByWorkshop();
                    building.byproduct = [];
                    break;
                case "Seasoning Shed":
                    building.result = getItemsCraftedBySeasoningShed();
                    building.byproduct = [];
                    break;
            }
            buildings.set(building.name, building);
        }
    });
    return [...buildings.values()];
};
const getAPISeasonedItem = (name) => apiItems.find((item) => item.ItemType === "Recipe" &&
    item.Name.replace(" Log", "") === name.replace(/\s/g, " ").replace("White Oak", "White oak"));
const getPrices = (buildings) => {
    const prices = { standard: [], seasoned: [] };
    const getStandardPrices = (name) => prices.standard.find((standardItem) => standardItem.name === name.replace(" (S)", ""))?.reales;
    const standardPrices = buildings.filter((building) => building.result?.[0].price)
        .map((building) => {
        const result = building.result[0];
        return {
            id: result.id,
            name: result.name.replace(" Log", ""),
            reales: result.price,
            labour: building?.batch?.labour ?? 0,
        };
    })
        .sort((a, b) => a.id - b.id);
    const superWoods = new Set([
        807,
        863,
        1440,
        1894,
        1895,
        1896,
        1898,
        1900,
        1901,
    ]);
    const superPrices = [...superWoods]
        .map((superWoodId) => {
        const superWood = apiItems.find((item) => item.Id === superWoodId);
        return {
            id: superWoodId,
            name: superWood?.Name ?? "",
            reales: superWood?.BasePrice ?? 0,
        };
    })
        .sort((a, b) => a.id - b.id);
    prices.standard = [...standardPrices, ...superPrices];
    prices.seasoned = getItemsCraftedBySeasoningShed()
        .map((seasonedItem) => {
        const name = seasonedItem.name.replace(" Log", "");
        const apiSeasonedItem = getAPISeasonedItem(name);
        return {
            id: apiSeasonedItem.Id,
            name,
            reales: getStandardPrices(name) ?? 0,
            labour: apiSeasonedItem.LaborPrice,
            doubloon: apiSeasonedItem.FullRequirements.find((requirement) => requirement.Template === idDoubloons)
                ?.Amount ?? 0,
            tool: apiSeasonedItem.FullRequirements.find((requirement) => requirement.Template === idTools)
                ?.Amount ?? 0,
        };
    })
        .sort((a, b) => a.id - b.id);
    return prices;
};
const convertBuildings = async () => {
    let buildings = getBuildings();
    const prices = getPrices(buildings);
    await saveJsonAsync(commonPaths.filePrices, prices);
    buildings = buildings.filter((building) => Object.keys(building).length).sort(sortBy(["id"]));
    await saveJsonAsync(commonPaths.fileBuilding, buildings);
};
export const convertBuildingData = async () => {
    apiItems = readJson(path.resolve(baseAPIFilename, `${serverIds[0]}-ItemTemplates-${serverDate}.json`));
    await convertBuildings();
};
//# sourceMappingURL=convert-buildings.js.map