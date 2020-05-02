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
import { cannonEntityType, cannonType } from "../common/common";
const peneDistances = [50, 100, 250, 500, 750, 1000];
const countDecimals = (value) => {
    var _a;
    if (value === undefined) {
        return 0;
    }
    if (Math.floor(value) === value) {
        return 0;
    }
    return (_a = value.toString().split(".")[1].length) !== null && _a !== void 0 ? _a : 0;
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
    ["CANNON_BALL_ARMOR_SPLINTERS_DAMAGE_FOR_CREW", { group: "damage", element: "splinter" }],
]);
const cannons = {};
for (const type of cannonType) {
    cannons[type] = [];
}
const addData = (fileData) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
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
        name,
    };
    for (const [value, { group, element }] of dataMapping) {
        if (!cannon[group]) {
            cannon[group] = {};
        }
        cannon[group][element] = {
            value: Number((_b = ((_a = fileData.Attributes.Pair.find((pair) => pair.Key._text === value)) === null || _a === void 0 ? void 0 : _a.Value.Value)._text) !== null && _b !== void 0 ? _b : 0),
            digits: 0,
        };
    }
    const penetrations = new Map(((_c = fileData.Attributes.Pair.find((pair) => pair.Key._text === "CANNON_PENETRATION_DEGRADATION")) === null || _c === void 0 ? void 0 : _c.Value.Value)
        .filter((penetration) => Number(penetration.Time._text) > 0)
        .map((penetration) => [Number(penetration.Time._text) * 1000, Number(penetration.Value._text)]));
    penetrations.set(250, (((_d = penetrations.get(200)) !== null && _d !== void 0 ? _d : 0) + ((_e = penetrations.get(300)) !== null && _e !== void 0 ? _e : 0)) / 2);
    penetrations.set(500, (((_f = penetrations.get(400)) !== null && _f !== void 0 ? _f : 0) + ((_g = penetrations.get(600)) !== null && _g !== void 0 ? _g : 0)) / 2);
    penetrations.set(750, ((_h = penetrations.get(800)) !== null && _h !== void 0 ? _h : 0) + (((_j = penetrations.get(600)) !== null && _j !== void 0 ? _j : 0) - ((_k = penetrations.get(800)) !== null && _k !== void 0 ? _k : 0)) * 0.25);
    cannon.penetration = {};
    for (const distance of peneDistances) {
        cannon.penetration[distance] = {
            value: Math.trunc(((_l = penetrations.get(distance)) !== null && _l !== void 0 ? _l : 0) * ((_o = (_m = cannon.damage.penetration) === null || _m === void 0 ? void 0 : _m.value) !== null && _o !== void 0 ? _o : 0)),
            digits: 0,
        };
    }
    delete cannon.damage.penetration;
    cannon.damage["per second"] = {
        value: round(cannon.damage.basic.value / cannon.damage["reload time"].value, 2),
        digits: 0,
    };
    cannons[type].push(cannon);
};
export const convertCannons = async () => {
    var _a;
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
                    maxDigits.set([type, group, elementKey], Math.max((_a = maxDigits.get([type, group, elementKey])) !== null && _a !== void 0 ? _a : 0, countDecimals(elementValue === null || elementValue === void 0 ? void 0 : elementValue.value)));
                }
            }
        }
    }
    for (const [key, value] of maxDigits) {
        for (const cannon of cannons[key[0]]) {
            cannon[key[1]][key[2]].digits = value;
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