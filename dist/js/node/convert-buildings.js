/*!
 * This file is part of na-map.
 *
 * @file      Building data.
 * @module    src/node/convert-buildings
 * @author    iB aka Felix Victor
 * @copyright 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import * as path from "path";
import { baseAPIFilename, commonPaths, serverStartDate as serverDate } from "../common/common-dir";
import { readJson, saveJsonAsync } from "../common/common-file";
import { cleanName, sortBy } from "../common/common-node";
import { serverNames } from "../common/common-var";
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
let apiItems;
const getItemsCrafted = (buildingId) => apiItems
    .filter((item) => { var _a, _b; return ((_b = (_a = item.BuildingRequirements) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.BuildingTemplate) === buildingId; })
    .map((recipe) => ({
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
        { name: cleanName(apiResource.Name), price: apiResource.BasePrice },
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
                materials: level.UpgradePriceMaterials.map((material) => {
                    var _a, _b;
                    return ({
                        item: (_b = (_a = buildingResources.get(material.Template)) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : "",
                        amount: material.Amount,
                    });
                }),
            })),
        };
        if (!buildings.has(building.name)) {
            switch (building.name) {
                case "Shipyard":
                    building.result = [{ name: "Ships", price: 0 }];
                    building.byproduct = [];
                    break;
                case "Academy":
                    building.result = getItemsCraftedByAcademy();
                    building.byproduct = [];
                    break;
                case "Forge":
                    building.result = [{ name: "Cannons", price: 0 }];
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
    const getStandardPrices = (name) => { var _a; return (_a = prices.standard.find((standardItem) => standardItem.name === name.replace(" (S)", ""))) === null || _a === void 0 ? void 0 : _a.real; };
    prices.standard = buildings.filter((building) => building.result && building.result[0] && building.result[0].price)
        .map((building) => {
        var _a, _b;
        const result = building.result[0];
        return {
            name: result.name.replace(" Log", ""),
            real: result.price,
            labour: (_b = (_a = building === null || building === void 0 ? void 0 : building.batch) === null || _a === void 0 ? void 0 : _a.labour) !== null && _b !== void 0 ? _b : 0,
        };
    })
        .sort((a, b) => a.name.localeCompare(b.name));
    prices.seasoned = getItemsCraftedBySeasoningShed()
        .map((seasonedItem) => {
        var _a, _b, _c, _d, _e;
        const name = seasonedItem.name.replace(" Log", "");
        const apiSeasonedItem = getAPISeasonedItem(name);
        return {
            name,
            real: (_a = getStandardPrices(name)) !== null && _a !== void 0 ? _a : 0,
            labour: apiSeasonedItem.LaborPrice,
            doubloon: (_c = (_b = apiSeasonedItem.FullRequirements.find((requirement) => requirement.Template === idDoubloons)) === null || _b === void 0 ? void 0 : _b.Amount) !== null && _c !== void 0 ? _c : 0,
            tool: (_e = (_d = apiSeasonedItem.FullRequirements.find((requirement) => requirement.Template === idTools)) === null || _d === void 0 ? void 0 : _d.Amount) !== null && _e !== void 0 ? _e : 0,
        };
    })
        .sort((a, b) => a.name.localeCompare(b.name));
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
    apiItems = readJson(path.resolve(baseAPIFilename, `${serverNames[0]}-ItemTemplates-${serverDate}.json`));
    await convertBuildings();
};
//# sourceMappingURL=convert-buildings.js.map