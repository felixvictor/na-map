/**
 * This file is part of na-map.
 *
 * @file      Convert ship blueprints.
 * @module    build/convert-ship-blueprints
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import d3Node from "d3-node";
const d3n = d3Node();
const { d3 } = d3n;

import { readJson, saveJson, sortBy } from "./common.mjs";

const inBaseFilename = process.argv[2];
const outFilename = process.argv[3];
const date = process.argv[4];

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
 * Convert ship blueprints
 * @return {void}
 */
const convertShipBlueprints = () => {
    /**
     * Get ship blueprints
     * @return {object} Ship blueprints
     */
    const getShipBlueprints = () =>
        apiItems
            .filter(apiItem => !apiItem.NotUsed && apiItem.ItemType === "RecipeShip")
            .map(apiBlueprint => {
                const shipMass = getShipMass(apiBlueprint.Results[0].Template);

                return {
                    id: apiBlueprint.Id,
                    name: apiBlueprint.Name.replaceAll(" Blueprint", "").replaceAll("'", "’"),
                    frames: apiBlueprint.WoodTypeDescs.map(wood => ({
                        name: itemNames.get(wood.Requirements[0].Template),
                        amount: wood.Requirements[0].Amount
                    })).sort(sortBy(["name"])),
                    trims: [
                        {
                            name: "Planking",
                            amount: Math.round(shipMass * plankingRatio)
                        },
                        {
                            name: "Crew Space",
                            amount: Math.round(shipMass * crewSpaceRatio)
                        }
                    ],
                    resources: apiBlueprint.FullRequirements.filter(
                        requirement =>
                            !(
                                itemNames.get(requirement.Template).endsWith(" Permit") ||
                                itemNames.get(requirement.Template) === "Doubloons" ||
                                itemNames.get(requirement.Template) === "Provisions"
                            )
                    ).map(requirement => ({
                        name: itemNames.get(requirement.Template),
                        amount: requirement.Amount
                    })),
                    provisions: apiBlueprint.FullRequirements.find(
                        requirement => itemNames.get(requirement.Template) === "Provisions"
                    ).Amount,
                    doubloons:
                        (
                            apiBlueprint.FullRequirements.find(
                                requirement => itemNames.get(requirement.Template) === "Doubloons"
                            ) || {}
                        ).Amount || 0,
                    permit:
                        (
                            apiBlueprint.FullRequirements.find(requirement =>
                                itemNames.get(requirement.Template).endsWith(" Permit")
                            ) || {}
                        ).Amount || 0,
                    ship: {
                        id: apiBlueprint.Results[0].Template,
                        name: itemNames.get(apiBlueprint.Results[0].Template)
                    },
                    shipyardLevel: apiBlueprint.BuildingRequirements[0].Level + 1,
                    craftLevel: apiBlueprint.RequiresLevel,
                    craftXP: apiBlueprint.GivesXP,
                    labourHours: apiBlueprint.LaborPrice
                };
            })
            // Sort by name
            .sort(sortBy(["name"]));

    const data = getShipBlueprints();

    /*
     * Get resource ratios

    const getShipClass = id => apiItems.find(apiItem => id === apiItem.Id).Class;
    const resourceRatios = new Map(data[0].resources.map(resource => [resource.name, []]));
    resourceRatios.set("Frame", []);
    resourceRatios.set("Trim", []);
    data.filter(shipBP => shipBP.name !== "Le Gros Ventre Refit")
        // .filter(shipBP => getShipClass(shipBP.ship.id) === 1)
        .forEach(shipBP => {
            const lignum = shipBP.resources.find(resource => resource.name === "Lignum Vitae Log").amount;
            shipBP.resources.forEach(resource => {
                const value = Math.round((resource.amount / lignum) * 100) / 100;
                resourceRatios.set(resource.name, resourceRatios.get(resource.name).concat(value));
            });
            let value = Math.round((shipBP.frames[0].amount / lignum) * 100) / 100;
            resourceRatios.set("Frame", resourceRatios.get("Frame").concat(value));
            value = Math.round((shipBP.trims[0].amount / lignum) * 100) / 100;
            resourceRatios.set("Trim", resourceRatios.get("Trim").concat(value));
            // console.log(`"${shipBP.name}";${lignum}`);
        });
    resourceRatios.forEach((value, key) => {
        console.log(`"${key}";${d3.max(value)};${d3.median(value)}`);
    });
    */

    saveJson(outFilename, data);
};

convertShipBlueprints();
