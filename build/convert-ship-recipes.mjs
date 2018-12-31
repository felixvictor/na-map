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

const APIItems = readJson(`${inBaseFilename}-ItemTemplates-${date}.json`);

// https://stackoverflow.com/questions/1144783/how-to-replace-all-occurrences-of-a-string-in-javascript
// eslint-disable-next-line no-extend-native,func-names
String.prototype.replaceAll = function(search, replacement) {
    const target = this;
    return target.replace(new RegExp(search, "g"), replacement);
};

const convertShipRecipes = () => {
    const data = {};
    const itemNames = new Map();
    data.shipRecipes = [];

    const getItemNames = () => {
        APIItems.forEach(item => {
            itemNames.set(item.Id, item.Name.replaceAll("'", "’"));
        });
    };

    getItemNames();

    let permit = { needed: false };
    let doubloons = { needed: 0 };
    APIItems.filter(item => !item.NotUsed && item.ItemType === "RecipeShip").forEach(APIrecipe => {
        const recipe = {
            id: APIrecipe.Id,
            name: APIrecipe.Name.replaceAll("'", "’"),
            woods: APIrecipe.WoodTypeDescs.map(wood => ({
                name: itemNames.get(wood.Requirements[0].Template).replace(" Log", ""),
                amount: wood.Requirements[0].Amount
            })),
            resources: APIrecipe.FullRequirements.map((requirement, i) => {
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
            // gold: APIrecipe.GoldRequirements,
            ship: {
                id: APIrecipe.Results[0].Template,
                name: itemNames.get(APIrecipe.Results[0].Template)
            },
            // qualities: APIrecipe.Qualities,
            shipyardLevel: APIrecipe.BuildingRequirements[0].Level,
            craftLevel: APIrecipe.RequiresLevel,
            craftXP: APIrecipe.GivesXP
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
        data.shipRecipes.push(recipe);
        permit = { needed: false };
        doubloons = { needed: 0 };
    });

    data.shipRecipes.sort((a, b) => {
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
