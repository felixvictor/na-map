/*!
 * This file is part of na-map.
 *
 * @file      Convert ship data.
 * @module    convert-ship-data
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import * as fs from "fs";
import * as path from "path";
import convert from "xml-js";
import { baseAPIFilename, commonPaths, serverStartDate as serverDate } from "../common/common-dir";
import { fileExists, readJson, readTextFile, saveJsonAsync } from "../common/common-file";
import { roundToThousands, speedConstA, speedConstB } from "../common/common-math";
import { cleanName, sortBy } from "../common/common-node";
import { serverNames } from "../common/common-var";
import { isEmpty } from "../common/common";
const middleMastThicknessRatio = 0.75;
const topMastThicknessRatio = 0.5;
const crewSpaceRatio = 0.025;
const shipNames = new Map([
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
    ["indiaman rookie", { id: 2223, master: ["indiaman"] }],
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
    ["rookie brig", { id: 1535, master: ["brig"] }],
    ["rookie snow", { id: 1536, master: ["snow"] }],
    ["santisima", { id: 286, master: [] }],
    ["snow", { id: 287, master: [] }],
    ["surprise", { id: 288, master: [] }],
    ["temeraire", { id: 2229, master: [] }],
    ["trader brig", { id: 289, master: ["brig"] }],
    ["trader cutter", { id: 290, master: ["cutter"] }],
    ["trader lynx", { id: 291, master: ["lynx"] }],
    ["trader snow", { id: 292, master: ["snow"] }],
    ["trincomalee", { id: 293, master: [] }],
    ["tutorial trader", { id: 2339, master: ["trader brig", "brig"] }],
    ["tutorial brig", { id: 2343, master: ["brig"] }],
    ["tutorial cerberus", { id: 2338, master: ["cerberus"] }],
    ["victory", { id: 294, master: [] }],
    ["victory1765", { id: 2350, master: [] }],
    ["wasa", { id: 1021, master: [] }],
    ["wasa_prototype", { id: 1938, master: [] }],
    ["yacht", { id: 295, master: [] }],
    ["yachtsilver", { id: 393, master: [] }],
]);
const getShipId = (baseFileName) => shipNames.get(baseFileName)?.id ?? 0;
const getShipMaster = (baseFileName) => shipNames.get(baseFileName)?.master ?? [];
const subFileStructure = [
    {
        ext: "b armor",
        elements: new Map([
            ["ARMOR_THICKNESS", { group: "stern", element: "thickness" }],
            ["REPAIR_MODULE_TIME", { group: "repairTime", element: "stern" }],
        ]),
    },
    {
        ext: "f armor",
        elements: new Map([
            ["ARMOR_THICKNESS", { group: "bow", element: "thickness" }],
            ["REPAIR_MODULE_TIME", { group: "repairTime", element: "bow" }],
        ]),
    },
    {
        ext: "l armor",
        elements: new Map([
            ["ARMOR_THICKNESS", { group: "sides", element: "thickness" }],
            ["REPAIR_MODULE_TIME", { group: "repairTime", element: "sides" }],
        ]),
    },
    {
        ext: "hull",
        elements: new Map([
            ["FIREZONE_HORIZONTAL_WIDTH", { group: "ship", element: "firezoneHorizontalWidth" }],
            ["SHIP_PHYSICS_ACC_COEF", { group: "ship", element: "acceleration" }],
            ["SHIP_PHYSICS_DEC_COEF", { group: "ship", element: "deceleration" }],
            ["SHIP_STRUCTURE_LEAKS_PER_SECOND", { group: "ship", element: "structureLeaksPerSecond" }],
            ["SHIP_TURNING_ACCELERATION_TIME", { group: "ship", element: "turningAcceleration" }],
            ["SHIP_TURNING_ACCELERATION_TIME_RHEAS", { group: "ship", element: "turningYardAcceleration" }],
            ["SHIP_WATERLINE_HEIGHT", { group: "ship", element: "waterlineHeight" }],
        ]),
    },
    {
        ext: "mast",
        elements: new Map([
            ["MAST_BOTTOM_SECTION_HP", { group: "mast", element: "bottomArmour" }],
            ["MAST_MIDDLE_SECTION_HP", { group: "mast", element: "middleArmour" }],
            ["MAST_TOP_SECTION_HP", { group: "mast", element: "topArmour" }],
        ]),
    },
    {
        ext: "rudder",
        elements: new Map([
            ["ARMOR_THICKNESS", { group: "rudder", element: "thickness" }],
            ["REPAIR_MODULE_TIME", { group: "repairTime", element: "rudder" }],
            ["RUDDER_HALFTURN_TIME", { group: "rudder", element: "halfturnTime" }],
            ["SHIP_TURNING_SPEED", { group: "rudder", element: "turnSpeed" }],
        ]),
    },
    {
        ext: "sail",
        elements: new Map([
            ["MAST_THICKNESS", { group: "mast", element: "bottomThickness" }],
            ["REPAIR_MODULE_TIME", { group: "repairTime", element: "sails" }],
            ["SAIL_RISING_SPEED", { group: "sails", element: "risingSpeed" }],
            ["SAILING_CREW_REQUIRED", { group: "crew", element: "sailing" }],
            ["SHIP_MAX_SPEED", { group: "ship", element: "maxSpeed" }],
        ]),
    },
    {
        ext: "structure",
        elements: new Map([
            ["REPAIR_MODULE_TIME", { group: "repairTime", element: "structure" }],
        ]),
    },
];
let apiItems;
let ships;
let cannons;
const getItemNames = () => new Map(apiItems.map((item) => [item.Id, cleanName(item.Name)]));
const getShipMass = (id) => apiItems.find((apiItem) => id === apiItem.Id)?.ShipMass ?? 0;
const getSpeedDegrees = (specs) => {
    const calcPortSpeed = specs.MaxSpeed * speedConstA - speedConstB;
    const speedDegrees = specs.SpeedToWind.map((speed) => roundToThousands(speed * calcPortSpeed));
    const { length } = specs.SpeedToWind;
    for (let i = 1; i < (length - 1) * 2; i += 2) {
        speedDegrees.unshift(speedDegrees[i]);
    }
    speedDegrees.pop();
    return { calcPortSpeed, speedDegrees };
};
const convertGenericShipData = () => {
    const cannonLb = [0, 42, 32, 24, 18, 12, 9, 0, 6, 4, 3, 2];
    const carroLb = [0, 0, 68, 42, 32, 24, 0, 18, 12];
    const sideDeckMaxIndex = 3;
    const frontDeckIndex = sideDeckMaxIndex + 1;
    const backDeckIndex = frontDeckIndex + 1;
    const emptyDeck = { amount: 0, maxCannonLb: 0, maxCarroLb: 0 };
    const cannonData = new Map(cannons.long
        .filter((cannon) => !Number.isNaN(Number(cannon.name)))
        .map((cannon) => {
        return [Number(cannon.name), { weight: cannon.generic.weight.value, crew: cannon.generic.crew.value }];
    }));
    const carroData = new Map(cannons.carronade
        .filter((cannon) => !Number.isNaN(Number(cannon.name)))
        .map((cannon) => {
        return [Number(cannon.name), { weight: cannon.generic.weight.value, crew: cannon.generic.crew.value }];
    }));
    const shipsWith36lb = new Set([
        2229,
        2235,
        2318,
    ]);
    const shipsNotUsed = new Set([
        2352,
    ]);
    return apiItems.filter((item) => item.ItemType === "Ship" && !item.NotUsed && !shipsNotUsed.has(item.Id)).map((apiShip) => {
        const guns = {
            total: 0,
            decks: apiShip.Decks,
            broadside: { cannons: 0, carronades: 0 },
            gunsPerDeck: [],
            weight: { cannons: 0, carronades: 0 },
        };
        let totalCannonCrew = 0;
        let totalCarroCrew = 0;
        const { calcPortSpeed, speedDegrees } = getSpeedDegrees(apiShip.Specs);
        const addDeck = (deckLimit, index) => {
            if (deckLimit) {
                const gunsPerDeck = apiShip.GunsPerDeck[index];
                const currentDeck = {
                    amount: gunsPerDeck,
                    maxCannonLb: shipsWith36lb.has(apiShip.Id) && index === apiShip.Decks - 1
                        ? 36
                        : cannonLb[deckLimit.Limitation1.Min],
                    maxCarroLb: carroLb[deckLimit.Limitation2.Min],
                };
                guns.gunsPerDeck.push(currentDeck);
                const cannonWeight = Math.round(gunsPerDeck * (cannonData.get(currentDeck.maxCannonLb)?.weight ?? 0));
                const cannonCrew = gunsPerDeck * (cannonData.get(currentDeck.maxCannonLb)?.crew ?? 0);
                guns.weight.cannons += cannonWeight;
                totalCannonCrew += cannonCrew;
                if (currentDeck.maxCarroLb) {
                    guns.weight.carronades += Math.round(gunsPerDeck * (cannonData.get(currentDeck.maxCarroLb)?.weight ?? 0));
                    totalCarroCrew += gunsPerDeck * (carroData.get(currentDeck.maxCarroLb)?.crew ?? 0);
                }
                else {
                    guns.weight.carronades += cannonWeight;
                    totalCarroCrew += cannonCrew;
                }
            }
            else {
                guns.gunsPerDeck.push(emptyDeck);
            }
        };
        for (let deckIndex = 0; deckIndex <= sideDeckMaxIndex; deckIndex += 1) {
            addDeck(apiShip.DeckClassLimit[deckIndex], deckIndex);
            const gunsPerDeck = guns.gunsPerDeck[deckIndex].amount;
            const cannonBroadside = (gunsPerDeck * guns.gunsPerDeck[deckIndex].maxCannonLb) / 2;
            guns.total += gunsPerDeck;
            if (guns.gunsPerDeck[deckIndex].maxCarroLb) {
                guns.broadside.carronades += (gunsPerDeck * guns.gunsPerDeck[deckIndex].maxCarroLb) / 2;
            }
            else {
                guns.broadside.carronades += cannonBroadside;
            }
            guns.broadside.cannons += cannonBroadside;
        }
        addDeck(apiShip.FrontDeckClassLimit[0], frontDeckIndex);
        addDeck(apiShip.BackDeckClassLimit[0], backDeckIndex);
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
                sailing: 0,
                cannons: totalCannonCrew,
                carronades: totalCarroCrew,
            },
            speedDegrees,
            speed: {
                min: speedDegrees.reduce((a, b) => Math.min(a, b)),
                max: roundToThousands(calcPortSpeed),
            },
            sides: { armour: apiShip.HealthInfo.LeftArmor, thickness: 0 },
            bow: { armour: apiShip.HealthInfo.FrontArmor, thickness: 0 },
            stern: { armour: apiShip.HealthInfo.BackArmor, thickness: 0 },
            structure: { armour: apiShip.HealthInfo.InternalStructure },
            sails: { armour: apiShip.HealthInfo.Sails, risingSpeed: 0 },
            pump: { armour: apiShip.HealthInfo.Pump },
            rudder: {
                armour: apiShip.HealthInfo.Rudder,
                turnSpeed: 0,
                halfturnTime: 0,
                thickness: 0,
            },
            upgradeXP: apiShip.OverrideTotalXpForUpgradeSlots,
            repairTime: { stern: 120, bow: 120, sides: 120, rudder: 30, sails: 120, structure: 60 },
            ship: {
                waterlineHeight: 0,
                firezoneHorizontalWidth: 0,
                structureLeaksPerSecond: 0,
                deceleration: 0,
                acceleration: 0,
                turningAcceleration: 0,
                turningYardAcceleration: 0,
                maxSpeed: 0,
            },
            mast: {
                bottomArmour: 0,
                middleArmour: 0,
                topArmour: 0,
                bottomThickness: 0,
                middleThickness: 0,
                topThickness: 0,
            },
            premium: apiShip.Premium,
            tradeShip: apiShip.ShipType === 1,
        };
        if (ship.id === 1535) {
            ship.name = "Rookie Brig";
        }
        return ship;
    });
};
const baseFileNames = new Set();
const getBaseFileNames = (dir) => {
    for (const fileName of fs.readdirSync(dir)) {
        let str = fileName.slice(0, fileName.indexOf(" "));
        if (str === "rookie" || str === "trader" || str === "tutorial") {
            const shortenedFileName = fileName.replace("rookie ", "").replace("trader ", "").replace("tutorial ", "");
            const str2 = shortenedFileName.slice(0, shortenedFileName.indexOf(" "));
            str = str.concat(" ").concat(str2);
        }
        if (shipNames.has(str)) {
            baseFileNames.add(str);
        }
    }
    baseFileNames.add("basiccutter");
    baseFileNames.add("basiclynx");
    baseFileNames.add("indiaman rookie");
    baseFileNames.add("tutorial trader");
};
const getAdditionalData = (elements, fileData) => {
    const addData = {};
    for (const pair of fileData.Attributes.Pair) {
        const key = pair.Key._text;
        if (elements.has(key)) {
            const value = Number(pair.Value.Value._text);
            const { group, element } = elements.get(key);
            if (!addData[group]) {
                addData[group] = {};
            }
            addData[group][element] = value;
            if (key === "MAST_THICKNESS") {
                addData[group].middleThickness = value * middleMastThicknessRatio;
                addData[group].topThickness = value * topMastThicknessRatio;
            }
        }
    }
    return addData;
};
const addAdditionalData = (addData, id) => {
    ships
        .filter((ship) => ship.id === id)
        .forEach((ship) => {
        for (const [group, values] of Object.entries(addData)) {
            if (!ship[group]) {
                ship[group] = {};
            }
            for (const [element, value] of Object.entries(values)) {
                ship[group][element] = value;
            }
        }
    });
};
const getFileData = (baseFileName, ext) => {
    const fileName = path.resolve(commonPaths.dirModules, `${baseFileName} ${ext}.xml`);
    let data = {};
    if (fileExists(fileName)) {
        const fileXmlData = readTextFile(fileName);
        data = convert.xml2js(fileXmlData, { compact: true }).ModuleTemplate;
    }
    return data;
};
const getAndAddAdditionalData = (fileName, shipId) => {
    for (const file of subFileStructure) {
        const fileData = getFileData(fileName, file.ext);
        if (!isEmpty(fileData)) {
            const additionalData = getAdditionalData(file.elements, fileData);
            addAdditionalData(additionalData, shipId);
        }
    }
};
const convertAddShipData = (ships) => {
    getBaseFileNames(commonPaths.dirModules);
    for (const baseFileName of baseFileNames) {
        const shipId = getShipId(baseFileName);
        const masterBaseFileName = getShipMaster(baseFileName);
        if (masterBaseFileName !== []) {
            for (const master of masterBaseFileName) {
                getAndAddAdditionalData(master, shipId);
            }
        }
        getAndAddAdditionalData(baseFileName, shipId);
    }
    return ships;
};
const convertShipBlueprints = async () => {
    const itemNames = getItemNames();
    const blueprintsNotUsed = new Set([
        665,
        746,
        1558,
        1718,
        1719,
        1720,
        1721,
        2031,
        2213,
        2228,
        2236,
        2239,
        2320,
        2381,
        2382,
    ]);
    const apiBlueprints = apiItems.filter((apiItem) => apiItem.ItemType === "RecipeShip" && !blueprintsNotUsed.has(apiItem.Id));
    const shipBlueprints = apiBlueprints
        .map((apiBlueprint) => {
        const shipMass = getShipMass(apiBlueprint.Results[0].Template);
        return {
            id: apiBlueprint.Id,
            name: cleanName(apiBlueprint.Name).replace(" Blueprint", ""),
            wood: [
                { name: "Frame", amount: apiBlueprint.WoodTypeDescs[0].Requirements[0].Amount },
                { name: "Crew Space", amount: Math.round(shipMass * crewSpaceRatio + 0.5) },
            ],
            resources: apiBlueprint.FullRequirements.filter((requirement) => !((itemNames.get(requirement.Template)?.endsWith(" Permit") ??
                itemNames.get(requirement.Template) === "Doubloons") ||
                itemNames.get(requirement.Template) === "Provisions")).map((requirement) => ({
                name: itemNames.get(requirement.Template)?.replace(" Log", ""),
                amount: requirement.Amount,
            })),
            provisions: (apiBlueprint.FullRequirements.find((requirement) => itemNames.get(requirement.Template) === "Provisions") ?? {}).Amount ?? 0,
            price: apiBlueprint.GoldRequirements,
            permit: (apiBlueprint.FullRequirements.find((requirement) => itemNames.get(requirement.Template)?.endsWith(" Permit")) ?? {}).Amount ?? 0,
            ship: {
                id: apiBlueprint.Results[0].Template,
                name: itemNames.get(apiBlueprint.Results[0].Template),
                mass: shipMass,
            },
            shipyardLevel: apiBlueprint.BuildingRequirements[0].Level + 1,
            craftLevel: apiBlueprint.RequiresLevel,
            craftXP: apiBlueprint.GivesXP,
            labourHours: apiBlueprint.LaborPrice,
        };
    })
        .sort(sortBy(["id"]));
    await saveJsonAsync(commonPaths.fileShipBlueprint, shipBlueprints);
};
const convertShips = async () => {
    ships = convertGenericShipData();
    ships = convertAddShipData(ships);
    ships.sort(sortBy(["id"]));
    await saveJsonAsync(commonPaths.fileShip, ships);
};
export const convertShipData = async () => {
    apiItems = readJson(path.resolve(baseAPIFilename, `${serverNames[0]}-ItemTemplates-${serverDate}.json`));
    cannons = readJson(commonPaths.fileCannon);
    await convertShips();
    await convertShipBlueprints();
};
//# sourceMappingURL=convert-ship-data.js.map