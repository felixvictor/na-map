/*!
 * This file is part of na-map.
 *
 * @file      Convert port ownership.
 * @module    convert-ownership
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import * as fs from "fs";
import path from "path";
import { group as d3Group } from "d3-array";
import { default as lzma } from "lzma-native";
import { default as readDirRecursive } from "recursive-readdir";
import { capitalToCounty, nations, sortBy } from "../common/common";
import { getCommonPaths } from "../common/common-dir";
import { saveJsonAsync } from "../common/common-file";
import { cleanName } from "../common/common-node";
import { serverIds } from "../common/servers";
const commonPaths = getCommonPaths();
const fileExtension = ".json.xz";
const ports = {};
const portOwnershipPerDate = {};
const numPortsDates = {};
let serverId;
const fileBaseNameRegex = {};
const fileNames = {};
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
const getDate = (date) => new Date(date).getTime();
function parseData(serverId, portData, date) {
    const numPorts = {};
    for (const nation of nations.filter((nation) => nation.id !== 9)) {
        numPorts[nation.short] = 0;
    }
    const nationsForPowerMap = [];
    for (const port of portData) {
        const getObject = () => {
            const dateF = getDate(date);
            return {
                timeRange: [dateF, dateF],
                val: nations[port.Nation].short,
            };
        };
        const initData = () => {
            ports[serverId].set(port.Id, {
                name: cleanName(port.Name),
                region: port.Location,
                county: capitalToCounty.get(port.CountyCapitalName) ?? "",
                data: [getObject()],
            });
        };
        const getPreviousNation = () => {
            const portData = ports[serverId].get(port.Id);
            if (portData) {
                const index = portData.data.length - 1 ?? 0;
                return portData.data[index].val;
            }
            return "";
        };
        const setNewNation = () => {
            const portData = ports[serverId].get(port.Id);
            if (portData) {
                portData.data.push(getObject());
                ports[serverId].set(port.Id, portData);
            }
        };
        const setNewEndDate = () => {
            const portData = ports[serverId].get(port.Id);
            if (portData) {
                portData.data[portData.data.length - 1].timeRange[1] = getDate(date);
                ports[serverId].set(port.Id, portData);
            }
        };
        if (port.Nation !== 9) {
            const currentNation = nations[port.Nation].short;
            numPorts[currentNation] = Number(numPorts[currentNation]) + 1;
            if (ports[serverId].get(port.Id)) {
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
            nationsForPowerMap.push(port.Nation);
        }
    }
    portOwnershipPerDate[serverId].push([date, nationsForPowerMap]);
    const numPortsDate = {};
    numPortsDate.date = date;
    for (const nation of nations.filter((nation) => nation.id !== 9)) {
        numPortsDate[nation.short] = numPorts[nation.short];
    }
    numPortsDates[serverId].push(numPortsDate);
}
const processFiles = async (serverId, fileNames) => {
    return fileNames.reduce(async (sequence, fileName) => sequence
        .then(async () => readFileContent(fileName))
        .then((compressedContent) => decompress(compressedContent))
        .then((decompressedContent) => {
        if (decompressedContent) {
            const currentDate = (fileBaseNameRegex[serverId].exec(path.basename(fileName)) ?? [])[1];
            parseData(serverId, JSON.parse(decompressedContent.toString()), currentDate);
        }
    })
        .catch((error) => {
        throw new Error(error);
    }), Promise.resolve());
};
const writeResult = async (serverId) => {
    const groups = d3Group([...ports[serverId].values()], (d) => d.region, (d) => d.county);
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
    await saveJsonAsync(path.resolve(commonPaths.dirGenServer, `${serverId}-ownership.json`), grouped);
    await saveJsonAsync(path.resolve(commonPaths.dirGenServer, `${serverId}-nation.json`), numPortsDates[serverId]);
    await saveJsonAsync(path.resolve(commonPaths.dirGenServer, `${serverId}-power.json`), portOwnershipPerDate[serverId]);
};
const convertOwnership = async (serverId) => {
    const ignoreFileName = (fileName, stats) => {
        return !stats.isDirectory() && fileBaseNameRegex[serverId].exec(path.basename(fileName)) === null;
    };
    ports[serverId] = new Map();
    numPortsDates[serverId] = [];
    portOwnershipPerDate[serverId] = [];
    try {
        fileNames[serverId] = await readDirRecursive(commonPaths.dirAPI, [ignoreFileName]);
        sortFileNames(fileNames[serverId]);
        await processFiles(serverId, fileNames[serverId]);
        await writeResult(serverId);
    }
    catch (error) {
        throw new Error(error);
    }
};
export const convertOwnershipData = async () => {
    const results = [];
    for (serverId of serverIds) {
        fileBaseNameRegex[serverId] = new RegExp(`${serverId}-Ports-(20\\d{2}-\\d{2}-\\d{2})${fileExtension}`);
        results.push(convertOwnership(serverId));
    }
    return Promise.all(results);
};
//# sourceMappingURL=convert-ownership.js.map