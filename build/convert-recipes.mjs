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

    APIItems.filter(
        APIrecipe =>
            APIrecipe.ItemType === "Recipe" &&
            //!APIrecipe.Name.endsWith(" Note") &&
            (APIrecipe.CraftGroup === "Manufacturing" || APIrecipe.CraftGroup === "AdmiraltyRecipes")
    ).forEach(APIrecipe => {
        const recipe = {
            id: APIrecipe.Id,
            name: APIrecipe.Name,
            module: moduleNames.get(APIrecipe.Results[0].Template),
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
