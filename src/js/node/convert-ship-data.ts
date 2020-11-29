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
import path from "path"

import convert, { ElementCompact } from "xml-js"

import { baseAPIFilename, commonPaths, serverStartDate as serverDate } from "../common/common-dir"
import { fileExists, readJson, readTextFile, saveJsonAsync } from "../common/common-file"
import { roundToThousands, speedConstA, speedConstB } from "../common/common-math"
import { cleanName, sortBy } from "../common/common-node"
import { serverIds } from "../common/servers"

import { APIItemGeneric, APIShip, APIShipBlueprint, Limit, Specs } from "./api-item"
import { Cannon, ShipBlueprint, ShipData, ShipGunDeck, ShipGuns } from "../common/gen-json"
import { TextEntity, XmlGeneric } from "./xml"
import { isEmpty } from "../common/common"

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
const plankingRatio = 0.2134

/**
 * Hemp needed for crew space trim as a ratio of ship mass
 */
const crewSpaceRatio = 0.025

// noinspection SpellCheckingInspection
const shipsWith36lb = new Set([
    2229, // Redoutable (i)
    2235, // Implacable
    2318, // Admiraal de Ruyter
])
const shipsNotUsed = new Set([
    1535, // rookie brig
    1536, // rookie snow
    2223, // indiaman rookie
    2338, // tutorial cerberus
    2339, // tutorial trader
    2343, // tutorial brig
    2352, // Diana (i)
    2454, // tutorial brig 2
])
const blueprintsNotUsed = new Set([
    665, // Santa Cecilia
    746, // GunBoat
    1558, // L'Hermione
    1719, // Hercules
    1720, // Pandora
    1721, // Le Requin
    2031, // Rättvisan
    2213, // Leopard
    2228, // Redoutable
    2236, // Yacht
    2239, // Yacht silver
    2381, // Diana (i)
    2382, // Victory1765
])

// noinspection SpellCheckingInspection
/**
 * Maps the ship name (lower case for the file name) to the ship id
 */
const shipNames: Map<string, { id: number; master: string[] }> = new Map([
    ["agamemnon", { id: 694, master: [] }],
    ["basiccutter", { id: 413, master: ["cutter"] }],
    ["basiclynx", { id: 275, master: ["lynx"] }],
    ["bellepoule", { id: 264, master: [] }],
    ["bellona", { id: 265, master: [] }],
    ["bellona74", { id: 359, master: [] }],
    ["brig", { id: 266, master: [] }],
    ["brigmr", { id: 267, master: [] }],
    ["bucentaure", { id: 268, master: [] }],
    ["cerberus", { id: 269, master: [] }],
    ["christian", { id: 1664, master: [] }],
    ["constitution", { id: 270, master: [] }],
    ["constitution2", { id: 1674, master: [] }],
    ["cutter", { id: 271, master: [] }],
    ["de_ruyter", { id: 2318, master: [] }],
    ["diana", { id: 1665, master: [] }],
    ["endymion", { id: 768, master: [] }],
    ["essex", { id: 272, master: [] }],
    ["frigate", { id: 273, master: [] }],
    ["grosventre", { id: 396, master: [] }],
    ["grosventrepirate", { id: 1561, master: [] }],
    ["gunboat", { id: 695, master: [] }],
    ["hamburg", { id: 970, master: [] }],
    ["hercules", { id: 1675, master: [] }],
    ["hermione", { id: 592, master: [] }],
    ["indefatiable", { id: 787, master: [] }],
    ["indiaman", { id: 425, master: [] }],
    ["ingermanland", { id: 395, master: [] }],
    ["implacable", { id: 2235, master: [] }],
    ["leopard", { id: 2078, master: [] }],
    ["lhermione", { id: 986, master: [] }],
    ["lynx", { id: 274, master: [] }],
    ["mercury", { id: 276, master: [] }],
    ["navybrig", { id: 277, master: [] }],
    ["niagara", { id: 278, master: [] }],
    ["ocean", { id: 650, master: [] }],
    ["pandora", { id: 1020, master: [] }],
    ["pavel", { id: 279, master: [] }],
    ["pickle", { id: 280, master: [] }],
    ["piratefrigate", { id: 281, master: [] }],
    ["princedeneufchatel", { id: 1125, master: [] }],
    ["privateer", { id: 282, master: [] }],
    ["rattlesnake", { id: 283, master: [] }],
    ["rattlesnakeheavy", { id: 284, master: [] }],
    ["renommee", { id: 285, master: [] }],
    ["requin", { id: 1676, master: [] }],
    ["santisima", { id: 286, master: [] }],
    ["snow", { id: 287, master: [] }],
    ["surprise", { id: 288, master: [] }],
    ["temeraire", { id: 2229, master: [] }],
    ["trader brig", { id: 289, master: ["brig"] }],
    ["trader cutter", { id: 290, master: ["cutter"] }],
    ["trader lynx", { id: 291, master: ["lynx"] }],
    ["trader snow", { id: 292, master: ["snow"] }],
    ["trincomalee", { id: 293, master: [] }],
    ["victory", { id: 294, master: [] }],
    ["victory1765", { id: 2350, master: [] }],
    ["wasa", { id: 1021, master: [] }],
    ["wasa_prototype", { id: 1938, master: [] }],
    ["yacht", { id: 295, master: [] }],
    ["yachtsilver", { id: 393, master: [] }],
])

