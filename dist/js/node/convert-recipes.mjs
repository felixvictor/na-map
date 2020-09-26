/*!
 * This file is part of na-map.
 *
 * @file      Convert recipes.
 * @module    build/convert-recipes
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import path from "path";
import d3Array from "d3-array";
const { group: d3Group } = d3Array;
import { baseAPIFilename, commonPaths, serverStartDate as serverDate } from "../common/common-dir";
import { readJson, saveJsonAsync } from "../common/common-file";
import { cleanName, simpleStringSort, sortBy } from "../common/common-node";
import { serverNames } from "../common/servers";
let apiItems;
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
    ["WoodWorking", "Cannons"],
]);
const recipeItemTypes = new Set(["Recipe", "RecipeModule", "RecipeResource"]);
const recipeUsingResults = new Set(["Recipe", "RecipeResource"]);
const itemIsUsed = new Set([
    1525,
    1939,
    2336,
]);
const convertRecipes = async () => {
    const data = {};
    const recipes = [];
    const ingredients = new Map();
    data.recipe = [];
    data.ingredient = [];
    const itemNames = new Map(apiItems.filter((item) => !item.NotUsed).map((item) => [item.Id, cleanName(item.Name)]));
    const moduleNames = new Map(apiItems.filter((item) => item.ItemType === "ShipUpgradeBookItem").map((item) => [item.Id, itemNames.get(item.Upgrade) ?? ""]));
    const ingredientIds = new Map(apiItems
        .filter((item) => !item.NotUsed &&
        (item.ItemType === "ShipUpgradeBookItem" || item.SortingGroup === "Resource.Trading"))
        .map((item) => [item.Id, item.Id]));
    const upgradeIds = new Map(apiItems.filter((item) => !item.NotUsed && item.Upgrade).map((item) => [item.Id, item.Upgrade ?? 0]));
    apiItems.filter((apiRecipe) => recipeItemTypes.has(apiRecipe.ItemType) && (!apiRecipe.NotUsed || itemIsUsed.has(apiRecipe.Id))).forEach((apiRecipe) => {
        const resultReference = recipeUsingResults.has(apiRecipe.ItemType)
            ? apiRecipe.Results[0]
            : apiRecipe.Qualities[0].Results[0];
        const recipe = {
            id: apiRecipe.Id,
            name: cleanName(apiRecipe.Name)
                .replace(" Blueprint", "")
                .replace(" - ", " – ")
                .replace("u2013", "–")
                .replace(/ $/, ""),
            module: typeof apiRecipe.Results[0] === "undefined" ? "" : moduleNames.get(apiRecipe.Results[0].Template),
            labourPrice: apiRecipe.LaborPrice,
            goldPrice: apiRecipe.GoldRequirements,
            itemRequirements: apiRecipe.FullRequirements.map((requirement) => ({
                name: itemNames.get(requirement.Template),
                amount: requirement.Amount,
            })),
            result: {
                id: upgradeIds.has(resultReference.Template)
                    ? upgradeIds.get(resultReference.Template)
                    : resultReference.Template,
                name: itemNames.get(resultReference.Template),
                amount: resultReference.Amount,
            },
            craftGroup: groups.has(apiRecipe.CraftGroup) ? groups.get(apiRecipe.CraftGroup) : apiRecipe.CraftGroup,
            serverType: apiRecipe.ServerType,
        };
        if (recipe.result.name) {
            recipes.push(recipe);
        }
        apiRecipe.FullRequirements.filter((APIingredient) => ingredientIds.has(APIingredient.Template)).forEach((apiIngredient) => {
            const recipeName = recipe.module ? recipe.module : recipe.name.replace(" Blueprint", "");
            if (ingredients.has(apiIngredient.Template)) {
                const updatedIngredient = ingredients.get(apiIngredient.Template);
                updatedIngredient.recipeNames.push(recipeName);
                updatedIngredient.recipeNames.sort(simpleStringSort);
                ingredients.set(apiIngredient.Template, updatedIngredient);
            }
            else {
                const ingredient = {
                    id: apiIngredient.Template,
                    name: itemNames.get(apiIngredient.Template),
                    recipeNames: [recipeName],
                };
                ingredients.set(apiIngredient.Template, ingredient);
            }
        });
    });
    data.recipe = [...d3Group(recipes, (recipe) => recipe.craftGroup)]
        .sort(sortBy(["id"]))
        .map(([group, recipes]) => {
        return {
            group,
            recipes: recipes.map((recipe) => {
                const { craftGroup, ...recipeCleaned } = recipe;
                return recipeCleaned;
            }),
        };
    });
    const result = [...ingredients.values()];
    data.ingredient = result.sort(sortBy(["id"]));
    await saveJsonAsync(commonPaths.fileRecipe, data);
};
export const convertRecipeData = () => {
    apiItems = readJson(path.resolve(baseAPIFilename, `${serverNames[0]}-ItemTemplates-${serverDate}.json`));
    void convertRecipes();
};
//# sourceMappingURL=convert-recipes.js.map