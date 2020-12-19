/*!
 * This file is part of na-map.
 *
 * @file      Cannon data.
 * @module    convert-cannons
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import * as fs from "fs";
import path from "path";
import convert from "xml-js";
import { commonPaths } from "../common/common-dir";
import { readTextFile, saveJsonAsync } from "../common/common-file";
import { round } from "../common/common-math";
import { cannonEntityType, cannonType, peneDistance } from "../common/common";
const countDecimals = (value) => {
    if (value === undefined) {
        return 0;
    }
    if (Math.floor(value) === value) {
        return 0;
    }
    return value.toString().split(".")[1].length ?? 0;
};
const getFileData = (baseFileName) => {
    const fileName = path.resolve(commonPaths.dirModules, baseFileName);
    const fileXmlData = readTextFile(fileName);
    return convert.xml2js(fileXmlData, { compact: true }).ModuleTemplate;
};
const fileNames = new Set();
const getBaseFileNames = (directory) => {
    for (const fileName of fs.readdirSync(directory)) {
        const fileNameFirstPart = fileName.slice(0, fileName.indexOf(" "));
        if ((fileNameFirstPart === "cannon" && fileName !== "cannon repair kit.xml") ||
            fileNameFirstPart === "carronade" ||
            fileName.startsWith("tower cannon")) {
            fileNames.add(fileName);
        }
    }
};
const dataMapping = new Map([
    ["CANNON_BASIC_DAMAGE", { group: "damage", element: "basic" }],
    ["CANNON_RELOAD_TIME", { group: "damage", element: "reload time" }],
    ["CANNON_MASS", { group: "generic", element: "weight" }],
    ["CANNON_BASIC_PENETRATION", { group: "damage", element: "penetration" }],
    ["CANNON_CREW_REQUIRED", { group: "generic", element: "crew" }],
    ["CANNON_BALL_ARMOR_SPLINTERS_DAMAGE_FOR_CREW", { group: "damage", element: "splinter" }],
]);
const cannons = {};
for (const type of cannonType) {
    cannons[type] = [];
}
const defenseFamily = new Set(["fort", "tower"]);
const getFamily = (name) => {
    const regex = /\((.+)\)/;
    let family = regex.exec(name)?.[1].toLocaleLowerCase() ?? "regular";
    if (defenseFamily.has(family)) {
        family = "defense";
    }
    return family;
};
const addData = (fileData) => {
    const getType = () => {
        if (fileData._attributes.Name.includes("Carronade")) {
            return "carronade";
        }
        if (fileData._attributes.Name.includes("Long")) {
            return "long";
        }
        return "medium";
    };
    const getName = () => fileData._attributes.Name.replace("Cannon ", "")
        .replace("Carronade ", "")
        .replace(" pd", "")
        .replace(" Long", "")
        .replace("Salvaged ", "")
        .replace("0.5 E", "E")
        .replace(/^(\d+) - (.+)$/g, "$1 ($2)")
        .replace(/^Tower (\d+)$/g, "$1 (Tower)")
        .replace("Blomfield", "Blomefield")
        .replace(" Gun", "")
        .replace("24 (Edinorog)", "18 (Edinorog)");
    const cannon = {};
    for (const [value, { group, element }] of dataMapping) {
        if (!cannon[group]) {
            cannon[group] = {};
        }
        cannon[group][element] = {
            value: Number(fileData.Attributes.Pair.find((pair) => pair.Key._text === value)?.Value.Value._text ??
                0),
        };
    }
    const penetrations = new Map(fileData.Attributes.Pair.find((pair) => pair.Key._text === "CANNON_PENETRATION_DEGRADATION")?.Value
        .Value.map((penetration) => [
        Number(penetration.Time._text) * 1000,
        Number(penetration.Value._text),
    ]));
    penetrations.set(50, ((penetrations.get(0) ?? 0) + (penetrations.get(100) ?? 0)) / 2);
    penetrations.set(750, (penetrations.get(800) ?? 0) + ((penetrations.get(600) ?? 0) - (penetrations.get(800) ?? 0)) * 0.25);
    penetrations.set(1250, ((penetrations.get(1200) ?? 0) + (penetrations.get(1300) ?? 0)) / 2);
    cannon.penetration = {};
    for (const distance of peneDistance) {
        cannon.penetration[distance] = {
            value: Math.trunc((penetrations.get(distance) ?? 0) * (cannon.damage.penetration?.value ?? 0)),
        };
    }
    delete cannon.damage.penetration;
    cannon.damage["per second"] = {
        value: round(cannon.damage.basic.value / cannon.damage["reload time"].value, 2),
    };
    cannon.name = getName();
    cannon.family = getFamily(cannon.name);
    if (cannon.family !== "unicorn") {
        cannons[getType()].push(cannon);
    }
};
export const convertCannons = async () => {
    getBaseFileNames(commonPaths.dirModules);
    for (const baseFileName of [...fileNames]) {
        const fileData = getFileData(baseFileName);
        addData(fileData);
    }
    const maxDigits = new Map();
    for (const type of cannonType) {
        for (const cannon of cannons[type]) {
            for (const group of cannonEntityType) {
                for (const [elementKey, elementValue] of Object.entries(cannon[group])) {
                    maxDigits.set([type, group, elementKey], Math.max(maxDigits.get([type, group, elementKey]) ?? 0, countDecimals(elementValue?.value)));
                }
            }
        }
    }
    for (const [key, value] of maxDigits) {
        if (value > 0) {
            for (const cannon of cannons[key[0]]) {
                cannon[key[1]][key[2]].digits = value;
            }
        }
    }
    for (const type of cannonType) {
        cannons[type].sort(({ name: a }, { name: b }) => {
            if (Number.parseInt(a, 10) !== Number.parseInt(b, 10)) {
                return Number.parseInt(a, 10) - Number.parseInt(b, 10);
            }
            return a.localeCompare(b);
        });
    }
    await saveJsonAsync(commonPaths.fileCannon, cannons);
};
//# sourceMappingURL=convert-cannons.js.map