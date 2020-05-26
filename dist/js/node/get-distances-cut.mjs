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
var _fileName, _mapFileName, _pngData, _distances, _distancesFile, _map, _mapHeight, _mapScale, _mapWidth, _port, _completedPorts, _LAND, _WATER, _VISITED, _FLAGS, _cutMinY, _cutMinX;
import * as fs from "fs";
import * as path from "path";
import { default as Immutable } from "immutable";
import { default as PNG } from "pngjs";
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
class Map {
    constructor() {
        _mapFileName.set(this, path.resolve(commonPaths.dirSrc, "images", `cut.png`));
        _pngData.set(this, void 0);
        _distances.set(this, []);
        _distancesFile.set(this, path.resolve(commonPaths.dirGenGeneric, "distances-cut.json"));
        _map.set(this, {});
        _mapHeight.set(this, void 0);
        _mapScale.set(this, void 0);
        _mapWidth.set(this, void 0);
        _port.set(this, {});
        _completedPorts.set(this, new Set());
        _LAND.set(this, 0);
        _WATER.set(this, 0);
        _VISITED.set(this, 0);
        _FLAGS.set(this, 0);
        _cutMinY.set(this, 2812);
        _cutMinX.set(this, 47);
        this.selectedPorts = new Set();
        __classPrivateFieldSet(this, _port, new Port());
        this.setBitFlags();
        this.readMap();
        this.mapInit();
        this.setPorts();
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
                if (spot & __classPrivateFieldGet(this, _VISITED)) {
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
        __classPrivateFieldSet(this, _FLAGS, __classPrivateFieldGet(this, _LAND) | __classPrivateFieldGet(this, _WATER) | __classPrivateFieldGet(this, _VISITED));
    }
    readMap() {
        const fileData = fs.readFileSync(__classPrivateFieldGet(this, _mapFileName));
        const png = PNG.PNG.sync.read(fileData);
        __classPrivateFieldSet(this, _mapHeight, png.height);
        __classPrivateFieldSet(this, _mapWidth, png.width);
        __classPrivateFieldSet(this, _mapScale, 1);
        __classPrivateFieldSet(this, _pngData, png.data);
        console.log(__classPrivateFieldGet(this, _mapHeight), __classPrivateFieldGet(this, _mapWidth));
    }
    mapInit() {
        __classPrivateFieldSet(this, _map, new Array(__classPrivateFieldGet(this, _mapWidth) * __classPrivateFieldGet(this, _mapHeight))
            .fill(0)
            .map((_e, index) => (__classPrivateFieldGet(this, _pngData)[index << 2] > 127 ? __classPrivateFieldGet(this, _WATER) : __classPrivateFieldGet(this, _LAND))));
    }
    setPorts() {
        __classPrivateFieldGet(this, _port).apiPorts.forEach(({ Id, EntrancePosition: { z: y, x } }) => {
            const [portY, portX] = __classPrivateFieldGet(this, _port).getCoordinates(y, x, __classPrivateFieldGet(this, _mapScale));
            if (portY >= __classPrivateFieldGet(this, _cutMinY) &&
                portY <= __classPrivateFieldGet(this, _cutMinY) + __classPrivateFieldGet(this, _mapHeight) &&
                portX >= __classPrivateFieldGet(this, _cutMinX) &&
                portX <= __classPrivateFieldGet(this, _cutMinX) + __classPrivateFieldGet(this, _mapWidth)) {
                const index = this.getIndex(portY, portX);
                console.log(portY, portX, index, Number(Id));
                this.selectedPorts.add(Number(Id));
                this.setPortSpot(index, Number(Id));
            }
        });
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
        const foundPortIds = new Set();
        this.resetVisitedSpots();
        const startIndex = this.getIndex(startY, startX);
        __classPrivateFieldGet(this, _completedPorts).add(startPortId);
        this.visit(startIndex);
        let queue = Immutable.List([[startIndex, 0]]);
        while (foundPortIds.size + __classPrivateFieldGet(this, _completedPorts).size < this.selectedPorts.size && !queue.isEmpty()) {
            let [index, pixelDistance] = queue.first();
            queue = queue.shift();
            const spot = this.getPortId(this.getSpot(index));
            if ((startPortId === 270 && spot === 276) || (startPortId === 276 && spot === 338)) {
                console.log([startPortId, spot, index, pixelDistance]);
                __classPrivateFieldGet(this, _distances).push([startPortId, spot, pixelDistance]);
                foundPortIds.add(spot);
            }
            pixelDistance++;
            for (let y = -__classPrivateFieldGet(this, _mapWidth); y <= __classPrivateFieldGet(this, _mapWidth); y += __classPrivateFieldGet(this, _mapWidth)) {
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
            __classPrivateFieldGet(this, _port).apiPorts
                .sort((a, b) => Number(a.Id) - Number(b.Id))
                .filter((fromPort) => this.selectedPorts.has(Number(fromPort.Id)))
                .forEach((fromPort) => {
                const fromPortId = Number(fromPort.Id);
                const { EntrancePosition: { z: y, x }, } = fromPort;
                const [fromPortY, fromPortX] = __classPrivateFieldGet(this, _port).getCoordinates(y, x, __classPrivateFieldGet(this, _mapScale));
                this.findPaths(fromPortId, fromPortY, fromPortX);
                console.timeLog("findPath", `${fromPortId} ${fromPort.Name} (${fromPortY}, ${fromPortX})`);
            });
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
_mapFileName = new WeakMap(), _pngData = new WeakMap(), _distances = new WeakMap(), _distancesFile = new WeakMap(), _map = new WeakMap(), _mapHeight = new WeakMap(), _mapScale = new WeakMap(), _mapWidth = new WeakMap(), _port = new WeakMap(), _completedPorts = new WeakMap(), _LAND = new WeakMap(), _WATER = new WeakMap(), _VISITED = new WeakMap(), _FLAGS = new WeakMap(), _cutMinY = new WeakMap(), _cutMinX = new WeakMap();
const map = new Map();
//# sourceMappingURL=get-distances-cut.js.map