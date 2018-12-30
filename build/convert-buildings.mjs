import { readJson, saveJson } from "./common.mjs";

const itemsFilename = process.argv[2],
    outFilename = process.argv[3],
    date = process.argv[4];

const APIItems = readJson(`${itemsFilename}-ItemTemplates-${date}.json`);

// https://stackoverflow.com/questions/1144783/how-to-replace-all-occurrences-of-a-string-in-javascript
// eslint-disable-next-line no-extend-native,func-names
String.prototype.replaceAll = function(search, replacement) {
    const target = this;
    return target.replace(new RegExp(search, "g"), replacement);
};

function getItemsCraftedByWorkshop() {
    return APIItems.filter(
        item =>
            typeof item.BuildingRequirements !== "undefined" &&
            typeof item.BuildingRequirements[0] !== "undefined" &&
            item.BuildingRequirements[0].BuildingTemplate === 450
    )
        .map(recipe => ({
            name: recipe.Name.replace(" Blueprint", ""),
            price: 0
        }))
        .sort((a, b) => {
            if (a.name < b.name) {
                return -1;
            }
            if (a.name > b.name) {
                return 1;
            }
            return 0;
        });
}

function getItemsCraftedByAcademy() {
    return APIItems.filter(
        item =>
            typeof item.BuildingRequirements !== "undefined" &&
            typeof item.BuildingRequirements[0] !== "undefined" &&
            item.BuildingRequirements[0].BuildingTemplate === 879
    )
        .map(recipe => ({
            name: recipe.Name.replace(" Blueprint", ""),
            price: 0
        }))
        .sort((a, b) => {
            if (a.name < b.name) {
                return -1;
            }
            if (a.name > b.name) {
                return 1;
            }
            return 0;
        });
}

/**
 * Convert API building data and save sorted as JSON
 * @returns {void}
 */
function convertBuildings() {
    const buildings = new Map(),
        resources = new Map(),
        resourceRecipes = new Map();

    APIItems.forEach(APIresource => {
        resources.set(APIresource.Id, { name: APIresource.Name.replaceAll("'", "’"), price: APIresource.BasePrice });
    });

    APIItems.filter(item => item.ItemType === "RecipeResource").forEach(recipe => {
        resourceRecipes.set(recipe.Results[0].Template, {
            price: recipe.GoldRequirements,
            amount: recipe.Results[0].Amount
        });
    });

    APIItems.filter(item => item.ItemType === "Building").forEach(APIbuilding => {
        let dontSave = false;

        const building = {
            id: APIbuilding.Id,
            name: APIbuilding.Name.replaceAll("'", "’"),
            resource: resources.get(
                APIbuilding.ProduceResource ? APIbuilding.ProduceResource : APIbuilding.RequiredPortResource
            ),
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
                building.levels[0].materials = [
                    {
                        item: "Doubloons",
                        amount: 0
                    }
                ];
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
            if (
                building.name === "Gold Mine" ||
                building.name === "Silver Mine" ||
                building.name === "Bermuda Cedar Forest" ||
                building.name === "Compass Wood Forest" ||
                building.name === "Copper Ore Mine" ||
                building.name === "Live Oak Forest" ||
                building.name === "Mahogany Forest" ||
                building.name === "Pine Forest" ||
                building.name === "Red Wood Forest" ||
                building.name === "Teak Forest"
            ) {
                dontSave = true;
            } else {
                // console.log(building.id, building.name);
            }
            buildings.set(building.name, dontSave ? {} : building);
        }
    });

    let result = Array.from(buildings.values());
    result = result
        .filter(building => Object.keys(building).length)
        .sort((a, b) => {
            if (a.name < b.name) {
                return -1;
            }
            if (a.name > b.name) {
                return 1;
            }
            return 0;
        });
    saveJson(outFilename, result);
}

convertBuildings();
