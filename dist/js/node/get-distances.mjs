/*!
 * This file is part of na-map.
 *
 * @file      Get distances for front lines.
 * @module    src/node/get-distances
 * @author    iB aka Felix Victor
 * @copyright 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import * as fs from "fs";
import * as path from "path";
import { default as Denque } from "denque";
import { default as PNG } from "pngjs";
import { baseAPIFilename, commonPaths, serverStartDate as serverDate } from "../common/common-dir";
import { readJson, saveJsonAsync, xz } from "../common/common-file";
import { convertCoordX, convertCoordY } from "../common/common-math";
import { simpleNumberSort } from "../common/common-node";
import { distanceMapSize, serverNames } from "../common/common-var";
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
    Math.trunc(convertCoordX(x, y) * mapScale),
];
const fileName = path.resolve(baseAPIFilename, `${serverNames[0]}-Ports-${serverDate}.json`);
let apiPorts = [];
let portIds = [];
let numPorts = 0;
const map = new Array(mapWidth * mapHeight)
    .fill(0)
    .map((_e, index) => (png.data[index << 2] > 127 ? spotWater : spotLand));
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
            .sort(simpleNumberSort);
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
    try {
        console.time("findPath");
        apiPorts
            .sort((a, b) => Number(a.Id) - Number(b.Id))
            .forEach((fromPort) => {
            const fromPortId = Number(fromPort.Id);
            const { EntrancePosition: { z: y, x }, } = fromPort;
            const [fromPortY, fromPortX] = getCoordinates(y, x);
            findPaths(fromPortId, fromPortY, fromPortX);
            console.timeLog("findPath", `${fromPortId} ${fromPort.Name} (${fromPortY}, ${fromPortX})`);
        });
        console.timeEnd("findPath");
        await saveJsonAsync(distancesFile, distances);
    }
    catch (error) {
        console.error("Map distance error:", error);
    }
};
xz("unxz", `${fileName}.xz`);
apiPorts = readJson(fileName);
portIds = apiPorts.map((port) => Number(port.Id));
numPorts = portIds.length;
apiPorts.forEach(({ Id, EntrancePosition: { z: y, x } }) => {
    const [portY, portX] = getCoordinates(y, x);
    const index = getIndex(portY, portX);
    map[index] = Number(Id);
});
getDistances();
xz("xz", fileName);
//# sourceMappingURL=get-distances.js.map