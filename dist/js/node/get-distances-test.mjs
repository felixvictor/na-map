/*!
 * This file is part of na-map.
 *
 * @file      Get distances for front lines.
 * @module    src/node/get-distances
 * @author    iB aka Felix Victor
 * @copyright 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var _fileName, _distances, _distancesFile, _map, _mapHeight, _mapScale, _mapWidth, _port, _completedPorts, _LAND, _WATER, _VISITED, _CURRENT, _INQUEUE, _FLAGS, _cutMinY, _cutMinX;
import * as path from "path";
import { default as Immutable } from "immutable";
import { baseAPIFilename, commonPaths, serverStartDate as serverDate } from "../common/common-dir";
import { readJson, saveJsonAsync, xz } from "../common/common-file";
import { convertCoordX, convertCoordY } from "../common/common-math";
import { serverNames } from "../common/common-var";
class Port {
    constructor() {
        this.apiPorts = [];
        _fileName.set(this, void 0);
        this.numPorts = 0;
        this.portIds = [];
        __classPrivateFieldSet(this, _fileName, path.resolve(baseAPIFilename, `${serverNames[0]}-Ports-${serverDate}.json`));
        xz("unxz", `${__classPrivateFieldGet(this, _fileName)}.xz`);
        this.apiPorts = readJson(__classPrivateFieldGet(this, _fileName));
        xz("xz", __classPrivateFieldGet(this, _fileName));
        this.portIds = this.apiPorts.map((port) => Number(port.Id));
        this.numPorts = this.portIds.length;
    }
    getCoordinates(y, x, mapScale) {
        return [Math.trunc(convertCoordY(x, y) * mapScale), Math.trunc(convertCoordX(x, y) * mapScale)];
    }
}
_fileName = new WeakMap();
class PixelMap {
    constructor() {
        _distances.set(this, []);
        _distancesFile.set(this, path.resolve(commonPaths.dirGenGeneric, "distances-test.json"));
        _map.set(this, {});
        _mapHeight.set(this, void 0);
        _mapScale.set(this, void 0);
        _mapWidth.set(this, void 0);
        _port.set(this, {});
        _completedPorts.set(this, new Set());
        _LAND.set(this, 0);
        _WATER.set(this, 0);
        _VISITED.set(this, 0);
        _CURRENT.set(this, 0);
        _INQUEUE.set(this, 0);
        _FLAGS.set(this, 0);
        _cutMinY.set(this, 0);
        _cutMinX.set(this, 0);
        __classPrivateFieldSet(this, _port, new Port());
        this.setBitFlags();
        this.readMap();
        this.mapInit();
        this.setBorders();
        this.getAndSaveDistances();
    }
    printMap() {
        const minY = 0;
        const maxY = __classPrivateFieldGet(this, _mapHeight) - 1;
        const minX = 0;
        const maxX = __classPrivateFieldGet(this, _mapWidth) - 1;
        let index = 0;
        for (let x = minX; x <= maxX; x += 1) {
            let h = "";
            for (let y = minY; y <= maxY; y += 1) {
                const spot = this.getSpot(index);
                if (spot & __classPrivateFieldGet(this, _CURRENT)) {
                    h += "%";
                }
                else if (spot & __classPrivateFieldGet(this, _INQUEUE)) {
                    h += "#";
                }
                else if (spot & __classPrivateFieldGet(this, _VISITED)) {
                    h += "X";
                }
                else if (spot & __classPrivateFieldGet(this, _WATER)) {
                    h += " ";
                }
                else if (spot & __classPrivateFieldGet(this, _LAND)) {
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
        const bitsForPortIds = Number(__classPrivateFieldGet(this, _port).numPorts).toString(2).length + 1;
        if (bitsForPortIds + 3 > bitsAvailable) {
            throw new Error("Too few bits");
        }
        __classPrivateFieldSet(this, _LAND, 1 << bitsForPortIds);
        __classPrivateFieldSet(this, _WATER, __classPrivateFieldGet(this, _LAND) << 1);
        __classPrivateFieldSet(this, _VISITED, __classPrivateFieldGet(this, _WATER) << 1);
        __classPrivateFieldSet(this, _INQUEUE, __classPrivateFieldGet(this, _VISITED) << 1);
        __classPrivateFieldSet(this, _CURRENT, __classPrivateFieldGet(this, _INQUEUE) << 1);
        __classPrivateFieldSet(this, _FLAGS, __classPrivateFieldGet(this, _LAND) | __classPrivateFieldGet(this, _WATER) | __classPrivateFieldGet(this, _VISITED) | __classPrivateFieldGet(this, _INQUEUE) | __classPrivateFieldGet(this, _CURRENT));
        console.log(__classPrivateFieldGet(this, _LAND), __classPrivateFieldGet(this, _WATER), __classPrivateFieldGet(this, _VISITED), __classPrivateFieldGet(this, _FLAGS));
    }
    readMap() {
        __classPrivateFieldSet(this, _mapHeight, 24);
        __classPrivateFieldSet(this, _mapWidth, 24);
        __classPrivateFieldSet(this, _mapScale, 1);
        console.log(__classPrivateFieldGet(this, _mapHeight), __classPrivateFieldGet(this, _mapWidth));
    }
    mapInit() {
        const w = __classPrivateFieldGet(this, _WATER);
        const l = __classPrivateFieldGet(this, _LAND);
        __classPrivateFieldSet(this, _map, [
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
        ]);
        this.selectedPorts = new Map();
        const minY = __classPrivateFieldGet(this, _cutMinY);
        const maxY = __classPrivateFieldGet(this, _cutMinY) + __classPrivateFieldGet(this, _mapHeight) - 1;
        const minX = __classPrivateFieldGet(this, _cutMinX);
        const maxX = __classPrivateFieldGet(this, _cutMinX) + __classPrivateFieldGet(this, _mapWidth) - 1;
        for (let y = minY; y <= maxY; y += 1) {
            for (let x = minX; x <= maxX; x += 1) {
                const spot = this.getSpot(this.getIndex(y, x));
                if (spot < __classPrivateFieldGet(this, _LAND)) {
                    this.selectedPorts.set(spot, [y, x]);
                }
            }
        }
    }
    setBorders() {
        const minY = __classPrivateFieldGet(this, _cutMinY);
        const maxY = __classPrivateFieldGet(this, _cutMinY) + __classPrivateFieldGet(this, _mapHeight) - 1;
        const minX = __classPrivateFieldGet(this, _cutMinX);
        const maxX = __classPrivateFieldGet(this, _cutMinX) + __classPrivateFieldGet(this, _mapWidth) - 1;
        for (let y = minY; y <= maxY; y += __classPrivateFieldGet(this, _mapHeight) - 1) {
            for (let x = minX; x <= maxX; x += 1) {
                this.visit(this.getIndex(y, x));
            }
        }
        for (let y = minY; y <= maxY; y += 1) {
            for (let x = minX; x <= maxX; x += __classPrivateFieldGet(this, _mapWidth) - 1) {
                this.visit(this.getIndex(y, x));
            }
        }
    }
    resetVisitedSpots() {
        const minY = __classPrivateFieldGet(this, _cutMinY) + 1;
        const maxY = __classPrivateFieldGet(this, _cutMinY) + __classPrivateFieldGet(this, _mapHeight) - 2;
        const minX = __classPrivateFieldGet(this, _cutMinX) + 1;
        const maxX = __classPrivateFieldGet(this, _cutMinX) + __classPrivateFieldGet(this, _mapWidth) - 2;
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
        __classPrivateFieldGet(this, _completedPorts).add(startPortId);
        this.resetVisitedSpots();
        this.printMap();
        const startIndex = this.getIndex(startY, startX);
        __classPrivateFieldGet(this, _completedPorts).add(startPortId);
        this.visit(startIndex);
        let queue = Immutable.List([[startIndex, 0]]);
        while (foundPortIds.size + __classPrivateFieldGet(this, _completedPorts).size < this.selectedPorts.size && !queue.isEmpty()) {
            console.log(foundPortIds.size, this.selectedPorts.size, foundPortIds.size < this.selectedPorts.size, queue.size);
            let [index, pixelDistance] = queue.first();
            queue = queue.shift();
            const spot = this.getPortId(this.getSpot(index));
            console.log("new element from queue", index, pixelDistance, spot);
            __classPrivateFieldGet(this, _map)[index] |= __classPrivateFieldGet(this, _CURRENT);
            __classPrivateFieldGet(this, _map)[index] &= ~__classPrivateFieldGet(this, _INQUEUE);
            if (spot > startPortId) {
                console.log([startPortId, spot, index, pixelDistance]);
                __classPrivateFieldGet(this, _distances).push([startPortId, spot, pixelDistance]);
                foundPortIds.add(spot);
                this.printMap();
            }
            pixelDistance++;
            for (let y = -__classPrivateFieldGet(this, _mapWidth); y <= __classPrivateFieldGet(this, _mapWidth); y += __classPrivateFieldGet(this, _mapWidth)) {
                for (let x = -1; x <= 1; x += 1) {
                    const neighbourIndex = index + y + x;
                    console.log("neighbours", y, x, neighbourIndex, this.getSpot(neighbourIndex), this.getPortId(this.getSpot(neighbourIndex)));
                    if (this.isSpotNotVisitedNonLand(neighbourIndex)) {
                        this.visit(neighbourIndex);
                        queue = queue.push([neighbourIndex, pixelDistance]);
                        console.log("isSpotNotVisitedNonLand");
                        __classPrivateFieldGet(this, _map)[neighbourIndex] |= __classPrivateFieldGet(this, _INQUEUE);
                    }
                }
            }
            __classPrivateFieldGet(this, _map)[index] &= ~__classPrivateFieldGet(this, _CURRENT);
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
            await saveJsonAsync(__classPrivateFieldGet(this, _distancesFile), __classPrivateFieldGet(this, _distances));
        }
        catch (error) {
            console.error("Map distance error:", error);
        }
    }
    getIndex(y, x) {
        return (y - __classPrivateFieldGet(this, _cutMinY)) * __classPrivateFieldGet(this, _mapWidth) + (x - __classPrivateFieldGet(this, _cutMinX));
    }
    getSpot(index) {
        return __classPrivateFieldGet(this, _map)[index];
    }
    setPortSpot(index, spot) {
        __classPrivateFieldGet(this, _map)[index] = spot;
    }
    visit(index) {
        __classPrivateFieldGet(this, _map)[index] |= __classPrivateFieldGet(this, _VISITED);
    }
    resetVisit(index) {
        __classPrivateFieldGet(this, _map)[index] &= ~__classPrivateFieldGet(this, _VISITED);
    }
    getPortId(spot) {
        return spot & ~__classPrivateFieldGet(this, _FLAGS);
    }
    isSpotNotVisitedNonLand(neighbourIndex) {
        const spot = this.getSpot(neighbourIndex);
        return !(spot & __classPrivateFieldGet(this, _VISITED)) && !(spot & __classPrivateFieldGet(this, _LAND));
    }
}
_distances = new WeakMap(), _distancesFile = new WeakMap(), _map = new WeakMap(), _mapHeight = new WeakMap(), _mapScale = new WeakMap(), _mapWidth = new WeakMap(), _port = new WeakMap(), _completedPorts = new WeakMap(), _LAND = new WeakMap(), _WATER = new WeakMap(), _VISITED = new WeakMap(), _CURRENT = new WeakMap(), _INQUEUE = new WeakMap(), _FLAGS = new WeakMap(), _cutMinY = new WeakMap(), _cutMinX = new WeakMap();
const map = new PixelMap();
//# sourceMappingURL=get-distances-test.js.map