/**
 * This file is part of na-map.
 *
 * @file      Convert ship recipes.
 * @module    build/convert-ship-recipes
 * @author    iB aka Felix Victor
 * @copyright 2018
 * @license   http://www.gnu.org/licenses/gpl.html
 */

// eslint-disable-next-line
import { readJson, round, saveJson } from "./common.mjs";

const inBaseFilename = process.argv[2],
    outFilename = process.argv[3],
    date = process.argv[4];

/**
 * Logs needed for planking as a ratio of ship mass
 * @type {number} Ratio
 */
const plankingRatio = 0.13;
/**
 * Hemp needed for crew space trim as a ratio of ship mass
 * @type {number} Ratio
 */
const crewSpaceRatio = 0.025;

const apiItems = readJson(`${inBaseFilename}-ItemTemplates-${date}.json`);

// https://stackoverflow.com/questions/1144783/how-to-replace-all-occurrences-of-a-string-in-javascript
// eslint-disable-next-line no-extend-native,func-names
String.prototype.replaceAll = function(search, replacement) {
    const target = this;
    return target.replace(new RegExp(search, "g"), replacement);
};

/**
 * Get item names
 * @return {Map<number, string>} Item names<id, name>
 */
const getItemNames = () => new Map(apiItems.map(item => [item.Id, item.Name.replaceAll("'", "’")]));

const itemNames = getItemNames();

/**
 * Get ship mass
 * @param {number} id - Ship id
 * @return {number} Ship mass
 */
const getShipMass = id => apiItems.find(apiItem => id === apiItem.Id).ShipMass;
/**
 * Get ship rate
 * @param {number} id - Ship id
 * @return {number} Ship rate
 */
const getShipRate = id => apiItems.find(apiItem => id === apiItem.Id).Class;
/**
 * Get maximum crew
 * @param {number} id - Ship id
 * @return {number} Crew
 */
const getMaxCrew = id => apiItems.find(apiItem => id === apiItem.Id).HealthInfo.Crew;

/**
 * Convert ship recipes
 * @return {void}
 */
const convertShipRecipes = () => {
    /**
     * Get ratios (ship mass and crew) for the ship recipes requirements.
     * As the ratios are the same for all ships, get the ratio from the first ship recipe in list
     * @return {object} Ship recipe ratios
     */
    const getRatios = () => {
        // Get first ship recipe
        const recipe = apiItems.find(apiItem => !apiItem.NotUsed && apiItem.ItemType === "RecipeShip");
        const shipMass = getShipMass(recipe.Results[0].Template);
        const maxCrew = getMaxCrew(recipe.Results[0].Template);

        return {
            frames: recipe.WoodTypeDescs.map(wood => ({
                name: itemNames.get(wood.Requirements[0].Template).replace(" Log", ""),
                massRatio: round(wood.Requirements[0].Amount / shipMass, 2)
            })),
            trims: [
                {
                    name: "planking",
                    massRatio: plankingRatio
                },
                {
                    name: "crew space",
                    massRatio: crewSpaceRatio
                }
            ],
            resources: recipe.FullRequirements.filter(
                requirement =>
                    !(
                        itemNames.get(requirement.Template).endsWith(" Permit") ||
                        itemNames.get(requirement.Template) === "Doubloons" ||
                        itemNames.get(requirement.Template) === "Provisions"
                    )
            ).map(requirement => ({
                name: itemNames.get(requirement.Template),
                massRatio: round(requirement.Amount / shipMass, 2)
            })),
            provisions: {
                name: "Provisions",
                crewRatio:
                    recipe.FullRequirements.find(requirement => itemNames.get(requirement.Template) === "Provisions")
                        .Amount / maxCrew
            }
        };
    };

    /**
     * Get ship recipes
     * @return {object} Ship recipes
     */
    const getShipRecipes = () =>
        apiItems
            .filter(apiItem => !apiItem.NotUsed && apiItem.ItemType === "RecipeShip")
            .map(apiRecipe => ({
                id: apiRecipe.Id,
                name: apiRecipe.Name.replaceAll("'", "’"),
                ship: {
                    id: apiRecipe.Results[0].Template,
                    name: itemNames.get(apiRecipe.Results[0].Template),
                    rate: getShipRate(apiRecipe.Results[0].Template),
                    shipMass: getShipMass(apiRecipe.Results[0].Template),
                    maxCrew: getMaxCrew(apiRecipe.Results[0].Template)
                },
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
                shipyardLevel: apiRecipe.BuildingRequirements[0].Level + 1,
                craftLevel: apiRecipe.RequiresLevel,
                craftXP: apiRecipe.GivesXP,
                labourHours: apiRecipe.LaborPrice
            }))
            // Sort by name
            .sort((a, b) => {
                if (a.name < b.name) {
                    return -1;
                }
                if (a.name > b.name) {
                    return 1;
                }
                return 0;
            });

    const data = {};

    data.ratios = getRatios();
    data.shipRecipes = getShipRecipes();

    saveJson(outFilename, data);
};

convertShipRecipes();
