import * as fs from "fs";
import * as path from "path";
import d3Node from "d3-node";
import { default as lzma } from "lzma-native";
import { default as readDirRecursive } from "recursive-readdir";
import { capitalToCounty, cleanName, nations, saveJsonAsync, serverNames } from "../common";
import { commonPaths } from "./common-node";
const fileExtension = ".json.xz";
const d3n = d3Node();
const { d3 } = d3n;
function convertOwnership() {
    const ports = new Map();
    const numPortsDates = [];
    const fileBaseNameRegex = new RegExp(`${serverNames[0]}-Ports-(20\\d{2}-\\d{2}-\\d{2})${fileExtension}`);
    function parseData(portData, date) {
        const numPorts = {};
        nations
            .filter(nation => nation.id !== 9)
            .forEach(nation => {
            numPorts[nation.short] = 0;
        });
        for (const port of portData) {
            const getObject = () => ({
                timeRange: [date, date],
                val: nations[port.Nation].short,
                labelVal: nations[port.Nation].sortName
            });
            const initData = () => {
                ports.set(port.Id, {
                    name: cleanName(port.Name),
                    region: port.Location,
                    county: capitalToCounty.get(port.CountyCapitalName) || "",
                    data: [getObject()]
                });
            };
            const getPreviousNation = () => {
                const index = ports.get(port.Id).data.length - 1;
                return ports.get(port.Id).data[index].val;
            };
            const setNewNation = () => {
                const values = ports.get(port.Id);
                values.data.push(getObject());
                ports.set(port.Id, values);
            };
            const setNewEndDate = () => {
                const values = ports.get(port.Id);
                values.data[values.data.length - 1].timeRange[1] = date;
                ports.set(port.Id, values);
            };
            if (port.Nation !== 9) {
                numPorts[nations[port.Nation].short] += 1;
                if (ports.get(port.Id)) {
                    const currentNation = nations[port.Nation].short;
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
            .filter(nation => nation.id !== 9)
            .forEach(nation => {
            numPortsDate[nation.short] = numPorts[nation.short];
        });
        numPortsDates.push(numPortsDate);
    }
    const decompress = (compressedContent) => {
        return lzma.decompress(compressedContent, (decompressedContent, error) => {
            if (error) {
                throw new Error(error);
            }
            return decompressedContent;
        });
    };
    function readFileContent(fileName) {
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
    }
    function processFiles(fileNames) {
        return fileNames.reduce((sequence, fileName) => sequence
            .then(() => readFileContent(fileName))
            .then(compressedContent => decompress(compressedContent))
            .then(decompressedContent => parseData(JSON.parse(decompressedContent.toString()), path.basename(fileName).match(fileBaseNameRegex)[1]))
            .catch(error => {
            throw new Error(error);
        }), Promise.resolve());
    }
    function ignoreFileName(fileName, stats) {
        return !stats.isDirectory() && path.basename(fileName).match(fileBaseNameRegex) === null;
    }
    function sortFileNames(fileNames) {
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
    }
    const writeResult = async () => {
        const portsArray = [...ports.entries()].map(([key, value]) => {
            value.id = key;
            return value;
        });
        const nested = d3
            .nest()
            .key((d) => d.region)
            .sortKeys(d3.ascending)
            .key((d) => d.county)
            .sortKeys(d3.ascending)
            .entries(portsArray);
        console.log(nested);
        const result = nested.map(region => {
            const newRegion = {};
            newRegion.region = region.key;
            newRegion.data = region.values.map(county => {
                const group = {};
                group.group = county.key;
                group.data = county.values.map(port => {
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
        .then(fileNames => sortFileNames(fileNames))
        .then(fileNames => processFiles(fileNames))
        .then(() => writeResult())
        .catch(error => {
        throw new Error(error);
    });
}
export const convertOwnershipData = () => {
    convertOwnership();
};
