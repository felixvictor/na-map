#!/usr/bin/env -S yarn node --experimental-specifier-resolution=node
import * as fs from "fs";
import * as path from "path";
import { default as Denque } from "denque";
import { default as PNG } from "pngjs";
import { convertCoordX, convertCoordY, readJson, saveJsonAsync, serverNames } from "../common";
import { baseAPIFilename, commonPaths, distanceMapSize, serverStartDate as serverDate } from "./common-node";
const mapFileName = path.resolve(commonPaths.dirSrc, "images", `frontline-map-${distanceMapSize}.png`);
const distancesFile = path.resolve(commonPaths.dirGenGeneric, `distances-${distanceMapSize}.json`);
const spotWater = 0;
const spotLand = -1;
const fileData = fs.readFileSync(mapFileName);
const png = PNG.PNG.sync.read(fileData);
const mapHeight = png.height;
const mapWidth = png.width;
const origMapSize = 8192;
const mapScale = mapWidth / origMapSize;
const getIndex = (y, x) => y * mapWidth + x;
const getCoordinates = (y, x) => [
    Math.trunc(convertCoordY(x, y) * mapScale),
    Math.trunc(convertCoordX(x, y) * mapScale)
];
const apiPorts = readJson(path.resolve(baseAPIFilename, `${serverNames[0]}-Ports-${serverDate}.json`));
const portIds = apiPorts.map((port) => Number(port.Id));
const numPorts = portIds.length;
const map = new Array(mapWidth * mapHeight)
    .fill(0)
    .map((e, index) => (png.data[index << 2] > 127 ? spotWater : spotLand));
apiPorts.forEach(({ Id, EntrancePosition: { z: y, x } }) => {
    const [portY, portX] = getCoordinates(y, x);
    const index = getIndex(portY, portX);
    map[index] = Number(Id);
});
const visitedPositionsDefault = new Set();
const distances = [];
const startPortIds = new Set();
const findPaths = (startPortId, startY, startX) => {
    const visitedPositions = new Set(visitedPositionsDefault);
    const queue = new Denque();
    const startIndex = getIndex(startY, startX);
    const foundPortIds = new Set();
    startPortIds.add(startPortId);
    visitedPositions.add(startIndex);
    queue.push([startIndex, 0]);
    while (foundPortIds.size + startPortIds.size < numPorts && !queue.isEmpty()) {
        let [pos, distance] = queue.shift();
        distance++;
        if (map[pos] > startPortId) {
            distances.push([startPortId, map[pos], distance]);
            foundPortIds.add(map[pos]);
        }
        for (let y = -mapWidth; y <= mapWidth; y += mapWidth) {
            for (let x = -1; x <= 1; x += 1) {
                const index = pos + y + x;
                if (!visitedPositions.has(index) && map[index] !== spotLand) {
                    visitedPositions.add(index);
                    queue.push([index, distance]);
                }
            }
        }
    }
    if (foundPortIds.size + startPortIds.size < numPorts) {
        const missingPortIds = portIds
            .filter((portId) => portId > startPortId && !foundPortIds.has(portId))
            .sort((a, b) => a - b);
        console.error("Only", foundPortIds.size + startPortIds.size, "of all", numPorts, "ports found! Ports", missingPortIds, "are missing.");
        missingPortIds.forEach((missingPortId) => {
            distances.push([startPortId, missingPortId, 0]);
        });
    }
};
const setVisitedPositionsDefault = () => {
    const minY = -1;
    const minX = -1;
    const maxY = mapHeight;
    const maxX = mapWidth;
    for (let y = minY; y <= maxY; y += maxY + 1) {
        for (let x = minX; x <= maxX; x += 1) {
            visitedPositionsDefault.add(getIndex(y, x));
        }
    }
    for (let y = minY; y <= maxY; y += 1) {
        for (let x = minX; x <= maxX; x += maxX + 1) {
            visitedPositionsDefault.add(getIndex(y, x));
        }
    }
};
const getDistances = async () => {
    setVisitedPositionsDefault();
    console.time("findPath");
    apiPorts
        .sort((a, b) => Number(a.Id) - Number(b.Id))
        .forEach((fromPort) => {
        const fromPortId = Number(fromPort.Id);
        const { EntrancePosition: { z: y, x } } = fromPort;
        const [fromPortY, fromPortX] = getCoordinates(y, x);
        findPaths(fromPortId, fromPortY, fromPortX);
        console.timeLog("findPath", `${fromPort.Id} ${fromPort.Name} (${fromPortY}, ${fromPortX})`);
    });
    console.timeEnd("findPath");
    await saveJsonAsync(distancesFile, distances);
};
getDistances();
