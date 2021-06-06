/*!
 * This file is part of na-map.
 *
 * @file      Get distances for front lines.
 * @module    src/node/get-distances
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import * as fs from "fs"
import path from "path"
import Deque from "collections/deque"
import { default as PNG } from "pngjs"

import { currentServerStartDate as serverDate } from "../common/common"
import { getCommonPaths } from "../common/common-dir"
import { readJson, saveJsonAsync, xz } from "../common/common-file"
import { convertCoordX, convertCoordY, Distance, Point } from "../common/common-math"
import { baseAPIFilename, simpleNumberSort } from "../common/common-node"
import { distanceMapSize, mapSize } from "../common/common-var"
import { serverIds } from "../common/servers"

import { APIPort } from "./api-port"

type Index = number
type PixelDistance = number
type SpotType = number

// type (spotLand, spotWater, port id)
type GridMap = SpotType[]

const commonPaths = getCommonPaths()

class Port {
    apiPorts: APIPort[] = []
    #fileName: string
    numPorts = 0
    portIds: number[] = []

    constructor() {
        this.#fileName = path.resolve(baseAPIFilename, `${serverIds[0]}-Ports-${serverDate}.json`)

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

class Map {
    #mapFileName = path.resolve(commonPaths.dirSrc, "images", `frontline-map-${distanceMapSize}.png`)
    #pngData!: Buffer
    #distances: Distance[] = []
    #distancesFile = path.resolve(commonPaths.dirGenGeneric, "distances.json")
    #map: GridMap = [] as GridMap
    #mapHeight!: number
    #mapScale!: number
    #mapWidth!: number
    #port: Port = {} as Port
    #completedPorts: Set<number> = new Set()
    #LAND = 0
    #WATER = 0
    #VISITED = 0
    #FLAGS = 0

    constructor() {
        this.#port = new Port()

        this.setBitFlags()
        this.readMap()
        this.mapInit()
        this.setPorts()
        this.setBorders()
        void this.getAndSaveDistances()
    }

    setBitFlags(): void {
        const bitsAvailable = 16
        const bitsForPortIds = Number(this.#port.numPorts).toString(2).length + 1

        if (bitsForPortIds + 3 > bitsAvailable) {
            const errorMessage = `Too few bits: available ${bitsAvailable} bits, needed ${bitsForPortIds + 3} bits`
            throw new Error(errorMessage)
        }

        this.#LAND = 1 << bitsForPortIds
        this.#WATER = this.#LAND << 1
        this.#VISITED = this.#WATER << 1
        this.#FLAGS = this.#LAND | this.#WATER | this.#VISITED
    }

    readMap(): void {
        // Read map file
        const fileData = fs.readFileSync(this.#mapFileName)
        // Read map file content as png
        const png = PNG.PNG.sync.read(fileData)

        this.#mapHeight = png.height // y
        this.#mapWidth = png.width // x
        this.#mapScale = this.#mapWidth / mapSize
        this.#pngData = png.data

        console.log(this.#mapHeight, this.#mapWidth)
    }

    mapInit(): void {
        /**
         * Convert png to map (black --\> spot type 'land', white --\> spot type 'water')
         */
        this.#map = [...new Uint16Array(this.#mapWidth * this.#mapHeight)].map((_, index) =>
            this.#pngData[index << 2] > 127 ? this.#WATER : this.#LAND
        )
    }

    /*
     * Add port id to port entrances
     */
    setPorts(): void {
        for (const {
            Id,
            EntrancePosition: { z: y, x },
        } of this.#port.apiPorts) {
            const [portY, portX] = this.#port.getCoordinates(y, x, this.#mapScale)
            const index = this.getIndex(portY, portX)

            this.setPortSpot(index, Number(Id))
        }
    }

    /**
     *  Set map borders as visited
     */
    setBorders(): void {
        // Define outer bounds (map grid covers [0, mapSize-1])
        const minY = 0
        const maxY = this.#mapHeight - 1
        const minX = 0
        const maxX = this.#mapWidth - 1

        for (let y = minY; y <= maxY; y += maxY) {
            for (let x = minX; x <= maxX; x += 1) {
                this.visit(this.getIndex(y, x))
            }
        }

        for (let y = minY; y <= maxY; y += 1) {
            for (let x = minX; x <= maxX; x += maxX) {
                this.visit(this.getIndex(y, x))
            }
        }
    }

    resetVisitedSpots(): void {
        const minY = 1
        const maxY = this.#mapHeight - 2
        const minX = 1
        const maxX = this.#mapWidth - 2

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
        const foundPortIds = new Set<number>()

        this.resetVisitedSpots()

        // Add start port
        const startIndex = this.getIndex(startY, startX)
        this.#completedPorts.add(startPortId)
        this.visit(startIndex)

        // Queue holds unchecked positions ([index, distance from start port])
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const queue = new Deque([[startIndex, 0]])

        while (foundPortIds.size + this.#completedPorts.size < this.#port.numPorts && queue.length > 0) {
            let [index, pixelDistance] = queue.shift() as [Index, PixelDistance]
            const spot = this.getPortId(this.getSpot(index))

            // Check if port is found
            if (spot > startPortId) {
                // console.log([startPortId, portId, index, pixelDistance])
                this.#distances.push([startPortId, spot, pixelDistance])
                foundPortIds.add(spot)
            }

            pixelDistance++

            // Check all nine neighbour positions ([-1, 0, 1][-1, 0, 1])
            for (let y = -this.#mapWidth; y <= this.#mapWidth; y += this.#mapWidth) {
                for (let x = -1; x <= 1; x += 1) {
                    const neighbourIndex: Index = index + y + x
                    // Add not visited non-land neighbour index
                    if (this.isSpotNotVisitedNonLand(neighbourIndex)) {
                        this.visit(neighbourIndex)
                        queue.push([neighbourIndex, pixelDistance])
                    }
                }
            }
        }

        // Check for missing ports
        if (foundPortIds.size + this.#completedPorts.size < this.#port.numPorts) {
            const missingPortIds = this.#port.portIds
                .filter((portId: number) => portId > startPortId && !foundPortIds.has(portId))
                .sort(simpleNumberSort)
            console.error(
                "Only",
                foundPortIds.size + this.#completedPorts.size,
                "of all",
                this.#port.numPorts,
                "ports found! Ports",
                missingPortIds,
                "are missing."
            )
            for (const missingPortId of missingPortIds) {
                this.#distances.push([startPortId, missingPortId, 0])
            }
        }
    }

    /**
     *  Calculate distances between all ports
     */
    async getAndSaveDistances(): Promise<void> {
        try {
            console.time("findPath")
            for (const fromPort of this.#port.apiPorts.sort((a: APIPort, b: APIPort) => Number(a.Id) - Number(b.Id))) {
                const fromPortId = Number(fromPort.Id)
                const {
                    EntrancePosition: { z: y, x },
                    Name: name,
                } = fromPort
                const [fromPortY, fromPortX] = this.#port.getCoordinates(y, x, this.#mapScale)

                this.findPaths(fromPortId, fromPortY, fromPortX)

                console.timeLog("findPath", `${fromPortId} ${name} (${fromPortY}, ${fromPortX})`)
            }

            console.timeEnd("findPath")

            await saveJsonAsync(
                this.#distancesFile,
                this.#distances.sort((a, b) => {
                    if (a[0] === b[0]) {
                        return a[1] - b[1]
                    }

                    return a[0] - b[0]
                })
            )
        } catch (error: unknown) {
            console.error("Map distance error:", error)
        }
    }

    getIndex(y: number, x: number): Index {
        return y * this.#mapWidth + x
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

void new Map()
