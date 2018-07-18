/*
    convert-recipes.mjs
 */

import { readJson, saveJson } from "./common.mjs";

const inBaseFilename = process.argv[2],
    outFilename = process.argv[3],
    date = process.argv[4];

const APIItems = readJson(`${inBaseFilename}-ItemTemplates-${date}.json`);

// https://stackoverflow.com/questions/1144783/how-to-replace-all-occurrences-of-a-string-in-javascript
// eslint-disable-next-line no-extend-native,func-names
String.prototype.replaceAll = function(search, replacement) {
    const target = this;
    return target.replace(new RegExp(search, "g"), replacement);
};

function convertRecipes() {
    const data = {},
        recipes = new Map([
            [1446, "Almeria Gunpowder Blueprint"],
            [1447, "Almeria Superior Gunpowder Blueprint"],
            [1442, "Art of Ship Handling Blueprint"],
            [1443, "Book of Five Rings Blueprint"],
            [1448, "Bovenwinds Refit Blueprint"],
            [1449, "Bridgetown Frame Refit Blueprint"],
            [1450, "British Gunners Blueprint"],
            [1451, "British Gunnery Sergeant Blueprint"],
            [1452, "British Rig Refit Blueprint"],
            [1453, "Cartagena Caulking Refit Blueprint"],
            [373, "Copper Plating Blueprint"],
            [1454, "Crooked Hull Refit Blueprint"],
            [1456, "Elite British Rig Refit Blueprint"],
            [1457, "Elite French Rig Refit Blueprint"],
            [1458, "Elite Pirate Rig Refit Blueprint"],
            [1459, "Elite Spanish Rig Refit Blueprint"],
            [1577, "French Gunners Blueprint"],
            [1578, "French Gunnery Sergeant Blueprint"],
            [1463, "French Rig Refit Blueprint"],
            [1464, "Guacata Gunpowder Blueprint"],
            [1465, "Guacata Superior Gunpowder Blueprint"],
            [1444, "Gunnery Encyclopedia Blueprint"],
            [1714, "Longleaf Pine Yards Blueprint"],
            [1467, "Nassau Boarders Blueprint"],
            [1468, "Nassau Fencing Masters Blueprint"],
            [1469, "Northern Carpenters Blueprint"],
            [1470, "Northern Master Carpenters Blueprint"],
            [1471, "Pino Ocote Masts Blueprint"],
            [1472, "Pirate Rig Refit Blueprint"],
            [1473, "Spanish Rig Refit Blueprint"]
        ]),
        itemNames = new Map(),
        moduleNames = new Map();
    data.recipe = [];

    function getItemNames() {
        APIItems.forEach(item => {
            itemNames.set(item.Id, item.Name.replaceAll("'", "’"));
        });
    }

    function getModuleNames() {
        APIItems.filter(item => item.ItemType === "ShipUpgradeBookItem").forEach(item => {
            moduleNames.set(item.Id, itemNames.get(item.Upgrade));
        });
    }

    getItemNames();
    getModuleNames();

    APIItems.filter(APIrecipe => recipes.has(APIrecipe.Id)).forEach(APIrecipe => {
        const recipe = {
            id: APIrecipe.Id,
            name: APIrecipe.Name,
            module: typeof APIrecipe.Results[0] !== "undefined" ? moduleNames.get(APIrecipe.Results[0].Template) : "",
            laborPrice: APIrecipe.LaborPrice,
            goldPrice: APIrecipe.GoldRequirements,
            itemRequirements: APIrecipe.FullRequirements.map(requirement => ({
                name: itemNames.get(requirement.Template),
                chance: requirement.Chance,
                amount: requirement.Amount
            }))
        };
        data.recipe.push(recipe);
    });

    data.recipe.sort((a, b) => {
        if (a.name < b.name) {
            return -1;
        }
        if (a.name > b.name) {
            return 1;
        }
        return 0;
    });
    saveJson(outFilename, data);
}

convertRecipes();
