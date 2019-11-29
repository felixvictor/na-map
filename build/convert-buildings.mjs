import { cleanName, readJson, saveJson, sortBy } from "./common.mjs";

const itemsFilename = process.argv[2];
const outFilename = process.argv[3];
const date = process.argv[4];

const APIItems = readJson(`${itemsFilename}-ItemTemplates-${date}.json`);

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

function getItemsCraftedByWorkshop() {
    return APIItems.filter(
        item =>
            typeof item.BuildingRequirements !== "undefined" &&
            typeof item.BuildingRequirements[0] !== "undefined" &&
            item.BuildingRequirements[0].BuildingTemplate === 450
    )
        .map(recipe => ({
            name: cleanName(recipe.Name).replace(" Blueprint", ""),
            price: 0
        }))
        .sort(sortBy(["name"]));
}

function getItemsCraftedByAcademy() {
    return APIItems.filter(
        item =>
            typeof item.BuildingRequirements !== "undefined" &&
            typeof item.BuildingRequirements[0] !== "undefined" &&
            item.BuildingRequirements[0].BuildingTemplate === 879
    )
        .map(recipe => ({
            name: cleanName(recipe.Name).replace(" Blueprint", ""),
            price: 0
        }))
        .sort(sortBy(["name"]));
}

/**
 * Convert API building data and save sorted as JSON
 * @returns {void}
 */
function convertBuildings() {
    const buildings = new Map();

    const resources = new Map(
        APIItems.map(APIresource => [
            APIresource.Id,
            { name: cleanName(APIresource.Name), price: APIresource.BasePrice }
        ])
    );

    const resourceRecipes = new Map(
        APIItems.filter(item => item.ItemType === "RecipeResource").map(recipe => [
            recipe.Results[0].Template,
            {
                price: recipe.GoldRequirements,
                amount: recipe.Results[0].Amount,
                labour: recipe.LaborPrice
            }
        ])
    );

    APIItems.filter(item => item.ItemType === "Building").forEach(APIbuilding => {
        let dontSave = false;

        const building = {
            id: APIbuilding.Id,
            name: cleanName(APIbuilding.Name),
            resource:
                resources.get(
                    APIbuilding.ProduceResource ? APIbuilding.ProduceResource : APIbuilding.RequiredPortResource
                ) || [],
            batch: resourceRecipes.get(APIbuilding.RequiredPortResource),
            levels: APIbuilding.Levels.map(level => ({
                labourDiscount: level.LaborDiscount,
                production: level.ProductionLevel * APIbuilding.BaseProduction,
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
            }

            if (obsoleteBuildings.includes(building.name)) {
                dontSave = true;
            } else {
                // console.log(building.id, building.name);
            }

            buildings.set(building.name, dontSave ? {} : building);
        }
    });

    let result = [...buildings.values()];
    result = result.filter(building => Object.keys(building).length).sort(sortBy(["name"]));
    saveJson(outFilename, result);
}

convertBuildings();
