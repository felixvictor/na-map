/*!
 * This file is part of na-map.
 *
 * @file      Convert port ownership.
 * @module    convert-ownership
 * @author    iB aka Felix Victor
 * @copyright 2018, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import * as fs from "fs";
import * as path from "path";
import d3Collection from "d3-collection";
import d3Array from "d3-array";
const { nest: d3Nest } = d3Collection;
const { ascending: d3Ascending } = d3Array;
import { default as lzma } from "lzma-native";
import { default as readDirRecursive } from "recursive-readdir";
import { capitalToCounty, nations } from "../common/common";
import { commonPaths } from "../common/common-dir";
import { saveJsonAsync } from "../common/common-file";
import { serverNames } from "../common/common-var";
import { cleanName } from "../common/common-node";
const fileExtension = ".json.xz";
const decompress = (compressedContent) => {
    return lzma.decompress(compressedContent, {}, (decompressedContent, error) => {
        if (error) {
            throw new Error(error);
        }
        return decompressedContent;
    });
};
const readFileContent = async (fileName) => {
    return new Promise((resolve, reject) => {
        fs.readFile(fileName, (error, data) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(data);
            }
        });
    });
};
const sortFileNames = (fileNames) => {
    return fileNames.sort((a, b) => {
        const ba = path.basename(a);
        const bb = path.basename(b);
        if (ba < bb) {
            return -1;
        }
        if (ba > bb) {
            return 1;
        }
        return 0;
    });
};
function convertOwnership() {
    const ports = new Map();
    const numPortsDates = [];
    const fileBaseNameRegex = new RegExp(`${serverNames[0]}-Ports-(20\\d{2}-\\d{2}-\\d{2})${fileExtension}`);
    function parseData(portData, date) {
        const numPorts = {};
        nations
            .filter((nation) => nation.id !== 9)
            .forEach((nation) => {
            numPorts[nation.short] = 0;
        });
        for (const port of portData) {
            const getObject = () => ({
                timeRange: [new Date(date), new Date(date)],
                val: nations[port.Nation].short,
            });
            const initData = () => {
                var _a;
                ports.set(port.Id, {
                    name: cleanName(port.Name),
                    region: port.Location,
                    county: (_a = capitalToCounty.get(port.CountyCapitalName)) !== null && _a !== void 0 ? _a : "",
                    data: [getObject()],
                });
            };
            const getPreviousNation = () => {
                var _a;
                const portData = ports.get(port.Id);
                if (portData) {
                    const index = (_a = portData.data.length - 1) !== null && _a !== void 0 ? _a : 0;
                    return portData.data[index].val;
                }
                return "";
            };
            const setNewNation = () => {
                const portData = ports.get(port.Id);
                if (portData) {
                    portData.data.push(getObject());
                    ports.set(port.Id, portData);
                }
            };
            const setNewEndDate = () => {
                const portData = ports.get(port.Id);
                if (portData) {
                    portData.data[portData.data.length - 1].timeRange[1] = new Date(date);
                    ports.set(port.Id, portData);
                }
            };
            if (port.Nation !== 9) {
                const currentNation = nations[port.Nation].short;
                numPorts[currentNation] = Number(numPorts[currentNation]) + 1;
                if (ports.get(port.Id)) {
                    const oldNation = getPreviousNation();
                    if (currentNation === oldNation) {
                        setNewEndDate();
                    }
                    else {
                        setNewNation();
                    }
                }
                else {
                    initData();
                }
            }
        }
        const numPortsDate = {};
        numPortsDate.date = date;
        nations
            .filter((nation) => nation.id !== 9)
            .forEach((nation) => {
            numPortsDate[nation.short] = numPorts[nation.short];
        });
        numPortsDates.push(numPortsDate);
    }
    const processFiles = async (fileNames) => {
        return fileNames.reduce(async (sequence, fileName) => sequence
            .then(async () => readFileContent(fileName))
            .then((compressedContent) => decompress(compressedContent))
            .then((decompressedContent) => {
            var _a;
            if (decompressedContent) {
                const currentDate = ((_a = fileBaseNameRegex.exec(path.basename(fileName))) !== null && _a !== void 0 ? _a : [])[1];
                parseData(JSON.parse(decompressedContent.toString()), currentDate);
            }
        })
            .catch((error) => {
            throw new Error(error);
        }), Promise.resolve());
    };
    const ignoreFileName = (fileName, stats) => {
        return !stats.isDirectory() && fileBaseNameRegex.exec(path.basename(fileName)) === null;
    };
    const writeResult = async () => {
        const portsArray = [...ports.entries()].map(([key, value]) => {
            value.id = key;
            return value;
        });
        const nested = d3Nest()
            .key((d) => d.region)
            .sortKeys(d3Ascending)
            .key((d) => d.county)
            .sortKeys(d3Ascending)
            .entries(portsArray);
        const result = nested.map((region) => {
            const newRegion = {};
            newRegion.region = region.key;
            newRegion.data = region.values.map((county) => {
                const group = {};
                group.group = county.key;
                group.data = county.values.map((port) => {
                    const label = {};
                    label.label = port.name;
                    label.data = port.data;
                    return label;
                });
                return group;
            });
            return newRegion;
        });
        await saveJsonAsync(commonPaths.fileOwnership, result);
        await saveJsonAsync(commonPaths.fileNation, numPortsDates);
    };
    readDirRecursive(commonPaths.dirAPI, [ignoreFileName])
        .then((fileNames) => sortFileNames(fileNames))
        .then(async (fileNames) => processFiles(fileNames))
        .then(async () => writeResult())
        .catch((error) => {
        throw new Error(error);
    });
}
export const convertOwnershipData = () => {
    convertOwnership();
};
//# sourceMappingURL=convert-ownership.js.map