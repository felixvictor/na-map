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

import { cleanName, readJson, round, saveJson, sortBy } from "./common.mjs";

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

/**
 * Get item names
 * @return {Map<number, string>} Item names<id, name>
 */
const getItemNames = () => new Map(apiItems.map(item => [item.Id, cleanName(item.Name)]));

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
                    name: cleanName(apiBlueprint.Name).replace(" Blueprint", ""),
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
                    provisions:
                        (
                            apiBlueprint.FullRequirements.find(
                                requirement => itemNames.get(requirement.Template) === "Provisions"
                            ) || {}
                        ).Amount || 0,
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
                        name: itemNames.get(apiBlueprint.Results[0].Template),
                        mass: shipMass
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
     */
    /*
    const getShipClass = id => apiItems.find(apiItem => id === apiItem.Id).Class;
    const resourceRatios = new Map(data[0].resources.map(resource => [resource.name, []]));
    resourceRatios.set("Frame", []);
    resourceRatios.set("Trim", []);
    const excludedShips = ["GunBoat", "Le Gros Ventre Refit"];
    data.filter(shipBP => !excludedShips.includes(shipBP.name))
        // .filter(shipBP => getShipClass(shipBP.ship.id) === 5)
        .forEach(shipBP => {
            const ratio = shipBP.ship.mass;
            shipBP.resources.forEach(resource => {
                const value = round(resource.amount / ratio, 4);
                resourceRatios.set(resource.name, resourceRatios.get(resource.name).concat(value));
            });
            let value = round(shipBP.frames[0].amount / ratio, 4);
            resourceRatios.set("Frame", resourceRatios.get("Frame").concat(value));
            value = round(shipBP.trims[0].amount / ratio, 4);
            resourceRatios.set("Trim", resourceRatios.get("Trim").concat(value));
            // console.log(`"${shipBP.name}";${ratio}`);
            console.log(
                `"${shipBP.name}";${shipBP.resources.map(resource => round(resource.amount / ratio, 4)).join(";")}`
            );
        });
    resourceRatios.forEach((value, key) => {
        console.log(`"${key}";${d3.max(value, d => d)};${d3.median(value)}`);
    });
    */

    saveJson(outFilename, data);
};

convertShipBlueprints();
