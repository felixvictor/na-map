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
import path from "path";
import { default as Immutable } from "immutable";
import { default as PNG } from "pngjs";
import { baseAPIFilename, commonPaths, serverStartDate as serverDate } from "../common/common-dir";
import { readJson, saveJsonAsync, xz } from "../common/common-file";
import { convertCoordX, convertCoordY } from "../common/common-math";
import { serverNames } from "../common/servers";
class Port {
    constructor() {
        this.apiPorts = [];
        this.numPorts = 0;
        this.portIds = [];
        this.#fileName = path.resolve(baseAPIFilename, `${serverNames[0]}-Ports-${serverDate}.json`);
        xz("unxz", `${this.#fileName}.xz`);
        this.apiPorts = readJson(this.#fileName);
        xz("xz", this.#fileName);
        this.portIds = this.apiPorts.map((port) => Number(port.Id));
        this.numPorts = this.portIds.length;
    }
    #fileName;
    getCoordinates(y, x, mapScale) {
        return [Math.trunc(convertCoordY(x, y) * mapScale), Math.trunc(convertCoordX(x, y) * mapScale)];
    }
}
class Map {
    constructor() {
        this.#mapFileName = path.resolve(commonPaths.dirSrc, "images", `cut.png`);
        this.#distances = [];
        this.#distancesFile = path.resolve(commonPaths.dirGenGeneric, "distances-cut.json");
        this.#map = {};
        this.#port = {};
        this.#completedPorts = new Set();
        this.#LAND = 0;
        this.#WATER = 0;
        this.#VISITED = 0;
        this.#FLAGS = 0;
        this.#cutMinY = 2812;
        this.#cutMinX = 47;
        this.selectedPorts = new Set();
        this.#port = new Port();
        this.setBitFlags();
        this.readMap();
        this.mapInit();
        this.setPorts();
        this.setBorders();
        this.getAndSaveDistances();
    }
    #mapFileName;
    #pngData;
    #distances;
    #distancesFile;
    #map;
    #mapHeight;
    #mapScale;
    #mapWidth;
    #port;
    #completedPorts;
    #LAND;
    #WATER;
    #VISITED;
    #FLAGS;
    #cutMinY;
    #cutMinX;
    printMap() {
        const minY = 0;
        const maxY = this.#mapHeight - 1;
        const minX = 0;
        const maxX = this.#mapWidth - 1;
        let index = 0;
        for (let x = minX; x <= maxX; x += 1) {
            let h = "";
            for (let y = minY; y <= maxY; y += 1) {
                const spot = this.getSpot(index);
                if (spot & this.#VISITED) {
                    h += "X";
                }
                else if (spot & this.#WATER) {
                    h += " ";
                }
                else if (spot & this.#LAND) {
                    h += "~";
                }
                else {
                    h += "*";
                }
                index++;
            }
            console.log(h);
        }
    }
    setBitFlags() {
        const bitsAvailable = 32;
        const bitsForPortIds = Number(this.#port.numPorts).toString(2).length + 1;
        if (bitsForPortIds + 3 > bitsAvailable) {
            throw new Error("Too few bits");
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
        this.#mapScale = 1;
        this.#pngData = png.data;
        console.log(this.#mapHeight, this.#mapWidth);
    }
    mapInit() {
        this.#map = new Array(this.#mapWidth * this.#mapHeight)
            .fill(0)
            .map((_e, index) => (this.#pngData[index << 2] > 127 ? this.#WATER : this.#LAND));
    }
    setPorts() {
        this.#port.apiPorts.forEach(({ Id, EntrancePosition: { z: y, x } }) => {
            const [portY, portX] = this.#port.getCoordinates(y, x, this.#mapScale);
            if (portY >= this.#cutMinY &&
                portY <= this.#cutMinY + this.#mapHeight &&
                portX >= this.#cutMinX &&
                portX <= this.#cutMinX + this.#mapWidth) {
                const index = this.getIndex(portY, portX);
                console.log(portY, portX, index, Number(Id));
                this.selectedPorts.add(Number(Id));
                this.setPortSpot(index, Number(Id));
            }
        });
    }
    setBorders() {
        const minY = this.#cutMinY;
        const maxY = this.#cutMinY + this.#mapHeight - 1;
        const minX = this.#cutMinX;
        const maxX = this.#cutMinX + this.#mapWidth - 1;
        for (let y = minY; y <= maxY; y += this.#mapHeight - 1) {
            for (let x = minX; x <= maxX; x += 1) {
                this.visit(this.getIndex(y, x));
            }
        }
        for (let y = minY; y <= maxY; y += 1) {
            for (let x = minX; x <= maxX; x += this.#mapWidth - 1) {
                this.visit(this.getIndex(y, x));
            }
        }
    }
    resetVisitedSpots() {
        const minY = this.#cutMinY + 1;
        const maxY = this.#cutMinY + this.#mapHeight - 2;
        const minX = this.#cutMinX + 1;
        const maxX = this.#cutMinX + this.#mapWidth - 2;
        for (let y = minY; y <= maxY; y += 1) {
            for (let x = minX; x <= maxX; x += 1) {
                this.resetVisit(this.getIndex(y, x));
            }
        }
    }
    findPaths(startPortId, startY, startX) {
        console.log(startPortId, startY, startX);
        const foundPortIds = new Set();
        this.resetVisitedSpots();
        const startIndex = this.getIndex(startY, startX);
        this.#completedPorts.add(startPortId);
        this.visit(startIndex);
        let queue = Immutable.List([[startIndex, 0]]);
        while (foundPortIds.size + this.#completedPorts.size < this.selectedPorts.size && !queue.isEmpty()) {
            let [index, pixelDistance] = queue.first();
            queue = queue.shift();
            const spot = this.getPortId(this.getSpot(index));
            if ((startPortId === 270 && spot === 276) || (startPortId === 276 && spot === 338)) {
                console.log([startPortId, spot, index, pixelDistance]);
                this.#distances.push([startPortId, spot, pixelDistance]);
                foundPortIds.add(spot);
            }
            pixelDistance++;
            for (let y = -this.#mapWidth; y <= this.#mapWidth; y += this.#mapWidth) {
                for (let x = -1; x <= 1; x += 1) {
                    const neighbourIndex = index + y + x;
                    if (this.isSpotNotVisitedNonLand(neighbourIndex)) {
                        this.visit(neighbourIndex);
                        queue = queue.push([neighbourIndex, pixelDistance]);
                    }
                }
            }
        }
    }
    async getAndSaveDistances() {
        try {
            console.time("findPath");
            this.#port.apiPorts
                .sort((a, b) => Number(a.Id) - Number(b.Id))
                .filter((fromPort) => this.selectedPorts.has(Number(fromPort.Id)))
                .forEach((fromPort) => {
                const fromPortId = Number(fromPort.Id);
                const { EntrancePosition: { z: y, x }, } = fromPort;
                const [fromPortY, fromPortX] = this.#port.getCoordinates(y, x, this.#mapScale);
                this.findPaths(fromPortId, fromPortY, fromPortX);
                console.timeLog("findPath", `${fromPortId} ${fromPort.Name} (${fromPortY}, ${fromPortX})`);
            });
            console.timeEnd("findPath");
            await saveJsonAsync(this.#distancesFile, this.#distances);
        }
        catch (error) {
            console.error("Map distance error:", error);
        }
    }
    getIndex(y, x) {
        return (y - this.#cutMinY) * this.#mapWidth + (x - this.#cutMinX);
    }
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
//# sourceMappingURL=get-distances-cut.js.map