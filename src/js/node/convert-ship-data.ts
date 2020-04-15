/*!
 * This file is part of na-map.
 *
 * @file      Convert ship data.
 * @module    convert-ship-data
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import * as fs from "fs"
import * as path from "path"

import mergeAdvanced from "object-merge-advanced"
import convert, { ElementCompact } from "xml-js"

import { isEmpty } from "../common/common"
import { baseAPIFilename, commonPaths, serverStartDate as serverDate } from "../common/common-dir"
import { fileExists, readJson, readTextFile, saveJsonAsync } from "../common/common-file"
import { roundToThousands, speedConstA, speedConstB } from "../common/common-math"
import { cleanName, sortBy } from "../common/common-node"
import { serverNames } from "../common/common-var"

import { APIItemGeneric, APIShip, APIShipBlueprint } from "./api-item"
import { ShipData } from "../common/gen-json"
import { TextEntity, XmlGeneric } from "./xml"

type ElementMap = Map<string, { [key: string]: string; group: string; element: string }>
interface SubFileStructure {
    ext: string // file name extension (base file name is a ship name)
    elements: ElementMap
}

/**
 * Ratio of bottom mast thickness
 */
const middleMastThicknessRatio = 0.75

/**
 * Ratio of bottom mast thickness
 */
const topMastThicknessRatio = 0.5

/**
 * Logs needed for planking as a ratio of ship mass
 */
const plankingRatio = 0.13

/**
 * Hemp needed for crew space trim as a ratio of ship mass
 */
const crewSpaceRatio = 0.025

// noinspection SpellCheckingInspection
/**
 * Maps the ship name (lower case for the file name) to the ship id
 */
const shipNames: Map<string, { id: number; master: string }> = new Map([
    ["agamemnon", { id: 694, master: "" }],
    ["basiccutter", { id: 413, master: "cutter" }],
    ["basiclynx", { id: 275, master: "lynx" }],
    ["bellepoule", { id: 264, master: "" }],
    ["bellona", { id: 265, master: "" }],
    ["bellona74", { id: 359, master: "" }],
    ["brig", { id: 266, master: "" }],
    ["brigmr", { id: 267, master: "" }],
    ["bucentaure", { id: 268, master: "" }],
    ["cerberus", { id: 269, master: "" }],
    ["christian", { id: 1664, master: "" }],
    ["constitution", { id: 270, master: "" }],
    ["constitution2", { id: 1674, master: "" }],
    ["cutter", { id: 271, master: "" }],
    ["de_ruyter", { id: 2318, master: "" }],
    ["diana", { id: 1665, master: "" }],
    ["endymion", { id: 768, master: "" }],
    ["essex", { id: 272, master: "" }],
    ["frigate", { id: 273, master: "" }],
    ["grosventre", { id: 396, master: "" }],
    ["grosventrepirate", { id: 1561, master: "" }],
    ["gunboat", { id: 695, master: "" }],
    ["hamburg", { id: 970, master: "" }],
    ["hercules", { id: 1675, master: "" }],
    ["hermione", { id: 592, master: "" }],
    ["indefatiable", { id: 787, master: "" }],
    ["indiaman", { id: 425, master: "" }],
    ["indiaman rookie", { id: 2223, master: "indiaman" }],
    ["ingermanland", { id: 395, master: "" }],
    ["implacable", { id: 2235, master: "" }],
    ["leopard", { id: 2078, master: "" }],
    ["lhermione", { id: 986, master: "" }],
    ["lynx", { id: 274, master: "" }],
    ["mercury", { id: 276, master: "" }],
    ["navybrig", { id: 277, master: "" }],
    ["niagara", { id: 278, master: "" }],
    ["ocean", { id: 650, master: "" }],
    ["pandora", { id: 1020, master: "" }],
    ["pavel", { id: 279, master: "" }],
    ["pickle", { id: 280, master: "" }],
    ["piratefrigate", { id: 281, master: "" }],
    ["princedeneufchatel", { id: 1125, master: "" }],
    ["privateer", { id: 282, master: "" }],
    ["rattlesnake", { id: 283, master: "" }],
    ["rattlesnakeheavy", { id: 284, master: "" }],
    ["renommee", { id: 285, master: "" }],
    ["requin", { id: 1676, master: "" }],
    ["rookie brig", { id: 1535, master: "brig" }],
    ["rookie snow", { id: 1536, master: "snow" }],
    ["santisima", { id: 286, master: "" }],
    ["snow", { id: 287, master: "" }],
    ["surprise", { id: 288, master: "" }],
    ["temeraire", { id: 2229, master: "" }],
    ["trader brig", { id: 289, master: "brig" }],
    ["trader cutter", { id: 290, master: "cutter" }],
    ["trader lynx", { id: 291, master: "lynx" }],
    ["trader snow", { id: 292, master: "snow" }],
    ["trincomalee", { id: 293, master: "" }],
    ["victory", { id: 294, master: "" }],
    ["wasa", { id: 1021, master: "" }],
    ["wasa_prototype", { id: 1938, master: "" }],
    ["yacht", { id: 295, master: "" }],
    ["yachtsilver", { id: 393, master: "" }]
])

