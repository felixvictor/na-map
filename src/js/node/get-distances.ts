/*!
 * This file is part of na-map.
 *
 * @file      Get distances for front lines.
 * @module    src/node/get-distances
 * @author    iB aka Felix Victor
 * @copyright 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import * as fs from "fs"
import * as path from "path"
import { default as Denque } from "denque"
import { default as PNG } from "pngjs"

import { baseAPIFilename, commonPaths, serverStartDate as serverDate } from "../common/common-dir"
import { readJson, saveJsonAsync, xz } from "../common/common-file"
import { convertCoordX, convertCoordY, Distance, Point } from "../common/common-math"
import { simpleNumberSort, sortBy } from "../common/common-node"
import { distanceMapSize, serverNames } from "../common/common-var"

import { APIPort } from "./api-port"

/**
 * ------------------------------------------------------------------------
 * Constants
 * ------------------------------------------------------------------------
 */

const mapFileName = path.resolve(commonPaths.dirSrc, "images", `frontline-map-${distanceMapSize}.png`)
const distancesFile = path.resolve(commonPaths.dirGenGeneric, `distances-${distanceMapSize}.json`)

const spotWater = 0
const spotLand = -1

/**
 * ------------------------------------------------------------------------
 * Load map and set map related constants
 * ------------------------------------------------------------------------
 */

// Read map file
const fileData = fs.readFileSync(mapFileName)
// Read map file content as png
const png = PNG.PNG.sync.read(fileData)

const mapHeight = png.height // y
const mapWidth = png.width // x
const origMapSize = 8192
const mapScale = mapWidth / origMapSize

/**
 * ------------------------------------------------------------------------
 * Helper functions
 * ------------------------------------------------------------------------
 */

const getIndex = (y: number, x: number): number => y * mapWidth + x
const getCoordinates = (y: number, x: number): Point => [
    Math.trunc(convertCoordY(x, y) * mapScale),
    Math.trunc(convertCoordX(x, y) * mapScale),
]

/**
 * ------------------------------------------------------------------------
 * Setup map
 * ------------------------------------------------------------------------
 */

const fileName = path.resolve(baseAPIFilename, `${serverNames[0]}-Ports-${serverDate}.json`)
let apiPorts: APIPort[] = []
let portIds: number[] = []
let numPorts = 0

interface GridMap {
    [index: number]: number // type (spotLand, spotWater, port id)
}

/**
 * ------------------------------------------------------------------------
 * Global variables
 * ------------------------------------------------------------------------
 */

/**
 * Convert png to map (black -\> spotLand, white -\> spotWater)
 */
const map: GridMap = new Array(mapWidth * mapHeight)
    .fill(0)
    .map((_e, index: number) => (png.data[index << 2] > 127 ? spotWater : spotLand))

// Outer-grid land borders
const visitedPositionsDefault = new Set<number>()

/**
 * Distance between all ports
 */
const distances: Distance[] = []

/**
 * Set of start ports so far
 */
const startPortIds: Set<number> = new Set()

/**
 * Find shortest paths between start port and all other ports (breadth first search).
 */
const findPaths = (
    startPortId: number, // Start port id
    startY: number, // Start port y position
    startX: number // Start port x position
): void => {
    // Add outer-grid land borders
    const visitedPositions = new Set<number>(visitedPositionsDefault)
    // Queue holds unchecked positions ([index, distance from start port])
    const queue = new Denque()

    // Add start port
    const startIndex = getIndex(startY, startX)
    const foundPortIds = new Set<number>()
    startPortIds.add(startPortId)
    visitedPositions.add(startIndex)
    queue.push([startIndex, 0])

    while (foundPortIds.size + startPortIds.size < numPorts && !queue.isEmpty()) {
        let [pos, distance]: [number, number] = queue.shift()
        distance++

        // Check if port is found
        if (map[pos] > startPortId) {
            distances.push([startPortId, map[pos], distance])
            foundPortIds.add(map[pos])
        }

        // Check all nine neighbour positions ([-1, 0, 1][-1, 0, 1])
        for (let y = -mapWidth; y <= mapWidth; y += mapWidth) {
            for (let x = -1; x <= 1; x += 1) {
                const index = pos + y + x
                // Add not visited non-land neighbour index
                if (!visitedPositions.has(index) && map[index] !== spotLand) {
                    visitedPositions.add(index)
                    queue.push([index, distance])
                }
            }
        }
    }

    if (foundPortIds.size + startPortIds.size < numPorts) {
        const missingPortIds = portIds
            .filter((portId: number) => portId > startPortId && !foundPortIds.has(portId))
            .sort(simpleNumberSort)
        console.error(
            "Only",
            foundPortIds.size + startPortIds.size,
            "of all",
            numPorts,
            "ports found! Ports",
            missingPortIds,
            "are missing."
        )
        missingPortIds.forEach((missingPortId: number) => {
            distances.push([startPortId, missingPortId, 0])
        })
    }
}

/**
 *  Set outer-grid borders to land as a barrier
 */
const setVisitedPositionsDefault = (): void => {
    // Define outer bounds (map grid covers [0, mapSize-1])
    const minY = -1
    const minX = -1
    const maxY = mapHeight
    const maxX = mapWidth

    for (let y = minY; y <= maxY; y += maxY + 1) {
        for (let x = minX; x <= maxX; x += 1) {
            visitedPositionsDefault.add(getIndex(y, x))
        }
    }

    for (let y = minY; y <= maxY; y += 1) {
        for (let x = minX; x <= maxX; x += maxX + 1) {
            visitedPositionsDefault.add(getIndex(y, x))
        }
    }
}

/**
 *  Calculate distances between all ports
 */
const getDistances = async (): Promise<void> => {
    setVisitedPositionsDefault()
    //    const selectedPorts = [4, 176, 201, 256, 287, 355, 374];
    try {
        console.time("findPath")
        apiPorts
            .sort((a: APIPort, b: APIPort) => Number(a.Id) - Number(b.Id))
            //        .filter(fromPort => selectedPorts.includes(Number(fromPort.Id)))
            .forEach((fromPort: APIPort) => {
                const fromPortId = Number(fromPort.Id)
                const {
                    EntrancePosition: { z: y, x },
                } = fromPort
                const [fromPortY, fromPortX] = getCoordinates(y, x)

                findPaths(fromPortId, fromPortY, fromPortX)

                console.timeLog("findPath", `${fromPortId} ${fromPort.Name} (${fromPortY}, ${fromPortX})`)
            })

        console.timeEnd("findPath")

        await saveJsonAsync(distancesFile, distances)
    } catch (error) {
        console.error("Map distance error:", error)
    }
}

xz("unxz", `${fileName}.xz`)
apiPorts = readJson(fileName)
portIds = apiPorts.map((port: APIPort) => Number(port.Id))
numPorts = portIds.length

// Add port id to port entrances
apiPorts.forEach(({ Id, EntrancePosition: { z: y, x } }: APIPort) => {
    const [portY, portX] = getCoordinates(y, x)
    const index = getIndex(portY, portX)

    map[index] = Number(Id)
})

// noinspection JSIgnoredPromiseFromCall
getDistances()

xz("xz", fileName)