const getShipId = (baseFileName: string): number => shipNames.get(baseFileName)?.id ?? 0

const getShipMaster = (baseFileName: string): string[] => shipNames.get(baseFileName)?.master ?? []

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
            ["REPAIR_MODULE_TIME", { group: "repairTime", element: "stern" }],
        ]),
    },
    {
        ext: "crew",
        elements: new Map([
            ["SHIP_BOARDING_PREPARATION_BONUS", { group: "boarding", element: "prepInitial" }],
            ["PREPARATION_BONUS_PER_ROUND", { group: "boarding", element: "prepPerRound" }],
            ["HANDBOOK_MORALE_BONUS", { group: "boarding", element: "morale" }],
        ]),
    },
    {
        ext: "f armor",
        elements: new Map([
            // ["ARMOR_FRONT_HP", { group: "bow", element: "armour" }], // removed patch 30
            ["ARMOR_THICKNESS", { group: "bow", element: "thickness" }],
            ["REPAIR_MODULE_TIME", { group: "repairTime", element: "bow" }],
        ]),
    },
    {
        ext: "l armor",
        elements: new Map([
            // ["ARMOR_LEFT_HP", { group: "sides", element: "armour" }], // removed patch 30
            ["ARMOR_THICKNESS", { group: "sides", element: "thickness" }],
            ["REPAIR_MODULE_TIME", { group: "repairTime", element: "sides" }],
        ]),
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
            ["SHIP_MAX_ROLL_ANGLE", { group: "ship", element: "rollAngle" }],
            // ["SHIP_RHEAS_DRIFT", "SHIP_RHEAS_DRIFT"],
            // ["SHIP_SPEED_DRIFT_MODIFIER", { group: "ship", element: "speedDriftModifier" }],
            // ["SHIP_SPEED_YARD_POWER_MODIFIER", "SHIP_SPEED_YARD_POWER_MODIFIER"],
            // ["SHIP_STAYSAILS_DRIFT", { group: "ship", element: "staySailsDrift" }],
            ["SHIP_STRUCTURE_LEAKS_PER_SECOND", { group: "ship", element: "structureLeaks" }],
            ["SHIP_TURNING_ACCELERATION_TIME", { group: "ship", element: "turnAcceleration" }],
            ["SHIP_TURNING_ACCELERATION_TIME_RHEAS", { group: "ship", element: "yardTurningAcceleration" }],
            ["SHIP_WATERLINE_HEIGHT", { group: "ship", element: "waterlineHeight" }],
        ]),
    },
    {
        ext: "mast",
        elements: new Map([
            // ["HIT_PROBABILITY", "HIT_PROBABILITY"],
            ["MAST_BOTTOM_SECTION_HP", { group: "mast", element: "bottomArmour" }],
            ["MAST_MIDDLE_SECTION_HP", { group: "mast", element: "middleArmour" }],
            ["MAST_TOP_SECTION_HP", { group: "mast", element: "topArmour" }],
        ]),
    },
    {
        ext: "rudder",
        elements: new Map([
            ["ARMOR_THICKNESS", { group: "rudder", element: "thickness" }],
            // ["HIT_PROBABILITY", "HIT_PROBABILITY"],
            // ["MODULE_BASE_HP", { group: "rudder", element: "armour" }], // removed patch 30
            ["REPAIR_MODULE_TIME", { group: "repairTime", element: "rudder" }],
            ["RUDDER_HALFTURN_TIME", { group: "rudder", element: "halfturnTime" }],
            ["SHIP_TURNING_SPEED", { group: "ship", element: "turnSpeed" }],
        ]),
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
            ["SHIP_MAX_SPEED", { group: "ship", element: "maxSpeed" }],
            // ["SPANKER_TURN_SPEED", { group: "sails", element: "spankerTurnSpeed" }]
        ]),
    },
    {
        ext: "structure",
        elements: new Map([
            // ["EXPLOSION_DAMAGE_ABSORB_MULTIPLIER", "EXPLOSION_DAMAGE_ABSORB_MULTIPLIER"],
            // ["MODULE_BASE_HP", { group: "structure", element: "armour" }], // removed patch 30
            ["REPAIR_MODULE_TIME", { group: "repairTime", element: "structure" }],
        ]),
    },
]

