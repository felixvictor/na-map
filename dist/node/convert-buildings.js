import * as path from "path";
import { cleanName, readJson, saveJsonAsync, serverNames, sortBy } from "../common";
import { baseAPIFilename, commonPaths, serverStartDate as serverDate } from "./common-node";
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
let apiItems;
const getItemsCrafted = (buildingId) => apiItems
    .filter(item => item.BuildingRequirements?.[0]?.BuildingTemplate === buildingId)
    .map(recipe => ({
    name: cleanName(recipe.Name).replace(" Blueprint", ""),
    price: 0
}))
    .sort((a, b) => a.name.localeCompare(b.name));
const getItemsCraftedByWorkshop = () => getItemsCrafted(idWorkshop);
const getItemsCraftedByAcademy = () => getItemsCrafted(idAcademy);
const getItemsCraftedBySeasoningShed = () => getItemsCrafted(idSeasoningShed);
const getBuildings = () => {
    const buildings = new Map();
    const buildingResources = new Map(apiItems.map(apiResource => [
        +apiResource.Id,
        { name: cleanName(apiResource.Name), price: apiResource.BasePrice }
    ]));
    const apiRecipeResources = apiItems.filter(item => item.ItemType === "RecipeResource");
    const resourceRecipes = new Map(apiRecipeResources.map(recipe => [
        recipe.Results[0].Template,
        {
            price: recipe.GoldRequirements,
            amount: recipe.Results[0].Amount,
            labour: recipe.LaborPrice
        }
    ]));
    const apiBuilding = apiItems.filter(item => item.ItemType === "Building" && !obsoleteBuildings.includes(item.Name));
    apiBuilding.forEach(apiBuilding => {
        const building = {
            id: Number(apiBuilding.Id),
            name: cleanName(apiBuilding.Name),
            result: [
                buildingResources.get(apiBuilding.ProduceResource ? apiBuilding.ProduceResource : apiBuilding.RequiredPortResource)
            ],
            batch: resourceRecipes.get(apiBuilding.RequiredPortResource),
            levels: apiBuilding.Levels.map((level) => ({
                labourDiscount: level.LaborDiscount,
                production: level.ProductionLevel * apiBuilding.BaseProduction,
                maxStorage: level.MaxStorage,
                price: level.UpgradePriceGold,
                materials: level.UpgradePriceMaterials.map((material) => ({
                    item: buildingResources.get(material.Template)?.name ?? "",
                    amount: material.Amount
                }))
            }))
        };
        if (!buildings.has(building.name)) {
            switch (building.name) {
                case "Shipyard":
                    building.result = [{ name: "Ships", price: 0 }];
                    building.byproduct = [];
                    building.batch = [];
                    break;
                case "Academy":
                    building.result = getItemsCraftedByAcademy();
                    building.byproduct = [];
                    building.batch = [];
                    break;
                case "Forge":
                    building.result = [{ name: "Cannons", price: 0 }];
                    building.byproduct = [];
                    building.batch = [];
                    break;
                case "Workshop":
                    building.result = getItemsCraftedByWorkshop();
                    building.byproduct = [];
                    building.batch = [];
                    break;
                case "Seasoning Shed":
                    building.result = getItemsCraftedBySeasoningShed();
                    building.byproduct = [];
                    building.batch = [];
                    break;
            }
            buildings.set(building.name, building);
        }
    });
    return [...buildings.values()];
};
const getAPISeasonedItem = (name) => apiItems.find(item => item.ItemType === "Recipe" && item.Name.replace(" Log", "") === name.replace("White Oak", "White oak"));
const getPrices = (buildings) => {
    const prices = { standard: [], seasoned: [] };
    const getStandardPrices = (name) => prices.standard.find(standardItem => standardItem.name === name.replace(" (S)", ""))?.real;
    prices.standard = buildings
        .filter((building) => building.result[0].price)
        .map((building) => ({
        name: building.result[0].name.replace(" Log", ""),
        real: building.result[0].price,
        labour: "labour" in building.batch ? building.batch.labour : 0
    }))
        .sort((a, b) => a.name.localeCompare(b.name));
    prices.seasoned = getItemsCraftedBySeasoningShed()
        .map((seasonedItem) => {
        const name = seasonedItem.name.replace(" Log", "");
        const apiSeasonedItem = getAPISeasonedItem(name);
        return {
            name,
            real: getStandardPrices(name) ?? 0,
            labour: apiSeasonedItem.LaborPrice,
            doubloon: apiSeasonedItem.FullRequirements.find(requirement => requirement.Template === idDoubloons)
                ?.Amount ?? 0,
            tool: apiSeasonedItem.FullRequirements.find(requirement => requirement.Template === idTools)
                ?.Amount ?? 0
        };
    })
        .sort((a, b) => a.name.localeCompare(b.name));
    return prices;
};
const convertBuildings = async () => {
    let buildings = getBuildings();
    const prices = getPrices(buildings);
    await saveJsonAsync(commonPaths.filePrices, prices);
    buildings = buildings.filter(building => Object.keys(building).length).sort(sortBy(["id"]));
    await saveJsonAsync(commonPaths.fileBuilding, buildings);
};
export const convertBuildingData = async () => {
    apiItems = readJson(path.resolve(baseAPIFilename, `${serverNames[0]}-ItemTemplates-${serverDate}.json`));
    await convertBuildings();
};