const getShipId = (baseFileName: string): number => shipNames.get(baseFileName)?.id ?? 0

const getShipMaster = (baseFileName: string): string => shipNames.get(baseFileName)?.master ?? ""

// noinspection SpellCheckingInspection
/**
 * Data structure for content of the individual files.
 */
const subFileStructure: SubFileStructure[] = [
    {
        ext: "b armor",
        elements: new Map([
            // ["ARMOR_REAR_HP", { group: "stern", element: "armour" }], // removed patch 30
            ["ARMOR_THICKNESS", { group: "stern", element: "thickness" }],
            ["REPAIR_MODULE_TIME", { group: "repairTime", element: "stern" }]
        ])
    },
    {
        ext: "f armor",
        elements: new Map([
            // ["ARMOR_FRONT_HP", { group: "bow", element: "armour" }], // removed patch 30
            ["ARMOR_THICKNESS", { group: "bow", element: "thickness" }],
            ["REPAIR_MODULE_TIME", { group: "repairTime", element: "bow" }]
        ])
    },
    {
        ext: "l armor",
        elements: new Map([
            // ["ARMOR_LEFT_HP", { group: "sides", element: "armour" }], // removed patch 30
            ["ARMOR_THICKNESS", { group: "sides", element: "thickness" }],
            ["REPAIR_MODULE_TIME", { group: "repairTime", element: "sides" }]
        ])
    },
    {
        ext: "hull",
        elements: new Map([
            // ["FIRE_INCREASE_RATE", "FIRE_INCREASE_RATE"],
            // ["FIREZONE_HORIZONTAL_ROTATION_SPEED", "FIREZONE_HORIZONTAL_ROTATION_SPEED"],
            ["FIREZONE_HORIZONTAL_WIDTH", { group: "ship", element: "firezoneHorizontalWidth" }],
            // ["FIREZONE_MAX_HORIZONTAL_ANGLE", "FIREZONE_MAX_HORIZONTAL_ANGLE"],
            // ["HIT_PROBABILITY", "HIT_PROBABILITY"],
            ["SHIP_PHYSICS_ACC_COEF", { group: "ship", element: "acceleration" }],
            ["SHIP_PHYSICS_DEC_COEF", { group: "ship", element: "deceleration" }],
            // ["SHIP_RHEAS_DRIFT", "SHIP_RHEAS_DRIFT"],
            // ["SHIP_SPEED_DRIFT_MODIFIER", { group: "ship", element: "speedDriftModifier" }],
            // ["SHIP_SPEED_YARD_POWER_MODIFIER", "SHIP_SPEED_YARD_POWER_MODIFIER"],
            // ["SHIP_STAYSAILS_DRIFT", { group: "ship", element: "staySailsDrift" }],
            ["SHIP_STRUCTURE_LEAKS_PER_SECOND", { group: "ship", element: "structureLeaksPerSecond" }],
            ["SHIP_TURNING_ACCELERATION_TIME", { group: "ship", element: "turningAcceleration" }],
            ["SHIP_TURNING_ACCELERATION_TIME_RHEAS", { group: "ship", element: "turningYardAcceleration" }],
            ["SHIP_WATERLINE_HEIGHT", { group: "ship", element: "waterlineHeight" }]
        ])
    },
    {
        ext: "mast",
        elements: new Map([
            // ["HIT_PROBABILITY", "HIT_PROBABILITY"],
            ["MAST_BOTTOM_SECTION_HP", { group: "mast", element: "bottomArmour" }],
            ["MAST_MIDDLE_SECTION_HP", { group: "mast", element: "middleArmour" }],
            ["MAST_TOP_SECTION_HP", { group: "mast", element: "topArmour" }]
        ])
    },
    {
        ext: "rudder",
        elements: new Map([
            ["ARMOR_THICKNESS", { group: "rudder", element: "thickness" }],
            // ["HIT_PROBABILITY", "HIT_PROBABILITY"],
            // ["MODULE_BASE_HP", { group: "rudder", element: "armour" }], // removed patch 30
            ["REPAIR_MODULE_TIME", { group: "repairTime", element: "rudder" }],
            ["RUDDER_HALFTURN_TIME", { group: "rudder", element: "halfturnTime" }],
            ["SHIP_TURNING_SPEED", { group: "rudder", element: "turnSpeed" }]
        ])
    },
    {
        ext: "sail",
        elements: new Map([
            // ["EXPLOSION_DAMAGE_ABSORB_MULTIPLIER", "EXPLOSION_DAMAGE_ABSORB_MULTIPLIER"],
            // ["HIT_PROBABILITY", "HIT_PROBABILITY"],
            // ["MAST_CRIT_PROBABILITY", "MAST_CRIT_PROBABILITY"],
            ["MAST_THICKNESS", { group: "mast", element: "bottomThickness" }],
            // ["MODULE_BASE_HP", { group: "sails", element: "armour" }], // removed patch 30
            ["REPAIR_MODULE_TIME", { group: "repairTime", element: "sails" }],
            // ["RHEA_TURN_SPEED", "RHEA_TURN_SPEED"],
            ["SAIL_RISING_SPEED", { group: "sails", element: "risingSpeed" }],
            ["SAILING_CREW_REQUIRED", { group: "crew", element: "sailing" }],
            ["SHIP_MAX_SPEED", { group: "ship", element: "maxSpeed" }]
            // ["SPANKER_TURN_SPEED", { group: "sails", element: "spankerTurnSpeed" }]
        ])
    },
    {
        ext: "structure",
        elements: new Map([
            // ["EXPLOSION_DAMAGE_ABSORB_MULTIPLIER", "EXPLOSION_DAMAGE_ABSORB_MULTIPLIER"],
            // ["MODULE_BASE_HP", { group: "structure", element: "armour" }], // removed patch 30
            ["REPAIR_MODULE_TIME", { group: "repairTime", element: "structure" }]
        ])
    }
]

