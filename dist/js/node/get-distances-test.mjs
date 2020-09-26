/*!
 * This file is part of na-map.
 *
 * @file      Get distances for front lines.
 * @module    src/node/get-distances
 * @author    iB aka Felix Victor
 * @copyright 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import path from "path";
import { default as Immutable } from "immutable";
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
class PixelMap {
    constructor() {
        this.#distances = [];
        this.#distancesFile = path.resolve(commonPaths.dirGenGeneric, "distances-test.json");
        this.#map = {};
        this.#port = {};
        this.#completedPorts = new Set();
        this.#LAND = 0;
        this.#WATER = 0;
        this.#VISITED = 0;
        this.#CURRENT = 0;
        this.#INQUEUE = 0;
        this.#FLAGS = 0;
        this.#cutMinY = 0;
        this.#cutMinX = 0;
        this.#port = new Port();
        this.setBitFlags();
        this.readMap();
        this.mapInit();
        this.setBorders();
        this.getAndSaveDistances();
    }
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
    #CURRENT;
    #INQUEUE;
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
                if (spot & this.#CURRENT) {
                    h += "%";
                }
                else if (spot & this.#INQUEUE) {
                    h += "#";
                }
                else if (spot & this.#VISITED) {
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
        this.#INQUEUE = this.#VISITED << 1;
        this.#CURRENT = this.#INQUEUE << 1;
        this.#FLAGS = this.#LAND | this.#WATER | this.#VISITED | this.#INQUEUE | this.#CURRENT;
        console.log(this.#LAND, this.#WATER, this.#VISITED, this.#FLAGS);
    }
    readMap() {
        this.#mapHeight = 24;
        this.#mapWidth = 24;
        this.#mapScale = 1;
        console.log(this.#mapHeight, this.#mapWidth);
    }
    mapInit() {
        const w = this.#WATER;
        const l = this.#LAND;
        this.#map = [
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, l, l, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, l, l, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, l, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, l, l, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, 3, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, 2, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, 1, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
        ];
        this.selectedPorts = new Map();
        const minY = this.#cutMinY;
        const maxY = this.#cutMinY + this.#mapHeight - 1;
        const minX = this.#cutMinX;
        const maxX = this.#cutMinX + this.#mapWidth - 1;
        for (let y = minY; y <= maxY; y += 1) {
            for (let x = minX; x <= maxX; x += 1) {
                const spot = this.getSpot(this.getIndex(y, x));
                if (spot < this.#LAND) {
                    this.selectedPorts.set(spot, [y, x]);
                }
            }
        }
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
        this.printMap();
        const foundPortIds = new Set();
        this.#completedPorts.add(startPortId);
        this.resetVisitedSpots();
        this.printMap();
        const startIndex = this.getIndex(startY, startX);
        this.#completedPorts.add(startPortId);
        this.visit(startIndex);
        let queue = Immutable.List([[startIndex, 0]]);
        while (foundPortIds.size + this.#completedPorts.size < this.selectedPorts.size && !queue.isEmpty()) {
            console.log(foundPortIds.size, this.selectedPorts.size, foundPortIds.size < this.selectedPorts.size, queue.size);
            let [index, pixelDistance] = queue.first();
            queue = queue.shift();
            const spot = this.getPortId(this.getSpot(index));
            console.log("new element from queue", index, pixelDistance, spot);
            this.#map[index] |= this.#CURRENT;
            this.#map[index] &= ~this.#INQUEUE;
            if (spot > startPortId) {
                console.log([startPortId, spot, index, pixelDistance]);
                this.#distances.push([startPortId, spot, pixelDistance]);
                foundPortIds.add(spot);
                this.printMap();
            }
            pixelDistance++;
            for (let y = -this.#mapWidth; y <= this.#mapWidth; y += this.#mapWidth) {
                for (let x = -1; x <= 1; x += 1) {
                    const neighbourIndex = index + y + x;
                    console.log("neighbours", y, x, neighbourIndex, this.getSpot(neighbourIndex), this.getPortId(this.getSpot(neighbourIndex)));
                    if (this.isSpotNotVisitedNonLand(neighbourIndex)) {
                        this.visit(neighbourIndex);
                        queue = queue.push([neighbourIndex, pixelDistance]);
                        console.log("isSpotNotVisitedNonLand");
                        this.#map[neighbourIndex] |= this.#INQUEUE;
                    }
                }
            }
            this.#map[index] &= ~this.#CURRENT;
        }
    }
    async getAndSaveDistances() {
        try {
            console.time("findPath");
            const ports = [...this.selectedPorts].sort((a, b) => a[0] - b[0]);
            console.log(ports);
            for (const [fromPortId, coord] of ports) {
                const [fromPortY, fromPortX] = coord;
                this.findPaths(fromPortId, fromPortY, fromPortX);
                console.timeLog("findPath", `${fromPortId} (${fromPortY}, ${fromPortX})`);
            }
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
void new PixelMap();
//# sourceMappingURL=get-distances-test.js.map