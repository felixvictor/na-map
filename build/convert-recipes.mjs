/*
    convert-recipes.mjs
 */

import { groupBy, readJson, saveJson, simpleSort, sortBy } from "./common.mjs";

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

const groups = new Map([
    ["AdmiralityShips", "Admirality permits"],
    ["AdmiraltyBooks", "Admirality books"],
    ["AdmiraltyModules", "Admirality modules"],
    ["AdmiraltyRecipes", "Admirality blueprints"],
    ["AdmiraltyResourcesAndMaterials", "Admirality resources"],
    ["AdmiraltyRewards", "PVP rewards"],
    ["Cannons", "Repairs"],
    ["Exchange", "Exchange"],
    ["Manufacturing", "Manufacturing"],
    ["WoodWorking", "Cannons"]
]);

function convertRecipes() {
    const data = {};
    const ingredients = new Map();

    data.recipe = [];
    data.ingredient = [];

    /**
     * Get item names
     * @return {Map<number, string>} Item names<id, name>
     */
    const getItemNames = () =>
        new Map(APIItems.filter(item => !item.NotUsed).map(item => [item.Id, item.Name.replaceAll("'", "’")]));

    const itemNames = getItemNames();

    const getModuleNames = () =>
        new Map(
            APIItems.filter(item => item.ItemType === "ShipUpgradeBookItem").map(item => [
                item.Id,
                itemNames.get(item.Upgrade)
            ])
        );

    const moduleNames = getModuleNames();

    const getIngredients = () =>
        new Map(
            APIItems.filter(
                item => item.ItemType === "ShipUpgradeBookItem" || item.SortingGroup === "Resource.Trading"
            ).map(item => [item.Id, item.Id])
        );

    const ingredientIds = getIngredients();

    const getUpgradeIds = () =>
        new Map(APIItems.filter(item => !item.NotUsed && item.Upgrade).map(item => [item.Id, item.Upgrade]));

    const upgradeIds = getUpgradeIds();

    APIItems.filter(
        APIrecipe =>
            APIrecipe.ItemType === "Recipe" && !APIrecipe.NotUsed && itemNames.has(APIrecipe.Results[0].Template)
    ).forEach(APIrecipe => {
        const recipe = {
            id: APIrecipe.Id,
            name: APIrecipe.Name.replace(" Blueprint", "")
                .replace(" - ", " – ")
                .replace("u2013", "–")
                .replace(/ $/, ""),
            module: typeof APIrecipe.Results[0] !== "undefined" ? moduleNames.get(APIrecipe.Results[0].Template) : "",
            labourPrice: APIrecipe.LaborPrice,
            goldPrice: APIrecipe.GoldRequirements,
            itemRequirements: APIrecipe.FullRequirements.map(requirement => ({
                name: itemNames.get(requirement.Template),
                amount: requirement.Amount
            })),
            result: {
                id: upgradeIds.has(APIrecipe.Results[0].Template)
                    ? upgradeIds.get(APIrecipe.Results[0].Template)
                    : APIrecipe.Results[0].Template,
                name: itemNames.get(APIrecipe.Results[0].Template),
                amount: APIrecipe.Results[0].Amount
            },
            craftGroup: groups.has(APIrecipe.CraftGroup) ? groups.get(APIrecipe.CraftGroup) : APIrecipe.CraftGroup,
            serverType: APIrecipe.ServerType
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
                        name: upgradeIds.get(APIingredient.Template),
                        recipe: [recipeName]
                    };
                    ingredients.set(APIingredient.Template, ingredient);
                }
            }
        );
    });

    data.recipe.sort(sortBy(["craftGroup", "name"]));

    const result = Array.from(ingredients.values());
    data.ingredient = result.sort(sortBy(["name"]));

    saveJson(outFilename, data);
}

convertRecipes();
