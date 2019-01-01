/**
 * This file is part of na-map.
 *
 * @file      Convert ship recipes.
 * @module    build/convert-ship-recipes
 * @author    iB aka Felix Victor
 * @copyright 2018
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { readJson, saveJson } from "./common.mjs";

const inBaseFilename = process.argv[2],
    outFilename = process.argv[3],
    date = process.argv[4];

const apiItems = readJson(`${inBaseFilename}-ItemTemplates-${date}.json`);

// https://stackoverflow.com/questions/1144783/how-to-replace-all-occurrences-of-a-string-in-javascript
// eslint-disable-next-line no-extend-native,func-names
String.prototype.replaceAll = function(search, replacement) {
    const target = this;
    return target.replace(new RegExp(search, "g"), replacement);
};

const convertShipRecipes = () => {
    const getItemNames = () => new Map(apiItems.map(item => [item.Id, item.Name.replaceAll("'", "’")]));
    const getShipMass = id => apiItems.find(apiItem => id === apiItem.Id).ShipMass;

    const data = {};
    const itemNames = getItemNames();
    data.shipRecipes = [];

    let permit = { needed: false };
    let doubloons = { needed: 0 };
    data.shipRecipes = apiItems
        .filter(apiItem => !apiItem.NotUsed && apiItem.ItemType === "RecipeShip")
        .map(apiRecipe => {
            const shipMass = getShipMass(apiRecipe.Results[0].Template);
            const recipe = {
                id: apiRecipe.Id,
                name: apiRecipe.Name.replaceAll("'", "’"),
                frames: apiRecipe.WoodTypeDescs.map(wood => ({
                    name: itemNames.get(wood.Requirements[0].Template).replace(" Log", ""),
                    amount: wood.Requirements[0].Amount
                })),
                trims: { planking: Math.round(shipMass * 0.13), hemp: Math.round(shipMass * 0.025) },
                resources: apiRecipe.FullRequirements.map((requirement, i) => {
                    if (itemNames.get(requirement.Template).endsWith(" Permit")) {
                        permit = { needed: true, index: i };
                    }
                    if (itemNames.get(requirement.Template) === "Doubloons") {
                        doubloons = { needed: requirement.Amount, index: i };
                    }
                    return {
                        name: itemNames.get(requirement.Template),
                        amount: requirement.Amount
                    };
                }),
                // gold: apiRecipe.GoldRequirements,
                ship: {
                    id: apiRecipe.Results[0].Template,
                    name: itemNames.get(apiRecipe.Results[0].Template)
                },
                // qualities: apiRecipe.Qualities,
                shipyardLevel: apiRecipe.BuildingRequirements[0].Level + 1,
                craftLevel: apiRecipe.RequiresLevel,
                craftXP: apiRecipe.GivesXP,
                labourHours: apiRecipe.LaborPrice
            };
            if (permit.needed) {
                recipe.permit = true;
                // Remove permit from resources
                recipe.resources.splice(permit.index, 1);
            } else {
                recipe.permit = false;
            }
            if (doubloons.needed) {
                recipe.doubloons = doubloons.needed;
                // Remove permit from resources
                recipe.resources.splice(doubloons.index - (permit.needed === true ? 1 : 0), 1);
            } else {
                recipe.doubloons = doubloons.needed;
            }
            permit = { needed: false };
            doubloons = { needed: 0 };

            return recipe;
        })
        .sort((a, b) => {
            if (a.name < b.name) {
                return -1;
            }
            if (a.name > b.name) {
                return 1;
            }
            return 0;
        });

    saveJson(outFilename, data);
};

convertShipRecipes();
