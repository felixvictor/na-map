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
import * as path from "path";
import convert from "xml-js";
import { commonPaths } from "../common/common-dir";
import { readTextFile, saveJsonAsync } from "../common/common-file";
import { round } from "../common/common-math";
const peneDistances = [50, 100, 250, 500, 750, 1000];
const cannonTypes = ["medium", "long", "carronade"];
const countDecimals = (value) => {
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
    ["CANNON_MIN_ANGLE", { group: "traverse", element: "up" }],
    ["CANNON_MAX_ANGLE", { group: "traverse", element: "down" }],
    ["CANNON_DISPERSION_PER100M", { group: "dispersion", element: "horizontal" }],
    ["CANNON_DISPERSION_VERTICAL_PER100M", { group: "dispersion", element: "vertical" }],
    ["CANNON_RELOAD_TIME", { group: "damage", element: "reload time" }],
    ["CANNON_MASS", { group: "generic", element: "weight" }],
    ["CANNON_BASIC_PENETRATION", { group: "damage", element: "penetration" }],
    ["CANNON_CREW_REQUIRED", { group: "generic", element: "crew" }],
    ["CANNON_BALL_ARMOR_SPLINTERS_DAMAGE_FOR_CREW", { group: "damage", element: "splinter" }]
]);
const cannons = {};
for (const type of cannonTypes) {
    cannons[type] = [];
}
const addData = (fileData) => {
    let type = "medium";
    if (fileData._attributes.Name.includes("Carronade")) {
        type = "carronade";
    }
    else if (fileData._attributes.Name.includes("Long")) {
        type = "long";
    }
    const name = fileData._attributes.Name.replace("Cannon ", "")
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
    const cannon = {
        name
    };
    for (const [value, { group, element }] of dataMapping) {
        if (!cannon[group]) {
            cannon[group] = {};
        }
        cannon[group][element] = {
            value: Number(fileData.Attributes.Pair.find(pair => pair.Key._text === value)?.Value.Value._text ?? 0),
            digits: 0
        };
    }
    const penetrations = new Map(fileData.Attributes.Pair.find((pair) => pair.Key._text === "CANNON_PENETRATION_DEGRADATION")?.Value
        .Value
        .filter(penetration => Number(penetration.Time._text) > 0)
        .map(penetration => [Number(penetration.Time._text) * 1000, Number(penetration.Value._text)]));
    penetrations.set(250, ((penetrations.get(200) ?? 0) + (penetrations.get(300) ?? 0)) / 2);
    penetrations.set(500, ((penetrations.get(400) ?? 0) + (penetrations.get(600) ?? 0)) / 2);
    penetrations.set(750, (penetrations.get(800) ?? 0) + ((penetrations.get(600) ?? 0) - (penetrations.get(800) ?? 0)) * 0.25);
    cannon["penetration"] = {};
    for (const distance of peneDistances) {
        cannon["penetration"][distance] = {
            value: Math.trunc((penetrations.get(distance) ?? 0) * (cannon.damage.penetration?.value ?? 0)),
            digits: 0
        };
    }
    delete cannon.damage.penetration;
    cannon.damage["per second"] = {
        value: round(cannon.damage.basic.value / cannon.damage["reload time"].value, 2),
        digits: 0
    };
    cannons[type].push(cannon);
};
export const convertCannons = async () => {
    getBaseFileNames(commonPaths.dirModules);
    for (const baseFileName of [...fileNames]) {
        const fileData = getFileData(baseFileName);
        addData(fileData);
    }
    const maxDigits = {};
    for (const type of cannonTypes) {
        maxDigits[type] = {};
        for (const cannon of cannons[type]) {
            for (const [groupKey, groupValue] of Object.entries(cannon)) {
                if (typeof groupValue === "object") {
                    if (!maxDigits[type][groupKey]) {
                        maxDigits[type][groupKey] = {};
                    }
                    for (const [elementKey, elementValue] of Object.entries(groupValue)) {
                        maxDigits[type][groupKey][elementKey] = Math.max(maxDigits[type][groupKey][elementKey] ?? 0, countDecimals(elementValue.value));
                    }
                }
            }
        }
    }
    for (const type of cannonTypes) {
        for (const cannon of cannons[type]) {
            for (const [groupKey, groupValue] of Object.entries(cannon)) {
                if (typeof groupValue === "object") {
                    for (const [elementKey] of Object.entries(groupValue)) {
                        cannon[groupKey][elementKey].digits = maxDigits[type][groupKey][elementKey];
                    }
                }
            }
        }
        cannons[type].sort(({ name: a }, { name: b }) => {
            if (parseInt(a, 10) !== parseInt(b, 10)) {
                return parseInt(a, 10) - parseInt(b, 10);
            }
            return a.localeCompare(b);
        });
    }
    await saveJsonAsync(commonPaths.fileCannon, cannons);
};
//# sourceMappingURL=convert-cannons.js.map