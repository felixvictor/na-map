#!/usr/bin/env -S yarn node --experimental-modules

/**
 * This file is part of na-map.
 *
 * @file      Get distances for front lines.
 * @module    get-distances
 * @author    iB aka Felix Victor
 * @copyright 2019
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import * as fs from "fs";
import * as path from "path";
import { default as Denque } from "denque";
import { default as PNG } from "pngjs";
import {
    baseAPIFilename,
    commonPaths,
    convertCoordX,
    convertCoordY,
    distanceMapSize,
    readJson,
    saveJsonAsync,
    serverNames,
    serverStartDate as serverDate
} from "./common.mjs";

/**
 * ------------------------------------------------------------------------
 * Constants
 * ------------------------------------------------------------------------
 */

const mapFileName = path.resolve(commonPaths.dirSrc, "images", `frontline-map-${distanceMapSize}.png`);
const distancesFile = path.resolve(commonPaths.dirGenGeneric, `distances-${distanceMapSize}.json`);

const spotWater = 0;
const spotLand = -1;

/**
 * ------------------------------------------------------------------------
 * Load map and set map related constants
 * ------------------------------------------------------------------------
 */

// Read map file
const fileData = fs.readFileSync(mapFileName);
// Read map file content as png
const png = PNG.PNG.sync.read(fileData);

const mapHeight = png.height; // y
const mapWidth = png.width; // x
const origMapSize = 8192;
const mapScale = mapWidth / origMapSize;

/**
 * ------------------------------------------------------------------------
 * Helper functions
 * ------------------------------------------------------------------------
 */

const getIndex = (y, x) => y * mapWidth + x;
const getCoordinates = (y, x) => [
    Math.trunc(convertCoordY(x, y) * mapScale),
    Math.trunc(convertCoordX(x, y) * mapScale)
];

/**
 * ------------------------------------------------------------------------
 * Setup map
 * ------------------------------------------------------------------------
 */

const ports = readJson(path.resolve(baseAPIFilename, `${serverNames[0]}-Ports-${serverDate}.json`));
const portIds = ports.map(port => Number(port.Id));
const numPorts = portIds.length;

/**
 * @typedef {Array} GridMap
 * @property {number} 0 - type (spotLand, spotWater, port id)
 */

/**
 * Convert png to map (black -> spotLand, white -> spotWater)
 *
 * @type {GridMap}
 */
const map = new Array(mapWidth * mapHeight)
    .fill()
    .map((e, index) => (png.data[index << 2] > 127 ? spotWater : spotLand));

// Add port id to port entrances
ports.forEach(({ Id, EntrancePosition: { z: y, x } }) => {
    const [portY, portX] = getCoordinates(y, x);
    const index = getIndex(portY, portX);

    map[index] = Number(Id);
});

/**
 * ------------------------------------------------------------------------
 * Global variables
 * ------------------------------------------------------------------------
 */

// Outer-grid land borders
const visitedPositionsDefault = new Set();

/**
 * @typedef {Array} Distances
 * @property {number} 0 - From port id
 * @property {number} 1 - To port id
 * @property {number} 2 - Distance (in pixels)
 */

/**
 * Distances between all ports
 *
 * @type {Distances}
 */
const distances = [];

/**
 * Set of start ports so far
 *
 * @type {Set<number>}
 */
const startPortIds = new Set();

/**
 * Find shortest paths between start port and all other ports (breadth first search).
 *
 * @param {number} startPortId - Start port id
 * @param {number} startY Start - Start port y position
 * @param {number} startX Start - Start port x position
 */
const findPaths = (startPortId, startY, startX) => {
    // Add outer-grid land borders
    const visitedPositions = new Set(visitedPositionsDefault);
    // Queue holds unchecked positions ([index, distance from start port])
    const queue = new Denque();

    // Add start port
    const startIndex = getIndex(startY, startX);
    const foundPortIds = new Set();
    startPortIds.add(startPortId);
    visitedPositions.add(startIndex);
    queue.push([startIndex, 0]);

    while (foundPortIds.size + startPortIds.size < numPorts && !queue.isEmpty()) {
        let [pos, distance] = queue.shift();
        distance++;

        // Check if port is found
        if (map[pos] > startPortId) {
            distances.push([startPortId, map[pos], distance]);
            foundPortIds.add(map[pos]);
        }

        // Check all nine neighbour positions ([-1, 0, 1][-1, 0, 1])
        for (let y = -mapWidth; y <= mapWidth; y += mapWidth) {
            for (let x = -1; x <= 1; x += 1) {
                const index = pos + y + x;
                // Add not visited non-land neighbour index
                if (!visitedPositions.has(index) && map[index] !== spotLand) {
                    visitedPositions.add(index);
                    queue.push([index, distance]);
                }
            }
        }
    }

    if (foundPortIds.size + startPortIds.size < numPorts) {
        const missingPortIds = portIds
            .filter(portId => portId > startPortId && !foundPortIds.has(portId))
            .sort((a, b) => a - b);
        console.error(
            "Only",
            foundPortIds.size + startPortIds.size,
            "of all",
            numPorts,
            "ports found! Ports",
            missingPortIds,
            "are missing."
        );
        missingPortIds.forEach(missingPortId => {
            distances.push([startPortId, missingPortId, 0]);
        });
    }
};

/**
 *  Set outer-grid borders to land as a barrier
 *
 *  @return {void}
 */
const setVisitedPositionsDefault = () => {
    // Define outer bounds (map grid covers [0, mapSize-1])
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

/**
 *  Calculate distances between all ports
 *
 *  @return {void}
 */
const getDistances = async () => {
    setVisitedPositionsDefault();
    //    const selectedPorts = [4, 176, 201, 256, 287, 355, 374];

    console.time("findPath");
    ports
        .sort((a, b) => Number(a.Id) - Number(b.Id))
        //        .filter(fromPort => selectedPorts.includes(Number(fromPort.Id)))
        .forEach(fromPort => {
            const fromPortId = Number(fromPort.Id);
            const {
                EntrancePosition: { z: y, x }
            } = fromPort;
            const [fromPortY, fromPortX] = getCoordinates(y, x);

            findPaths(fromPortId, fromPortY, fromPortX);

            console.timeLog("findPath", `${fromPort.Id} ${fromPort.Name} (${fromPortY}, ${fromPortX})`);
        });

    console.timeEnd("findPath");

    await saveJsonAsync(distancesFile, distances);
};

getDistances();
