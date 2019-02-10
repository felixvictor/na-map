/*
    convert-recipes.mjs
 */

import { readJson, saveJson, simpleSort, sortBy } from "./common.mjs";

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
        ingredientIds = new Map(),
        ingredients = new Map(),
        itemNames = new Map(),
        moduleNames = new Map();
    data.recipe = [];
    data.ingredient = [];

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

    function getIngredients() {
        APIItems.filter(
            item => item.ItemType === "ShipUpgradeBookItem" || item.SortingGroup === "Resource.Trading"
        ).forEach(item => {
            ingredientIds.set(item.Id, item.Id);
        });
    }

    getItemNames();
    getModuleNames();
    getIngredients();

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
        APIrecipe.FullRequirements.filter(APIingredient => ingredientIds.has(APIingredient.Template)).forEach(
            APIingredient => {
                const recipeName = recipe.module ? recipe.module : recipe.name.replace(" Blueprint", "");
                if (ingredients.has(APIingredient.Template)) {
                    const updatedIngredient = ingredients.get(APIingredient.Template);
                    updatedIngredient.recipe.push(recipeName);
                    updatedIngredient.recipe.sort(simpleSort);
                    ingredients.set(APIingredient.Template, updatedIngredient);
                } else {
                    const ingredient = {
                        id: APIingredient.Template,
                        name: itemNames.get(APIingredient.Template),
                        recipe: [recipeName]
                    };
                    ingredients.set(APIingredient.Template, ingredient);
                }
            }
        );
    });

    data.recipe.sort(sortBy(["name"]));

    const result = Array.from(ingredients.values());
    data.ingredient = result.sort(sortBy(["name"]));

    saveJson(outFilename, data);
}

convertRecipes();
