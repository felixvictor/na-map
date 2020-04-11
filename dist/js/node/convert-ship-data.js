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
import mergeAdvanced from "object-merge-advanced";
import convert from "xml-js";
import { isEmpty } from "../common/common";
import { baseAPIFilename, commonPaths, serverStartDate as serverDate } from "../common/common-dir";
import { fileExists, readJson, readTextFile, saveJsonAsync } from "../common/common-file";
import { roundToThousands, speedConstA, speedConstB } from "../common/common-math";
import { cleanName, sortBy } from "../common/common-node";
import { serverNames } from "../common/common-var";
const middleMastThicknessRatio = 0.75;
const topMastThicknessRatio = 0.5;
const plankingRatio = 0.13;
const crewSpaceRatio = 0.025;
const shipNames = new Map([
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
]);
const getShipId = (baseFileName) => { var _a, _b; return (_b = (_a = shipNames.get(baseFileName)) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : 0; };
const getShipMaster = (baseFileName) => { var _a, _b; return (_b = (_a = shipNames.get(baseFileName)) === null || _a === void 0 ? void 0 : _a.master) !== null && _b !== void 0 ? _b : ""; };
const subFileStructure = [
    {
        ext: "b armor",
        elements: new Map([
            ["ARMOR_THICKNESS", { group: "stern", element: "thickness" }],
            ["REPAIR_MODULE_TIME", { group: "repairTime", element: "stern" }]
        ])
    },
    {
        ext: "f armor",
        elements: new Map([
            ["ARMOR_THICKNESS", { group: "bow", element: "thickness" }],
            ["REPAIR_MODULE_TIME", { group: "repairTime", element: "bow" }]
        ])
    },
    {
        ext: "l armor",
        elements: new Map([
            ["ARMOR_THICKNESS", { group: "sides", element: "thickness" }],
            ["REPAIR_MODULE_TIME", { group: "repairTime", element: "sides" }]
        ])
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
            ["SHIP_WATERLINE_HEIGHT", { group: "ship", element: "waterlineHeight" }]
        ])
    },
    {
        ext: "mast",
        elements: new Map([
            ["MAST_BOTTOM_SECTION_HP", { group: "mast", element: "bottomArmour" }],
            ["MAST_MIDDLE_SECTION_HP", { group: "mast", element: "middleArmour" }],
            ["MAST_TOP_SECTION_HP", { group: "mast", element: "topArmour" }]
        ])
    },
    {
        ext: "rudder",
        elements: new Map([
            ["ARMOR_THICKNESS", { group: "rudder", element: "thickness" }],
            ["REPAIR_MODULE_TIME", { group: "repairTime", element: "rudder" }],
            ["RUDDER_HALFTURN_TIME", { group: "rudder", element: "halfturnTime" }],
            ["SHIP_TURNING_SPEED", { group: "rudder", element: "turnSpeed" }]
        ])
    },
    {
        ext: "sail",
        elements: new Map([
            ["MAST_THICKNESS", { group: "mast", element: "bottomThickness" }],
            ["REPAIR_MODULE_TIME", { group: "repairTime", element: "sails" }],
            ["SAIL_RISING_SPEED", { group: "sails", element: "risingSpeed" }],
            ["SAILING_CREW_REQUIRED", { group: "crew", element: "sailing" }],
            ["SHIP_MAX_SPEED", { group: "ship", element: "maxSpeed" }]
        ])
    },
    {
        ext: "structure",
        elements: new Map([
            ["REPAIR_MODULE_TIME", { group: "repairTime", element: "structure" }]
        ])
    }
];
let apiItems;
let ships;
const getItemNames = () => new Map(apiItems.map(item => [item.Id, cleanName(item.Name)]));
const getShipMass = (id) => { var _a, _b; return (_b = (_a = apiItems.find(apiItem => id === apiItem.Id)) === null || _a === void 0 ? void 0 : _a.ShipMass) !== null && _b !== void 0 ? _b : 0; };
const convertGenericShipData = () => {
    const cannonWeight = [0, 42, 32, 24, 18, 12, 9, 0, 6, 4, 3, 2];
    const carroWeight = [0, 0, 68, 42, 32, 24, 0, 18, 12];
    return apiItems.filter(item => item.ItemType === "Ship" && !item.NotUsed).map((ship) => {
        const calcPortSpeed = ship.Specs.MaxSpeed * speedConstA - speedConstB;
        const speedDegrees = ship.Specs.SpeedToWind.map(speed => roundToThousands(speed * calcPortSpeed));
        const { length } = ship.Specs.SpeedToWind;
        for (let i = 1; i < (length - 1) * 2; i += 2) {
            speedDegrees.unshift(speedDegrees[i]);
        }
        speedDegrees.pop();
        const deckClassLimit = ship.DeckClassLimit.map(deck => [
            cannonWeight[deck.Limitation1.Min],
            carroWeight[deck.Limitation2.Min]
        ]);
        const gunsPerDeck = ship.GunsPerDeck;
        gunsPerDeck.pop();
        let guns = 0;
        let cannonBroadside = 0;
        let carronadesBroadside = 0;
        const emptyDeck = [0, 0];
        for (let i = 0; i < 4; i += 1) {
            if (deckClassLimit[i]) {
                guns += gunsPerDeck[i];
                if (deckClassLimit[i][1]) {
                    carronadesBroadside += (gunsPerDeck[i] * deckClassLimit[i][1]) / 2;
                }
                else {
                    carronadesBroadside += (gunsPerDeck[i] * deckClassLimit[i][0]) / 2;
                }
                cannonBroadside += (gunsPerDeck[i] * deckClassLimit[i][0]) / 2;
            }
            else {
                deckClassLimit.push(emptyDeck);
            }
        }
        const broadside = { cannons: cannonBroadside, carronades: carronadesBroadside };
        const frontDeck = ship.FrontDecks
            ? ship.FrontDeckClassLimit.map(deck => [
                cannonWeight[deck.Limitation1.Min],
                carroWeight[deck.Limitation2.Min]
            ])[0]
            : emptyDeck;
        deckClassLimit.push(frontDeck);
        const backDeck = ship.BackDecks
            ? ship.BackDeckClassLimit.map(deck => [
                cannonWeight[deck.Limitation1.Min],
                carroWeight[deck.Limitation2.Min]
            ])[0]
            : emptyDeck;
        deckClassLimit.push(backDeck);
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
        };
    });
};
const baseFileNames = new Set();
const getBaseFileNames = (dir) => {
    for (const fileName of fs.readdirSync(dir)) {
        let str = fileName.slice(0, fileName.indexOf(" "));
        if (str === "rookie" || str === "trader") {
            const shortenedFileName = fileName.replace("rookie ", "").replace("trader ", "");
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
};
const getAddData = (elements, fileData) => {
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
const addAddData = (addData, id) => {
    ships
        .filter(ship => ship.id === id)
        .forEach(ship => {
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
const convertAddShipData = (ships) => {
    getBaseFileNames(commonPaths.dirModules);
    for (const baseFileName of baseFileNames) {
        if (!getShipMaster(baseFileName)) {
            const id = getShipId(baseFileName);
            for (const file of subFileStructure) {
                const fileData = getFileData(baseFileName, file.ext);
                const addData = getAddData(file.elements, fileData);
                addAddData(addData, id);
            }
        }
    }
    for (const baseFileName of baseFileNames) {
        if (getShipMaster(baseFileName)) {
            const id = getShipId(baseFileName);
            const masterBaseFileName = getShipMaster(baseFileName);
            for (const file of subFileStructure) {
                const fileData = getFileData(baseFileName, file.ext);
                const fileMasterData = getFileData(masterBaseFileName, file.ext);
                const addData = isEmpty(fileData) ? {} : getAddData(file.elements, fileData);
                const addMasterData = getAddData(file.elements, fileMasterData);
                const mergedData = mergeAdvanced(addMasterData, addData);
                addAddData(mergedData, id);
            }
        }
    }
    return ships;
};
const convertShipBlueprints = async () => {
    const itemNames = getItemNames();
    const shipBlueprints = apiItems.filter(apiItem => !apiItem.NotUsed && apiItem.ItemType === "RecipeShip")
        .map(apiBlueprint => {
        var _a, _b, _c, _d, _e, _f;
        const shipMass = getShipMass(apiBlueprint.Results[0].Template);
        return {
            id: apiBlueprint.Id,
            name: cleanName(apiBlueprint.Name).replace(" Blueprint", ""),
            wood: [
                { name: "Frame", amount: apiBlueprint.WoodTypeDescs[0].Requirements[0].Amount },
                { name: "Planking", amount: Math.round(shipMass * plankingRatio) },
                { name: "Crew Space", amount: Math.round(shipMass * crewSpaceRatio) }
            ],
            resources: apiBlueprint.FullRequirements.filter(requirement => {
                var _a, _b;
                return !(((_b = (_a = itemNames.get(requirement.Template)) === null || _a === void 0 ? void 0 : _a.endsWith(" Permit")) !== null && _b !== void 0 ? _b : itemNames.get(requirement.Template) === "Doubloons") ||
                    itemNames.get(requirement.Template) === "Provisions");
            }).map(requirement => {
                var _a;
                return ({
                    name: (_a = itemNames.get(requirement.Template)) === null || _a === void 0 ? void 0 : _a.replace(" Log", ""),
                    amount: requirement.Amount
                });
            }),
            provisions: (_b = ((_a = apiBlueprint.FullRequirements.find(requirement => itemNames.get(requirement.Template) === "Provisions")) !== null && _a !== void 0 ? _a : {}).Amount) !== null && _b !== void 0 ? _b : 0,
            doubloons: (_d = ((_c = apiBlueprint.FullRequirements.find(requirement => itemNames.get(requirement.Template) === "Doubloons")) !== null && _c !== void 0 ? _c : {}).Amount) !== null && _d !== void 0 ? _d : 0,
            permit: (_f = ((_e = apiBlueprint.FullRequirements.find(requirement => { var _a; return (_a = itemNames.get(requirement.Template)) === null || _a === void 0 ? void 0 : _a.endsWith(" Permit"); })) !== null && _e !== void 0 ? _e : {}).Amount) !== null && _f !== void 0 ? _f : 0,
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
        .sort(sortBy(["id"]));
    await saveJsonAsync(commonPaths.fileShipBlueprint, shipBlueprints);
};
const convertShips = async () => {
    ships = convertGenericShipData();
    ships = convertAddShipData(ships);
    ships.sort(sortBy(["class", "name"]));
    await saveJsonAsync(commonPaths.fileShip, ships);
};
export const convertShipData = async () => {
    apiItems = readJson(path.resolve(baseAPIFilename, `${serverNames[0]}-ItemTemplates-${serverDate}.json`));
    await convertShips();
    await convertShipBlueprints();
};
//# sourceMappingURL=convert-ship-data.js.map