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

    const plankingFactor = 0.13;
    const hempFactor = 0.025;
    const data = {};
    const itemNames = getItemNames();
    data.shipRecipes = [];

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
                trims: { planking: Math.round(shipMass * plankingFactor), hemp: Math.round(shipMass * hempFactor) },
                resources: apiRecipe.FullRequirements.filter(
                    requirement =>
                        !(
                            itemNames.get(requirement.Template).endsWith(" Permit") ||
                            itemNames.get(requirement.Template) === "Doubloons"
                        )
                ).map(requirement => ({
                    name: itemNames.get(requirement.Template),
                    amount: requirement.Amount
                })),
                doubloons:
                    (
                        apiRecipe.FullRequirements.find(
                            requirement => itemNames.get(requirement.Template) === "Doubloons"
                        ) || {}
                    ).Amount || 0,
                permit:
                    (
                        apiRecipe.FullRequirements.find(requirement =>
                            itemNames.get(requirement.Template).endsWith(" Permit")
                        ) || {}
                    ).Amount || 0,
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
