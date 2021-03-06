/*!
 * This file is part of na-map.
 *
 * @file      Get distances for front lines.
 * @module    src/node/get-distances
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import * as fs from "fs";
import path from "path";
import Deque from "collections/deque";
import { default as PNG } from "pngjs";
import { currentServerStartDate as serverDate } from "../common/common";
import { getCommonPaths } from "../common/common-dir";
import { readJson, saveJsonAsync, xz } from "../common/common-file";
import { convertCoordX, convertCoordY } from "../common/common-math";
import { baseAPIFilename, simpleNumberSort } from "../common/common-node";
import { distanceMapSize, mapSize } from "../common/common-var";
import { serverIds } from "../common/servers";
const commonPaths = getCommonPaths();
class Port {
    apiPorts = [];
    #fileName;
    numPorts = 0;
    portIds = [];
    constructor() {
        this.#fileName = path.resolve(baseAPIFilename, `${serverIds[0]}-Ports-${serverDate}.json`);
        xz("unxz", `${this.#fileName}.xz`);
        this.apiPorts = readJson(this.#fileName);
        xz("xz", this.#fileName);
        this.portIds = this.apiPorts.map((port) => Number(port.Id));
        this.numPorts = this.portIds.length;
    }
    getCoordinates(y, x, mapScale) {
        return [Math.trunc(convertCoordY(x, y) * mapScale), Math.trunc(convertCoordX(x, y) * mapScale)];
    }
}
class Map {
    #mapFileName = path.resolve(commonPaths.dirSrc, "images", `frontline-map-${distanceMapSize}.png`);
    #pngData;
    #distances = [];
    #distancesFile = path.resolve(commonPaths.dirGenGeneric, "distances.json");
    #neighbours;
    #offset;
    #map = [];
    #mapHeight;
    #mapScale;
    #mapWidth;
    #port = {};
    #completedPorts = new Set();
    #LAND = 0;
    #WATER = 0;
    #VISITED = 0;
    #FLAGS = 0;
    constructor() {
        this.#port = new Port();
        this.setBitFlags();
        this.readMap();
        this.mapInit();
        this.setPorts();
        this.setBorders();
        void this.getAndSaveDistances();
    }
    setBitFlags() {
        const bitsAvailable = 16;
        const bitsForPortIds = Number(this.#port.numPorts).toString(2).length + 1;
        if (bitsForPortIds + 3 > bitsAvailable) {
            const errorMessage = `Too few bits: available ${bitsAvailable} bits, needed ${bitsForPortIds + 3} bits`;
            throw new Error(errorMessage);
        }
        this.#LAND = 1 << bitsForPortIds;
        this.#WATER = this.#LAND << 1;
        this.#VISITED = this.#WATER << 1;
        this.#FLAGS = this.#LAND | this.#WATER | this.#VISITED;
    }
    readMap() {
        const fileData = fs.readFileSync(this.#mapFileName);
        const png = PNG.PNG.sync.read(fileData);
        this.#mapHeight = png.height;
        this.#mapWidth = png.width;
        this.#mapScale = this.#mapWidth / mapSize;
        this.#pngData = png.data;
        this.#offset = Math.ceil(Math.log2(this.#mapWidth));
        this.#neighbours = new Set([
            -this.#mapWidth - 1,
            -this.#mapWidth,
            -this.#mapWidth + 1,
            -1,
            1,
            this.#mapWidth - 1,
            this.#mapWidth,
            this.#mapWidth + 1,
        ]);
        console.log(this.#mapHeight, this.#mapWidth);
    }
    mapInit() {
        this.#map = [...new Uint16Array(this.#mapWidth * this.#mapHeight)].map((_, index) => this.#pngData[index << 2] > 127 ? this.#WATER : this.#LAND);
    }
    setPorts() {
        for (const { Id, EntrancePosition: { z: y, x }, } of this.#port.apiPorts) {
            const [portY, portX] = this.#port.getCoordinates(y, x, this.#mapScale);
            const index = this.getIndex(portY, portX);
            this.setPortSpot(index, Number(Id));
        }
    }
    setBorders() {
        const minY = 0;
        const maxY = this.#mapHeight - 1;
        const minX = 0;
        const maxX = this.#mapWidth - 1;
        for (let y = minY; y <= maxY; y += maxY) {
            for (let x = minX; x <= maxX; x += 1) {
                this.visit(this.getIndex(y, x));
            }
        }
        for (let y = minY; y <= maxY; y += 1) {
            for (let x = minX; x <= maxX; x += maxX) {
                this.visit(this.getIndex(y, x));
            }
        }
    }
    resetVisitedSpots() {
        const minY = 1;
        const maxY = this.#mapHeight - 2;
        const minX = 1;
        const maxX = this.#mapWidth - 2;
        for (let y = minY; y <= maxY; y += 1) {
            for (let x = minX; x <= maxX; x += 1) {
                this.resetVisit(this.getIndex(y, x));
            }
        }
    }
    findPaths(startPortId, startY, startX) {
        const foundPortIds = new Set();
        this.resetVisitedSpots();
        const startIndex = this.getIndex(startY, startX);
        this.#completedPorts.add(startPortId);
        this.visit(startIndex);
        const queue = new Deque([[startIndex, 0]]);
        while (foundPortIds.size + this.#completedPorts.size < this.#port.numPorts && queue.length > 0) {
            let [index, pixelDistance] = queue.shift();
            const spot = this.getPortId(this.getSpot(index));
            if (spot > startPortId) {
                this.#distances.push([startPortId, spot, pixelDistance]);
                foundPortIds.add(spot);
            }
            pixelDistance++;
            for (const neighbour of this.#neighbours) {
                const neighbourIndex = index + neighbour;
                if (this.isSpotNotVisitedNonLand(neighbourIndex)) {
                    this.visit(neighbourIndex);
                    queue.push([neighbourIndex, pixelDistance]);
                }
            }
        }
        if (foundPortIds.size + this.#completedPorts.size < this.#port.numPorts) {
            const missingPortIds = this.#port.portIds
                .filter((portId) => portId > startPortId && !foundPortIds.has(portId))
                .sort(simpleNumberSort);
            console.error("Only", foundPortIds.size + this.#completedPorts.size, "of all", this.#port.numPorts, "ports found! Ports", missingPortIds, "are missing.");
            for (const missingPortId of missingPortIds) {
                this.#distances.push([startPortId, missingPortId, 0]);
            }
        }
    }
    async getAndSaveDistances() {
        try {
            console.time("findPath");
            for (const fromPort of this.#port.apiPorts.sort((a, b) => Number(a.Id) - Number(b.Id))) {
                const fromPortId = Number(fromPort.Id);
                const { EntrancePosition: { z: y, x }, Name: name, } = fromPort;
                const [fromPortY, fromPortX] = this.#port.getCoordinates(y, x, this.#mapScale);
                this.findPaths(fromPortId, fromPortY, fromPortX);
                console.timeLog("findPath", `${fromPortId} ${name} (${fromPortY}, ${fromPortX})`);
            }
            console.timeEnd("findPath");
            await saveJsonAsync(this.#distancesFile, this.#distances.sort((a, b) => {
                if (a[0] === b[0]) {
                    return a[1] - b[1];
                }
                return a[0] - b[0];
            }));
        }
        catch (error) {
            console.error("Map distance error:", error);
        }
    }
    getIndex = (y, x) => (y << this.#offset) + x;
    getSpot(index) {
        return this.#map[index];
    }
    setPortSpot(index, spot) {
        this.#map[index] = spot;
    }
    visit(index) {
        this.#map[index] |= this.#VISITED;
    }
    resetVisit(index) {
        this.#map[index] &= ~this.#VISITED;
    }
    getPortId(spot) {
        return spot & ~this.#FLAGS;
    }
    isSpotNotVisitedNonLand(neighbourIndex) {
        const spot = this.getSpot(neighbourIndex);
        return !(spot & this.#VISITED) && !(spot & this.#LAND);
    }
}
void new Map();
//# sourceMappingURL=get-distances.js.map