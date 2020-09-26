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
import path from "path";
import d3Array from "d3-array";
const { group: d3Group } = d3Array;
import dayjs from "dayjs";
import { default as lzma } from "lzma-native";
import { default as readDirRecursive } from "recursive-readdir";
import { capitalToCounty, nations } from "../common/common";
import { commonPaths } from "../common/common-dir";
import { saveJsonAsync } from "../common/common-file";
import { cleanName, sortBy } from "../common/common-node";
import { serverNames } from "../common/servers";
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
const getDate = (date) => dayjs(date).format("YYYY-MM-YY");
const convertOwnership = () => {
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
            const getObject = () => {
                const dateF = getDate(date);
                return {
                    timeRange: [dateF, dateF],
                    val: nations[port.Nation].short,
                };
            };
            const initData = () => {
                ports.set(port.Id, {
                    name: cleanName(port.Name),
                    region: port.Location,
                    county: capitalToCounty.get(port.CountyCapitalName) ?? "",
                    data: [getObject()],
                });
            };
            const getPreviousNation = () => {
                const portData = ports.get(port.Id);
                if (portData) {
                    const index = portData.data.length - 1 ?? 0;
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
                    portData.data[portData.data.length - 1].timeRange[1] = getDate(date);
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
            if (decompressedContent) {
                const currentDate = (fileBaseNameRegex.exec(path.basename(fileName)) ?? [])[1];
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
        const groups = d3Group([...ports.values()], (d) => d.region, (d) => d.county);
        const grouped = [...groups]
            .map(([regionKey, regionValue]) => ({
            region: regionKey,
            data: [...regionValue]
                .map(([countyKey, countyValue]) => ({
                group: countyKey,
                data: countyValue
                    .map((port) => {
                    return {
                        label: port.name,
                        data: port.data,
                    };
                })
                    .sort(sortBy(["label"])),
            }))
                .sort(sortBy(["group"])),
        }))
            .sort(sortBy(["region"]));
        await saveJsonAsync(commonPaths.fileOwnership, grouped);
        await saveJsonAsync(commonPaths.fileNation, numPortsDates);
    };
    readDirRecursive(commonPaths.dirAPI, [ignoreFileName])
        .then((fileNames) => sortFileNames(fileNames))
        .then(async (fileNames) => processFiles(fileNames))
        .then(async () => writeResult())
        .catch((error) => {
        throw new Error(error);
    });
};
export const convertOwnershipData = () => {
    convertOwnership();
};
//# sourceMappingURL=convert-ownership.js.map