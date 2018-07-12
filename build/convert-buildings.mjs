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

/**
 * Convert API building data and save sorted as JSON
 * @returns {void}
 */
function convertBuildings() {
    const buildings = new Map(),
        lootTables = new Map(),
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

    APIItems.filter(item => item.ItemType === "LootTableItem").forEach(APIlootTable => {
        const loot = APIlootTable.Items.filter(item => item.Chance)
            .map(item => ({
                item: resources.get(item.Template).name,
                chance: item.Chance
            }))
            .sort((a, b) => {
                if (a.chance > b.chance) {
                    return -1;
                }
                if (a.chance < b.chance) {
                    return 1;
                }
                if (a.name < b.name) {
                    return -1;
                }
                if (a.name > b.name) {
                    return 1;
                }
                return 0;
            });
        lootTables.set(APIlootTable.Id, loot);
    });

    APIItems.filter(item => item.ItemType === "Building").forEach(APIbuilding => {
        let dontSave = false;

        const building = {
            id: APIbuilding.Id,
            name: APIbuilding.Name.replaceAll("'", "’"),
            resource: resources.get(APIbuilding.RequiredPortResource),
            byproduct: lootTables.get(APIbuilding.LootTable),
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
                building.resource = { name: "ships", price: 0 };
                building.byproduct = [];
                building.batch = [];
            } else if (building.name === "Workshop") {
                building.resource = { name: "cannons", price: 0 };
                building.byproduct = [];
                building.batch = [];
            }
            if (
                building.name === "Compass Wood Forest" ||
                building.name === "Copper Ore Mine" ||
                building.name === "Forge" ||
                building.name === "Live Oak Forest" ||
                building.name === "Mahogany Forest" ||
                building.name === "Pine Forest" ||
                building.name === "Red Wood Forest" ||
                building.name === "Teak Forest"
            ) {
                dontSave = true;
            } else {
                // console.log(module.id, module.name);
            }
            buildings.set(building.name, dontSave ? {} : building);
        }
    });

    let result = Array.from(buildings.values());
    result = result.filter(building => Object.keys(building).length).sort((a, b) => {
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