let apiItems: APIItemGeneric[]
let ships: ShipData[]

/**
 * Get item names
 * @returns Item names
 */
const getItemNames = (): Map<number, string> => new Map(apiItems.map(item => [item.Id, cleanName(item.Name)]))

/**
 * Get ship mass
 * @param id - Ship id
 * @returns Ship mass
 */
const getShipMass = (id: number): number => apiItems.find(apiItem => id === apiItem.Id)?.ShipMass ?? 0

const convertGenericShipData = (): ShipData[] => {
    // noinspection MagicNumberJS
    const cannonWeight = [0, 42, 32, 24, 18, 12, 9, 0, 6, 4, 3, 2]
    // noinspection MagicNumberJS
    const carroWeight = [0, 0, 68, 42, 32, 24, 0, 18, 12]
    return ((apiItems.filter(item => item.ItemType === "Ship" && !item.NotUsed) as unknown) as APIShip[]).map(
        (ship: APIShip): ShipData => {
            const calcPortSpeed = ship.Specs.MaxSpeed * speedConstA - speedConstB
            const speedDegrees = ship.Specs.SpeedToWind.map(speed => roundToThousands(speed * calcPortSpeed))
            const { length } = ship.Specs.SpeedToWind

            // Mirror speed degrees
            for (let i = 1; i < (length - 1) * 2; i += 2) {
                speedDegrees.unshift(speedDegrees[i])
            }

            // Delete last element
            speedDegrees.pop()

            const deckClassLimit = ship.DeckClassLimit.map(deck => [
                cannonWeight[deck.Limitation1.Min],
                carroWeight[deck.Limitation2.Min]
            ])
            const gunsPerDeck = ship.GunsPerDeck
            // Delete mortar entry
            gunsPerDeck.pop()
            let guns = 0
            let cannonBroadside = 0
            let carronadesBroadside = 0
            const emptyDeck = [0, 0]
            for (let i = 0; i < 4; i += 1) {
                if (deckClassLimit[i]) {
                    guns += gunsPerDeck[i]
                    if (deckClassLimit[i][1]) {
                        carronadesBroadside += (gunsPerDeck[i] * deckClassLimit[i][1]) / 2
                    } else {
                        carronadesBroadside += (gunsPerDeck[i] * deckClassLimit[i][0]) / 2
                    }

                    cannonBroadside += (gunsPerDeck[i] * deckClassLimit[i][0]) / 2
                } else {
                    deckClassLimit.push(emptyDeck)
                }
            }

            const broadside = { cannons: cannonBroadside, carronades: carronadesBroadside }

            const frontDeck = ship.FrontDecks
                ? ship.FrontDeckClassLimit.map(deck => [
                      cannonWeight[deck.Limitation1.Min],
                      carroWeight[deck.Limitation2.Min]
                  ])[0]
                : emptyDeck
            deckClassLimit.push(frontDeck)

            const backDeck = ship.BackDecks
                ? ship.BackDeckClassLimit.map(deck => [
                      cannonWeight[deck.Limitation1.Min],
                      carroWeight[deck.Limitation2.Min]
                  ])[0]
                : emptyDeck
            deckClassLimit.push(backDeck)

            return {
                id: Number(ship.Id),
                name: cleanName(ship.Name),
                class: ship.Class,
                gunsPerDeck,
                guns,
                broadside,
                deckClassLimit,
                shipMass: ship.ShipMass,
                battleRating: ship.BattleRating,
                decks: ship.Decks,
                holdSize: ship.HoldSize,
                maxWeight: ship.MaxWeight,
                crew: { min: ship.MinCrewRequired, max: ship.HealthInfo.Crew, sailing: 0 },
                speedDegrees,
                speed: {
                    min: speedDegrees.reduce((a, b) => Math.min(a, b)),
                    max: roundToThousands(calcPortSpeed)
                },
                sides: { armour: ship.HealthInfo.LeftArmor, thickness: 0 },
                bow: { armour: ship.HealthInfo.FrontArmor, thickness: 0 },
                stern: { armour: ship.HealthInfo.BackArmor, thickness: 0 },
                structure: { armour: ship.HealthInfo.InternalStructure },
                sails: { armour: ship.HealthInfo.Sails, risingSpeed: 0 },
                pump: { armour: ship.HealthInfo.Pump },
                rudder: {
                    armour: ship.HealthInfo.Rudder,
                    turnSpeed: 0,
                    halfturnTime: 0,
                    thickness: 0
                },
                upgradeXP: ship.OverrideTotalXpForUpgradeSlots,
                repairTime: { stern: 120, bow: 120, sides: 120, rudder: 30, sails: 120, structure: 60 },
                ship: {
                    waterlineHeight: 0,
                    firezoneHorizontalWidth: 0,
                    structureLeaksPerSecond: 0,
                    deceleration: 0,
                    acceleration: 0,
                    turningAcceleration: 0,
                    turningYardAcceleration: 0,
                    maxSpeed: 0
                },
                mast: {
                    bottomArmour: 0,
                    middleArmour: 0,
                    topArmour: 0,
                    bottomThickness: 0,
                    middleThickness: 0,
                    topThickness: 0
                },
                premium: ship.Premium,
                tradeShip: ship.ShipType === 1
                // hostilityScore: ship.HostilityScore
            } as ShipData
        }
    )
}

