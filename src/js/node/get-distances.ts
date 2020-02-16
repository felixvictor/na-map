#!/usr/bin/env -S yarn node --experimental-specifier-resolution=node
// #!/usr/bin/env -S yarn tsc --esModuleInterop --module esnext --moduleResolution node --target ESNEXT

/**
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
import { convertCoordX, convertCoordY, Point, readJson, saveJsonAsync, serverNames } from "../common"
import { baseAPIFilename, commonPaths, distanceMapSize, serverStartDate as serverDate } from "./common-node"

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
    Math.trunc(convertCoordX(x, y) * mapScale)
]

/**
 * ------------------------------------------------------------------------
 * Setup map
 * ------------------------------------------------------------------------
 */

interface Port {
    Id: string
    EntrancePosition: {
        z: number
        x: number
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
}

const apiPorts = readJson(path.resolve(baseAPIFilename, `${serverNames[0]}-Ports-${serverDate}.json`)) as Port[]
const portIds = apiPorts.map((port: Port) => Number(port.Id))
const numPorts = portIds.length

interface GridMap {
    [index: number]: number // type (spotLand, spotWater, port id)
}

// noinspection MagicNumberJS
/**
 * Convert png to map (black -> spotLand, white -> spotWater)
 */
const map: GridMap = new Array(mapWidth * mapHeight)
    .fill(0)
    .map((e: number, index: number) => (png.data[index << 2] > 127 ? spotWater : spotLand))

// Add port id to port entrances
apiPorts.forEach(({ Id, EntrancePosition: { z: y, x } }: Port) => {
    const [portY, portX] = getCoordinates(y, x)
    const index = getIndex(portY, portX)

    map[index] = Number(Id)
})

/**
 * ------------------------------------------------------------------------
 * Global variables
 * ------------------------------------------------------------------------
 */

// Outer-grid land borders
const visitedPositionsDefault = new Set()

interface Distances extends Array<number> {
    0: number // From port id
    1: number // To port id
    2: number // Distance (in pixels)
}

/**
 * Distances between all ports
 */
const distances: Distances[] = []

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
    const visitedPositions = new Set(visitedPositionsDefault)
    // Queue holds unchecked positions ([index, distance from start port])
    const queue = new Denque()

    // Add start port
    const startIndex = getIndex(startY, startX)
    const foundPortIds = new Set()
    startPortIds.add(startPortId)
    visitedPositions.add(startIndex)
    queue.push([startIndex, 0])

    while (foundPortIds.size + startPortIds.size < numPorts && !queue.isEmpty()) {
        let [pos, distance] = queue.shift()
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
            .sort((a: number, b: number): number => a - b)
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
 *
 *  @return {void}
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
 *
 *  @return {void}
 */
const getDistances = async (): Promise<void> => {
    setVisitedPositionsDefault()
    //    const selectedPorts = [4, 176, 201, 256, 287, 355, 374];

    console.time("findPath")
    apiPorts
        .sort((a: Port, b: Port) => Number(a.Id) - Number(b.Id))
        //        .filter(fromPort => selectedPorts.includes(Number(fromPort.Id)))
        .forEach((fromPort: Port) => {
            const fromPortId = Number(fromPort.Id)
            const {
                EntrancePosition: { z: y, x }
            } = fromPort
            const [fromPortY, fromPortX] = getCoordinates(y, x)

            findPaths(fromPortId, fromPortY, fromPortX)

            console.timeLog("findPath", `${fromPort.Id} ${fromPort.Name} (${fromPortY}, ${fromPortX})`)
        })

    console.timeEnd("findPath")

    await saveJsonAsync(distancesFile, distances)
}

getDistances()
