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
import { default as Immutable } from "immutable"
import { default as PNG } from "pngjs"

import { baseAPIFilename, commonPaths, serverStartDate as serverDate } from "../common/common-dir"
import { readJson, saveJsonAsync, xz } from "../common/common-file"
import { convertCoordX, convertCoordY, Distance, Point } from "../common/common-math"
import { serverNames } from "../common/common-var"

import { APIPort } from "./api-port"

type Index = number
type PixelDistance = number
type SpotType = number

interface GridMap extends Array<SpotType> {
    [index: number]: SpotType // type (spotLand, spotWater, port id)
}

class Port {
    apiPorts: APIPort[] = []
    #fileName: string
    numPorts = 0
    portIds: number[] = []

    constructor() {
        this.#fileName = path.resolve(baseAPIFilename, `${serverNames[0]}-Ports-${serverDate}.json`)

        xz("unxz", `${this.#fileName}.xz`)
        this.apiPorts = readJson(this.#fileName)
        xz("xz", this.#fileName)
        this.portIds = this.apiPorts.map((port: APIPort) => Number(port.Id))
        this.numPorts = this.portIds.length
    }

    getCoordinates(y: number, x: number, mapScale: number): Point {
        return [Math.trunc(convertCoordY(x, y) * mapScale), Math.trunc(convertCoordX(x, y) * mapScale)]
    }
}

class PixelMap {
    #distances: Distance[] = []
    #distancesFile = path.resolve(commonPaths.dirGenGeneric, "distances-copy.json")
    #map: GridMap = {} as GridMap
    #mapHeight!: number
    #mapScale!: number
    #mapWidth!: number
    #port: Port = {} as Port
    #completedPorts: Set<number> = new Set()
    #LAND = 0
    #WATER = 0
    #VISITED = 0
    #FLAGS = 0

    #cutMinY = 0
    #cutMinX = 0
    private selectedPorts!: Map<number, [number, number]>

    constructor() {
        this.#port = new Port()

        this.setBitFlags()
        this.readMap()
        this.mapInit()
        this.setBorders()

        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.getAndSaveDistances()
    }

    printMap(): void {
        const minY = 0
        const maxY = this.#mapHeight - 1
        const minX = 0
        const maxX = this.#mapWidth - 1

        let index = 0
        for (let x = minX; x <= maxX; x += 1) {
            let h = ""
            for (let y = minY; y <= maxY; y += 1) {
                const spot = this.getSpot(index)
                if (spot & this.#VISITED) {
                    h += "X"
                } else if (spot & this.#WATER) {
                    h += " "
                } else if (spot & this.#LAND) {
                    h += "~"
                } else {
                    h += "*"
                }

                index++
            }

            console.log(h)
        }
    }

    setBitFlags(): void {
        const bitsAvailable = 32
        const bitsForPortIds = Number(this.#port.numPorts).toString(2).length + 1

        if (bitsForPortIds + 3 > bitsAvailable) {
            throw new Error("Too few bits")
        }

        this.#LAND = 1 << bitsForPortIds
        this.#WATER = this.#LAND << 1
        this.#VISITED = this.#WATER << 1
        this.#FLAGS = this.#LAND | this.#WATER | this.#VISITED
    }

    readMap(): void {
        this.#mapHeight = 24
        this.#mapWidth = 24
        this.#mapScale = 1

        console.log(this.#mapHeight, this.#mapWidth)
    }

    mapInit(): void {
        const w = this.#WATER
        const l = this.#LAND

        /*
                this.#map = [
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, l, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, 1, l, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, l, 2, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, l, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, l, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
        ]
         */
        this.#map = [
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, l, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, 1, l, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, l, 2, 3, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, l, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, l, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
            w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w, w,
        ]
    }

    /**
     *  Set map borders as visited
     */
    setBorders(): void {
        // Define outer bounds (map grid covers [0, mapSize-1])
        const minY = this.#cutMinY
        const maxY = this.#cutMinY + this.#mapHeight - 1
        const minX = this.#cutMinX
        const maxX = this.#cutMinX + this.#mapWidth - 1

        for (let y = minY; y <= maxY; y += this.#mapHeight - 1) {
            for (let x = minX; x <= maxX; x += 1) {
                this.visit(this.getIndex(y, x))
            }
        }

        for (let y = minY; y <= maxY; y += 1) {
            for (let x = minX; x <= maxX; x += this.#mapWidth - 1) {
                this.visit(this.getIndex(y, x))
            }
        }
    }

    resetVisitedSpots(): void {
        const minY = this.#cutMinY + 1
        const maxY = this.#cutMinY + this.#mapHeight - 2
        const minX = this.#cutMinX + 1
        const maxX = this.#cutMinX + this.#mapWidth - 2

        for (let y = minY; y <= maxY; y += 1) {
            for (let x = minX; x <= maxX; x += 1) {
                this.resetVisit(this.getIndex(y, x))
            }
        }
    }

    /**
     * Find shortest paths between start port and all other ports (breadth first search).
     */
    findPaths(
        startPortId: number, // Start port id
        startY: number, // Start port y position
        startX: number // Start port x position
    ): void {
        console.log(startPortId, startY, startX)
        this.printMap()
        const foundPortIds = new Set<number>()
        this.resetVisitedSpots()
        this.printMap()

        // Add start port
        const startIndex = this.getIndex(startY, startX)
        this.#completedPorts.add(startPortId)
        this.visit(startIndex)

        // Queue holds unchecked positions ([index, distance from start port])
        let queue = Immutable.List<[Index, PixelDistance]>([[startIndex, 0]])

        while (!queue.isEmpty()) {
            let [index, pixelDistance]: [Index, PixelDistance] = queue.first()
            queue = queue.shift()
            const spot = this.getPortId(this.getSpot(index))

            // console.log([startPortId, spot, index, pixelDistance])

            // Check if port is found
            if (spot > startPortId) {
                console.log([startPortId, spot, index, pixelDistance])
                this.#distances.push([startPortId, spot, pixelDistance])
                foundPortIds.add(spot)
                this.printMap()
            }

            pixelDistance++

            // Check all nine neighbour positions ([-1, 0, 1][-1, 0, 1])
            for (let y = -this.#mapWidth; y <= this.#mapWidth; y += this.#mapWidth) {
                for (let x = -1; x <= 1; x += 1) {
                    const neighbourIndex: Index = index + y + x
                    // Add not visited non-land neighbour index
                    if (this.isSpotNotVisitedNonLand(neighbourIndex)) {
                        this.visit(neighbourIndex)
                        queue = queue.push([neighbourIndex, pixelDistance])
                    }
                }
            }
        }
    }

    /**
     *  Calculate distances between all ports
     */
    async getAndSaveDistances(): Promise<void> {
        try {
            console.time("findPath")
            // this.selectedPorts = new Set([230, 231, 232, 233, 234, 235, 236, 237, 238])
            // this.selectedPorts = new Set([231, 232, 233, 234, 235, 236, 237])
            this.selectedPorts = new Map([
                [1, [3, 1]],
                [2, [4, 3]],
            ])
            for (const [fromPortId, coord] of this.selectedPorts) {
                const [fromPortY, fromPortX] = coord

                this.findPaths(fromPortId, fromPortY, fromPortX)

                console.timeLog("findPath", `${fromPortId} (${fromPortY}, ${fromPortX})`)
            }

            console.timeEnd("findPath")

            await saveJsonAsync(this.#distancesFile, this.#distances)
        } catch (error) {
            console.error("Map distance error:", error)
        }
    }

    getIndex(y: number, x: number): Index {
        return (y - this.#cutMinY) * this.#mapWidth + (x - this.#cutMinX)
    }

    getSpot(index: number): SpotType {
        return this.#map[index]
    }

    setPortSpot(index: number, spot: SpotType): void {
        this.#map[index] = spot
    }

    visit(index: Index): void {
        this.#map[index] |= this.#VISITED
    }

    resetVisit(index: Index): void {
        this.#map[index] &= ~this.#VISITED
    }

    getPortId(spot: SpotType): number {
        return spot & ~this.#FLAGS
    }

    isSpotNotVisitedNonLand(neighbourIndex: Index): boolean {
        const spot = this.getSpot(neighbourIndex)
        return !(spot & this.#VISITED) && !(spot & this.#LAND)
    }
}

const map = new PixelMap()