/**
 * List of file names to be read
 */
const baseFileNames: Set<string> = new Set()

/**
 * Gets all files from directory <dir> and stores valid ship names in <fileNames>
 * @param dir - Directory
 */
const getBaseFileNames = (dir: string): void => {
    for (const fileName of fs.readdirSync(dir)) {
        /**
         * First part of the file name containing the ship name
         */
        let str = fileName.slice(0, fileName.indexOf(" "))
        if (str === "rookie" || str === "trader") {
            const shortenedFileName = fileName.replace("rookie ", "").replace("trader ", "")
            const str2 = shortenedFileName.slice(0, shortenedFileName.indexOf(" "))
            str = str.concat(" ").concat(str2)
        }

        if (shipNames.has(str)) {
            baseFileNames.add(str)
        }
    }

    // Add 'basic' ship without files
    baseFileNames.add("basiccutter")
    baseFileNames.add("basiclynx")
    baseFileNames.add("indiaman rookie")
}

const getAddData = (elements: ElementMap, fileData: XmlGeneric): ShipData => {
    /**
     * Ship data to be added per file
     */
    const addData = {} as ShipData

    // Retrieve additional data per attribute pair
    for (const pair of fileData.Attributes.Pair) {
        const key = pair.Key._text
        // Check if pair is considered additional data
        if (elements.has(key)) {
            const value = Number((pair.Value.Value as TextEntity)._text)
            const { group, element } = elements.get(key)!
            if (!addData[group]) {
                addData[group] = {}
            }

            addData[group][element] = value

            // Add calculated mast thickness
            if (key === "MAST_THICKNESS") {
                addData[group].middleThickness = value * middleMastThicknessRatio
                addData[group].topThickness = value * topMastThicknessRatio
            }
        }
    }

    return addData
}

