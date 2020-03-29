/*!
 * This file is part of na-map.
 *
 * @file      Convert recipes.
 * @module    build/convert-recipes
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import * as path from "path"
import { baseAPIFilename, commonPaths, serverStartDate as serverDate } from "../common/common-dir"
import { readJson, saveJsonAsync } from "../common/common-file"
import { cleanName, simpleStringSort, sortBy } from "../common/common-node"
import { serverNames } from "../common/common-var"

import { APIItemGeneric, APIRecipeModuleResource, APIRecipeResource, APIShipUpgradeBookItem } from "./api-item"
import { Recipe, RecipeEntity } from "../common/gen-json"

interface Ingredient {
    id: number
    name: string
    recipeNames: string[]
}

let apiItems: APIItemGeneric[]

// noinspection SpellCheckingInspection
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
])

const convertRecipes = async (): Promise<void> => {
    const data = {} as Recipe
    const ingredients = new Map<number, Ingredient>()

    data.recipe = []
    data.ingredient = []

    /**
     * Get item names
     */
    const getItemNames = (): Map<number, string> =>
        new Map(apiItems.filter((item) => !item.NotUsed).map((item) => [item.Id, cleanName(item.Name)]))

    const itemNames = getItemNames()

    const getModuleNames = (): Map<number, string> =>
        new Map(
            ((apiItems.filter(
                (item) => item.ItemType === "ShipUpgradeBookItem"
            ) as unknown) as APIShipUpgradeBookItem[]).map((item) => [item.Id, itemNames.get(item.Upgrade) ?? ""])
        )

    const moduleNames = getModuleNames()

    const getIngredientIds = (): Map<number, number> =>
        new Map(
            apiItems
                .filter(
                    (item) =>
                        !item.NotUsed &&
                        (item.ItemType === "ShipUpgradeBookItem" || item.SortingGroup === "Resource.Trading")
                )
                .map((item) => [item.Id, item.Id])
        )

    const ingredientIds = getIngredientIds()

    const getUpgradeIds = (): Map<number, number> =>
        new Map(apiItems.filter((item) => !item.NotUsed && item.Upgrade).map((item) => [item.Id, item.Upgrade ?? 0]))

    const upgradeIds = getUpgradeIds()
    ;(apiItems.filter(
        (apiRecipe) => (apiRecipe.ItemType === "Recipe" || apiRecipe.ItemType === "RecipeModule") && !apiRecipe.NotUsed
    ) as APIRecipeResource[] | APIRecipeModuleResource[]).forEach(
        (apiRecipe: APIRecipeResource | APIRecipeModuleResource) => {
            const resultReference =
                apiRecipe.ItemType === "Recipe"
                    ? apiRecipe.Results[0]
                    : (apiRecipe as APIRecipeModuleResource).Qualities[0].Results[0]
            const recipe = {
                id: apiRecipe.Id,
                name: cleanName(apiRecipe.Name)
                    .replace(" Blueprint", "")
                    .replace(" - ", " – ")
                    .replace("u2013", "–")
                    .replace(/ $/, ""),
                module:
                    typeof apiRecipe.Results[0] === "undefined" ? "" : moduleNames.get(apiRecipe.Results[0].Template),
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
            } as RecipeEntity
            // if result exists
            if (recipe.result.name) {
                data.recipe.push(recipe)
            }

            apiRecipe.FullRequirements.filter((APIingredient) => ingredientIds.has(APIingredient.Template)).forEach(
                (apiIngredient) => {
                    const recipeName = recipe.module ? recipe.module : recipe.name.replace(" Blueprint", "")
                    if (ingredients.has(apiIngredient.Template)) {
                        const updatedIngredient = ingredients.get(apiIngredient.Template)!
                        updatedIngredient.recipeNames.push(recipeName)
                        updatedIngredient.recipeNames.sort(simpleStringSort)
                        ingredients.set(apiIngredient.Template, updatedIngredient)
                    } else {
                        const ingredient = {
                            id: apiIngredient.Template,
                            name: itemNames.get(apiIngredient.Template),
                            recipeNames: [recipeName],
                        } as Ingredient
                        ingredients.set(apiIngredient.Template, ingredient)
                    }
                }
            )
        }
    )

    data.recipe.sort(sortBy(["craftGroup", "id"]))

    const result = [...ingredients.values()]
    data.ingredient = result.sort(sortBy(["id"]))

    await saveJsonAsync(commonPaths.fileRecipe, data)
}

export const convertRecipeData = (): void => {
    apiItems = readJson(path.resolve(baseAPIFilename, `${serverNames[0]}-ItemTemplates-${serverDate}.json`))

    // noinspection JSIgnoredPromiseFromCall
    convertRecipes()
}
