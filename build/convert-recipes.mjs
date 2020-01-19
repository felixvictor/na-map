/*
    convert-recipes.mjs
 */

import { cleanName, readJson, saveJsonAsync, simpleSort, sortBy } from "./common.mjs";

const inBaseFilename = process.argv[2];
const outFilename = process.argv[3];
const date = process.argv[4];

const APIItems = readJson(`${inBaseFilename}-ItemTemplates-${date}.json`);

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
        new Map(APIItems.filter(item => !item.NotUsed).map(item => [item.Id, cleanName(item.Name)]));

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
                item =>
                    !item.NotUsed &&
                    (item.ItemType === "ShipUpgradeBookItem" || item.SortingGroup === "Resource.Trading")
            ).map(item => [item.Id, item.Id])
        );

    const ingredientIds = getIngredients();

    const getUpgradeIds = () =>
        new Map(APIItems.filter(item => !item.NotUsed && item.Upgrade).map(item => [item.Id, item.Upgrade]));

    const upgradeIds = getUpgradeIds();

    APIItems.filter(
        APIrecipe => (APIrecipe.ItemType === "Recipe" || APIrecipe.ItemType === "RecipeModule") && !APIrecipe.NotUsed
    ).forEach(APIrecipe => {
        const resultReference =
            APIrecipe.ItemType === "Recipe" ? APIrecipe.Results[0] : APIrecipe.Qualities[0].Results[0];
        const recipe = {
            id: APIrecipe.Id,
            name: cleanName(APIrecipe.Name)
                .replace(" Blueprint", "")
                .replace(" - ", " – ")
                .replace("u2013", "–")
                .replace(/ $/, ""),
            module: typeof APIrecipe.Results[0] === "undefined" ? "" : moduleNames.get(APIrecipe.Results[0].Template),
            labourPrice: APIrecipe.LaborPrice,
            goldPrice: APIrecipe.GoldRequirements,
            itemRequirements: APIrecipe.FullRequirements.map(requirement => ({
                name: itemNames.get(requirement.Template),
                amount: requirement.Amount
            })),
            result: {
                id: upgradeIds.has(resultReference.Template)
                    ? upgradeIds.get(resultReference.Template)
                    : resultReference.Template,
                name: itemNames.get(resultReference.Template),
                amount: resultReference.Amount
            },
            craftGroup: groups.has(APIrecipe.CraftGroup) ? groups.get(APIrecipe.CraftGroup) : APIrecipe.CraftGroup,
            serverType: APIrecipe.ServerType
        };
        // if result exists
        if (recipe.result.name) {
            data.recipe.push(recipe);
        }

        APIrecipe.FullRequirements.filter(APIingredient => ingredientIds.has(APIingredient.Template)).forEach(
            APIingredient => {
                const recipeName = recipe.module ? recipe.module : recipe.name.replace(" Blueprint", "");
                if (ingredients.has(APIingredient.Template)) {
                    const updatedIngredient = ingredients.get(APIingredient.Template);
                    updatedIngredient.recipeNames.push(recipeName);
                    updatedIngredient.recipeNames.sort(simpleSort);
                    ingredients.set(APIingredient.Template, updatedIngredient);
                } else {
                    const ingredient = {
                        id: APIingredient.Template,
                        name: itemNames.get(APIingredient.Template),
                        recipeNames: [recipeName]
                    };
                    ingredients.set(APIingredient.Template, ingredient);
                }
            }
        );
    });

    data.recipe.sort(sortBy(["craftGroup", "name"]));

    const result = [...ingredients.values()];
    data.ingredient = result.sort(sortBy(["name"]));

    saveJsonAsync(outFilename, data);
}

convertRecipes();