// Add additional data to the existing data
const addAddData = (addData: ShipData, id: number): void => {
    // Find current ship
    ships
        .filter(ship => ship.id === id)
        .forEach(ship => {
            // Get all data for each group
            for (const [group, values] of Object.entries(addData)) {
                if (!ship[group]) {
                    ship[group] = {}
                }

                // Get all elements per group
                for (const [element, value] of Object.entries(values)) {
                    // add value
                    ship[group][element] = value
                }
            }
        })
}

const getFileData = (baseFileName: string, ext: string): XmlGeneric => {
    const fileName = path.resolve(commonPaths.dirModules, `${baseFileName} ${ext}.xml`)
    let data = {} as XmlGeneric
    if (fileExists(fileName)) {
        const fileXmlData = readTextFile(fileName)
        data = (convert.xml2js(fileXmlData, { compact: true }) as ElementCompact).ModuleTemplate as XmlGeneric
    }

    return data
}

/**
 * Retrieve additional ship data from game files and add it to existing ship data
 * @returns Ship data
 */
const convertAddShipData = (ships: ShipData[]): ShipData[] => {
    getBaseFileNames(commonPaths.dirModules)

    // Get all files without a master

    for (const baseFileName of baseFileNames) {
        if (!getShipMaster(baseFileName)) {
            /**
             * Current ship id
             */
            const id = getShipId(baseFileName)

            // Retrieve and store additional data per file
            for (const file of subFileStructure) {
                const fileData = getFileData(baseFileName, file.ext)
                /**
                 * Ship data to be added per file
                 */
                const addData = getAddData(file.elements, fileData)

                addAddData(addData, id)
            }
        }
    }

    // Get all files with a master (ship data has to be copied from master)
    for (const baseFileName of baseFileNames) {
        if (getShipMaster(baseFileName)) {
            /**
             * Current ship id
             */
            const id = getShipId(baseFileName)
            /**
             * Current ship master
             */
            const masterBaseFileName = getShipMaster(baseFileName)

            // Retrieve and store additional data per file
            for (const file of subFileStructure) {
                const fileData = getFileData(baseFileName, file.ext)
                const fileMasterData = getFileData(masterBaseFileName, file.ext)
                /**
                 * Ship data to be added per file
                 */
                const addData = isEmpty(fileData) ? ({} as ShipData) : getAddData(file.elements, fileData)
                const addMasterData = getAddData(file.elements, fileMasterData)

                /*
                    https://stackoverflow.com/a/47554782
                    const mergedData = mergeDeep(addMasterData,addData);
                */
                const mergedData = mergeAdvanced(addMasterData, addData) as ShipData

                addAddData(mergedData, id)
            }
        }
    }

    return ships
}