let apiItems: APIItemGeneric[]
let ships: ShipData[]
let cannons: Cannon

/**
 * Get item names
 * @returns Item names
 */
const getItemNames = (): Map<number, string> => new Map(apiItems.map((item) => [item.Id, cleanName(item.Name)]))

/**
 * Get ship mass
 * @param id - Ship id
 * @returns Ship mass
 */
const getShipMass = (id: number): number => apiItems.find((apiItem) => id === apiItem.Id)?.ShipMass ?? 0

const getSpeedDegrees = (specs: Specs): { calcPortSpeed: number; speedDegrees: number[] } => {
    const calcPortSpeed = specs.MaxSpeed * speedConstA - speedConstB
    const speedDegrees = specs.SpeedToWind.map((speed: number) => roundToThousands(speed * calcPortSpeed))
    const { length } = specs.SpeedToWind

    // Mirror speed degrees
    for (let i = 1; i < (length - 1) * 2; i += 2) {
        speedDegrees.unshift(speedDegrees[i])
    }

    // Delete last element
    speedDegrees.pop()

    return { calcPortSpeed, speedDegrees }
}

const convertGenericShipData = (): ShipData[] => {
    const cannonLb = [0, 42, 32, 24, 18, 12, 9, 0, 6, 4, 3, 2]
    const carroLb = [0, 0, 68, 42, 32, 24, 0, 18, 12]
    const sideDeckMaxIndex = 3
    const frontDeckIndex = sideDeckMaxIndex + 1
    const backDeckIndex = frontDeckIndex + 1
    const emptyDeck = { amount: 0, maxCannonLb: 0, maxCarroLb: 0 } as ShipGunDeck

    const cannonData = new Map<number, { weight: number; crew: number }>(
        cannons.long
            .filter((cannon) => !Number.isNaN(Number(cannon.name)))
            .map((cannon) => {
                return [Number(cannon.name), { weight: cannon.generic.weight.value, crew: cannon.generic.crew.value }]
            })
    )
    const carroData = new Map<number, { weight: number; crew: number }>(
        cannons.carronade
            .filter((cannon) => !Number.isNaN(Number(cannon.name)))
            .map((cannon) => {
                return [Number(cannon.name), { weight: cannon.generic.weight.value, crew: cannon.generic.crew.value }]
            })
    )

    return ((apiItems.filter(
        (item) => item.ItemType === "Ship" && !item.NotUsed && !shipsNotUsed.has(item.Id)
    ) as unknown) as APIShip[]).map(
        (apiShip: APIShip): ShipData => {
            const guns = {
                total: 0,
                decks: apiShip.Decks,
                broadside: { cannons: 0, carronades: 0 },
                gunsPerDeck: [],
                weight: { cannons: 0, carronades: 0 },
            } as ShipGuns
            let totalCannonCrew = 0
            let totalCarroCrew = 0

            const { calcPortSpeed, speedDegrees } = getSpeedDegrees(apiShip.Specs)

            const addDeck = (deckLimit: Limit, index: number) => {
                if (deckLimit) {
                    const gunsPerDeck = apiShip.GunsPerDeck[index]
                    const currentDeck = {
                        amount: gunsPerDeck,
                        // French-build 3rd rates have 36lb cannons on gun deck (instead of 32lb)
                        maxCannonLb:
                            shipsWith36lb.has(apiShip.Id) && index === apiShip.Decks - 1
                                ? 36
                                : cannonLb[deckLimit.Limitation1.Min],
                        maxCarroLb: carroLb[deckLimit.Limitation2.Min],
                    }
                    guns.gunsPerDeck.push(currentDeck)

                    const cannonWeight = Math.round(
                        gunsPerDeck * (cannonData.get(currentDeck.maxCannonLb)?.weight ?? 0)
                    )
                    const cannonCrew = gunsPerDeck * (cannonData.get(currentDeck.maxCannonLb)?.crew ?? 0)

                    guns.weight.cannons += cannonWeight
                    totalCannonCrew += cannonCrew

                    if (currentDeck.maxCarroLb) {
                        guns.weight.carronades += Math.round(
                            gunsPerDeck * (cannonData.get(currentDeck.maxCarroLb)?.weight ?? 0)
                        )
                        totalCarroCrew += gunsPerDeck * (carroData.get(currentDeck.maxCarroLb)?.crew ?? 0)
                    } else {
                        guns.weight.carronades += cannonWeight
                        totalCarroCrew += cannonCrew
                    }
                } else {
                    guns.gunsPerDeck.push(emptyDeck)
                }
            }

            for (let deckIndex = 0; deckIndex <= sideDeckMaxIndex; deckIndex += 1) {
                addDeck(apiShip.DeckClassLimit[deckIndex], deckIndex)
                const gunsPerDeck = guns.gunsPerDeck[deckIndex].amount
                const cannonBroadside = (gunsPerDeck * guns.gunsPerDeck[deckIndex].maxCannonLb) / 2

                guns.total += gunsPerDeck
                if (guns.gunsPerDeck[deckIndex].maxCarroLb) {
                    guns.broadside.carronades += (gunsPerDeck * guns.gunsPerDeck[deckIndex].maxCarroLb) / 2
                } else {
                    guns.broadside.carronades += cannonBroadside
                }

                guns.broadside.cannons += cannonBroadside
            }

            addDeck(apiShip.FrontDeckClassLimit[0], frontDeckIndex)
            addDeck(apiShip.BackDeckClassLimit[0], backDeckIndex)

            const ship = {
                id: Number(apiShip.Id),
                name: cleanName(apiShip.Name),
                class: apiShip.Class,
                guns,
                shipMass: apiShip.ShipMass,
                battleRating: apiShip.BattleRating,
                holdSize: apiShip.HoldSize,
                maxWeight: apiShip.MaxWeight,
                crew: {
                    min: apiShip.MinCrewRequired,
                    max: apiShip.HealthInfo.Crew,
                    cannons: totalCannonCrew,
                    carronades: totalCarroCrew,
                },
                speedDegrees,
                speed: {
                    // eslint-disable-next-line unicorn/no-reduce
                    min: speedDegrees.reduce((a, b) => Math.min(a, b)),
                    max: roundToThousands(calcPortSpeed),
                },
                sides: { armour: apiShip.HealthInfo.LeftArmor },
                bow: { armour: apiShip.HealthInfo.FrontArmor },
                stern: { armour: apiShip.HealthInfo.BackArmor },
                structure: { armour: apiShip.HealthInfo.InternalStructure },
                sails: { armour: apiShip.HealthInfo.Sails },
                pump: { armour: apiShip.HealthInfo.Pump },
                rudder: {
                    armour: apiShip.HealthInfo.Rudder,
                },
                upgradeXP: apiShip.OverrideTotalXpForUpgradeSlots,
                premium: apiShip.Premium,
                tradeShip: apiShip.ShipType === 1,
                // hostilityScore: ship.HostilityScore
            } as ShipData

            if (ship.id === 1535) {
                ship.name = "Rookie Brig"
            }

            return ship
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
        if (str === "rookie" || str === "trader" || str === "tutorial") {
            const shortenedFileName = fileName.replace("rookie ", "").replace("trader ", "").replace("tutorial ", "")
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
    baseFileNames.add("tutorial trader")
}

const getAdditionalData = (elements: ElementMap, fileData: XmlGeneric): ShipData => {
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

            // Set default value for preparation per round
            if (key === "PREPARATION_BONUS_PER_ROUND") {
                addData[group][element] += 18
            }

            // Set default value for morale
            if (key === "HANDBOOK_MORALE_BONUS") {
                addData[group][element] += 100
            }
        }
    }

    return addData
}

// Add additional data to the existing data
const addAdditionalData = (addData: ShipData, id: number): void => {
    // Find current ship
    ships
        .filter((ship) => ship.id === id)
        .forEach((ship) => {
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

const getAndAddAdditionalData = (fileName: string, shipId: number): void => {
    for (const file of subFileStructure) {
        const fileData = getFileData(fileName, file.ext)
        if (!isEmpty(fileData)) {
            const additionalData = getAdditionalData(file.elements, fileData)
            addAdditionalData(additionalData, shipId)
        }
    }
}

/**
 * Retrieve additional ship data from game files and add it to existing ship data
 * @returns Ship data
 */
const convertAddShipData = (ships: ShipData[]): ShipData[] => {
    getBaseFileNames(commonPaths.dirModules)

    for (const baseFileName of baseFileNames) {
        const shipId = getShipId(baseFileName)
        const masterBaseFileName = getShipMaster(baseFileName)

        if (masterBaseFileName !== []) {
            for (const master of masterBaseFileName) {
                getAndAddAdditionalData(master, shipId)
            }
        }

        getAndAddAdditionalData(baseFileName, shipId)
    }

    return ships
}

/**
 * Convert ship blueprints
 */
const convertShipBlueprints = async (): Promise<void> => {
    const itemNames = getItemNames()

    const apiBlueprints = (apiItems.filter(
        (apiItem) => apiItem.ItemType === "RecipeShip" && !blueprintsNotUsed.has(apiItem.Id)
    ) as unknown) as APIShipBlueprint[]
    const shipBlueprints = apiBlueprints
        .map((apiBlueprint) => {
            const shipMass = getShipMass(apiBlueprint.Results[0].Template)
            return {
                id: apiBlueprint.Id,
                name: cleanName(apiBlueprint.Name).replace(" Blueprint", ""),
                wood: [
                    { name: "Frame", amount: apiBlueprint.WoodTypeDescs[0].Requirements[0].Amount },
                    { name: "Planking", amount: Math.round(shipMass * plankingRatio + 0.5) },
                    { name: "Crew Space", amount: Math.round(shipMass * crewSpaceRatio + 0.5) },
                ],
                resources: apiBlueprint.FullRequirements.filter(
                    (requirement) =>
                        !(
                            (itemNames.get(requirement.Template)?.endsWith(" Permit") ??
                                itemNames.get(requirement.Template) === "Doubloons") ||
                            itemNames.get(requirement.Template) === "Provisions"
                        )
                ).map((requirement) => ({
                    name: itemNames.get(requirement.Template)?.replace(" Log", ""),
                    amount: requirement.Amount,
                })),
                provisions:
                    (
                        apiBlueprint.FullRequirements.find(
                            (requirement) => itemNames.get(requirement.Template) === "Provisions"
                        ) ?? {}
                    ).Amount ?? 0,
                price: apiBlueprint.GoldRequirements,
                permit:
                    (
                        apiBlueprint.FullRequirements.find((requirement) =>
                            itemNames.get(requirement.Template)?.endsWith(" Permit")
                        ) ?? {}
                    ).Amount ?? 0,
                ship: {
                    id: apiBlueprint.Results[0].Template,
                    name: itemNames.get(apiBlueprint.Results[0].Template),
                    mass: shipMass,
                },
                shipyardLevel: apiBlueprint.BuildingRequirements[0].Level + 1,
                craftLevel: apiBlueprint.RequiresLevel,
                craftXP: apiBlueprint.GivesXP,
                labourHours: apiBlueprint.LaborPrice,
            } as ShipBlueprint
        })
        // Sort by id
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
    ships.sort(sortBy(["id"]))
    await saveJsonAsync(commonPaths.fileShip, ships)
}

export const convertShipData = async (): Promise<void> => {
    apiItems = readJson(path.resolve(baseAPIFilename, `${serverIds[0]}-ItemTemplates-${serverDate}.json`))
    cannons = readJson(commonPaths.fileCannon)
    await convertShips()
    await convertShipBlueprints()
}