/**
 * Convert ship blueprints
 */
const convertShipBlueprints = async (): Promise<void> => {
    const itemNames = getItemNames()
    const shipBlueprints = ((apiItems.filter(
        apiItem => !apiItem.NotUsed && apiItem.ItemType === "RecipeShip"
    ) as unknown) as APIShipBlueprint[])
        .map(apiBlueprint => {
            const shipMass = getShipMass(apiBlueprint.Results[0].Template)
            return {
                id: apiBlueprint.Id,
                name: cleanName(apiBlueprint.Name).replace(" Blueprint", ""),
                wood: [
                    { name: "Frame", amount: apiBlueprint.WoodTypeDescs[0].Requirements[0].Amount },
                    { name: "Planking", amount: Math.round(shipMass * plankingRatio) },
                    { name: "Crew Space", amount: Math.round(shipMass * crewSpaceRatio) }
                ],
                resources: apiBlueprint.FullRequirements.filter(
                    requirement =>
                        !(
                            (itemNames.get(requirement.Template)?.endsWith(" Permit") ??
                                itemNames.get(requirement.Template) === "Doubloons") ||
                            itemNames.get(requirement.Template) === "Provisions"
                        )
                ).map(requirement => ({
                    name: itemNames.get(requirement.Template)?.replace(" Log", ""),
                    amount: requirement.Amount
                })),
                provisions:
                    (
                        apiBlueprint.FullRequirements.find(
                            requirement => itemNames.get(requirement.Template) === "Provisions"
                        ) ?? {}
                    ).Amount ?? 0,
                doubloons:
                    (
                        apiBlueprint.FullRequirements.find(
                            requirement => itemNames.get(requirement.Template) === "Doubloons"
                        ) ?? {}
                    ).Amount ?? 0,
                permit:
                    (
                        apiBlueprint.FullRequirements.find(requirement =>
                            itemNames.get(requirement.Template)?.endsWith(" Permit")
                        ) ?? {}
                    ).Amount ?? 0,
                ship: {
                    id: apiBlueprint.Results[0].Template,
                    name: itemNames.get(apiBlueprint.Results[0].Template),
                    mass: shipMass
                },
                shipyardLevel: apiBlueprint.BuildingRequirements[0].Level + 1,
                craftLevel: apiBlueprint.RequiresLevel,
                craftXP: apiBlueprint.GivesXP,
                labourHours: apiBlueprint.LaborPrice
            }
        })
        // Sort by name
        .sort(sortBy(["id"]))

    await saveJsonAsync(commonPaths.fileShipBlueprint, shipBlueprints)
}

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

const convertShips = async (): Promise<void> => {
    ships = convertGenericShipData()
    ships = convertAddShipData(ships)
    ships.sort(sortBy(["class", "name"]))
    await saveJsonAsync(commonPaths.fileShip, ships)
}

export const convertShipData = async (): Promise<void> => {
    apiItems = (readJson(
        path.resolve(baseAPIFilename, `${serverNames[0]}-ItemTemplates-${serverDate}.json`)
    ) as unknown) as APIItemGeneric[]
    await convertShips()
    await convertShipBlueprints()
}
