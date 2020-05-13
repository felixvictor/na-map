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
import { simpleNumberSort } from "../common/common-node"
import { serverNames } from "../common/common-var"

import { APIPort } from "./api-port"

type Index = number
type PixelDistance = number
type SpotType = number

interface GridMap {
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

    getCoordinates(y: number, x: number): Point {
        return [Math.trunc(convertCoordY(x, y)), Math.trunc(convertCoordX(x, y))]
    }
}

class Map {
    #mapFileName = path.resolve(commonPaths.dirSrc, "images", "frontline-map.png")
    #pngData!: Buffer
    #spotLand: SpotType = -1
    #spotWater: SpotType = 0
    #distances: Distance[] = []
    #distancesFile = path.resolve(commonPaths.dirGenGeneric, "distances-bit.json")
    #map: GridMap = {}
    #mapHeight!: number
    #mapWidth!: number
    #port: Port = {} as Port
    #startPortIds: Set<number> = new Set()
    #visitedPositionsDefault: number[] = [] // Outer-grid land borders

    constructor() {
        this.#port = new Port()

        this.readMap()
        this.mapInit()
        this.#visitedPositionsDefault = [...this.getVisitedPositionsDefault()]

        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.getAndSaveDistances()
    }

    readMap(): void {
        // Read map file
        const fileData = fs.readFileSync(this.#mapFileName)
        // Read map file content as png
        const png = PNG.PNG.sync.read(fileData)

        this.#mapHeight = png.height // y
        this.#mapWidth = png.width // x
        this.#pngData = png.data
    }

    mapInit(): void {
        /**
         * Convert png to map (black -\> spotLand, white -\> spotWater)
         */
        this.#map = new Array(this.#mapWidth * this.#mapHeight)
            .fill(0)
            .map((_e, index: number) => (this.#pngData[index << 2] > 127 ? this.#spotWater : this.#spotLand))

        // Add port id to port entrances
        this.#port.apiPorts.forEach(({ Id, EntrancePosition: { z: y, x } }: APIPort) => {
            const [portY, portX] = this.#port.getCoordinates(y, x)
            const index = this.getIndex(portY, portX)

            this.setSpot(index, Number(Id))
        })
    }

    /**
     *  Set outer-grid borders to land as a barrier
     */
    getVisitedPositionsDefault(): Set<number> {
        // Define outer bounds (map grid covers [0, mapSize-1])
        const minY = 0
        const minX = 0
        const maxY = this.#mapHeight
        const maxX = this.#mapWidth
        const positions = new Set<number>()

        for (let y = minY; y <= maxY; y += maxY + 1) {
            for (let x = minX; x <= maxX; x += 1) {
                positions.add(this.getIndex(y, x))
            }
        }

        for (let y = minY; y <= maxY; y += 1) {
            for (let x = minX; x <= maxX; x += maxX + 1) {
                positions.add(this.getIndex(y, x))
            }
        }

        return positions
    }

    /**
     * Find shortest paths between start port and all other ports (breadth first search).
     */
    findPaths(
        startPortId: number, // Start port id
        startY: number, // Start port y position
        startX: number // Start port x position
    ): void {
        // Add outer-grid land borders
        let visitedPositions = Immutable.Set<Index>(this.#visitedPositionsDefault)

        // Add start port
        const startIndex = this.getIndex(startY, startX)
        const foundPortIds = new Set<number>()
        this.#startPortIds.add(startPortId)
        visitedPositions = visitedPositions.add(startIndex)
        // Queue holds unchecked positions ([index, distance from start port])
        let queue = Immutable.List<[Index, PixelDistance]>([[startIndex, 0]])

        while (foundPortIds.size + this.#startPortIds.size < this.#port.numPorts && !queue.isEmpty()) {
            let [index, pixelDistance]: [Index, PixelDistance] = queue.first()
            queue = queue.shift()
            pixelDistance++
            const spot = this.getSpot(index)

            // Check if port is found
            if (spot > startPortId) {
                // console.log([startPortId, spot, pixelDistance])
                this.#distances.push([startPortId, spot, pixelDistance])
                foundPortIds.add(spot)
            }

            // Check all nine neighbour positions ([-1, 0, 1][-1, 0, 1])
            for (let y = -this.#mapWidth; y <= this.#mapWidth; y += this.#mapWidth) {
                for (let x = -1; x <= 1; x += 1) {
                    const neighbourIndex: Index = index + y + x
                    // Add not visited non-land neighbour index
                    if (!visitedPositions.has(neighbourIndex) && this.isSpotNotLand(neighbourIndex)) {
                        visitedPositions = visitedPositions.add(neighbourIndex)
                        queue = queue.push([neighbourIndex, pixelDistance])
                    }
                }
            }
        }

        if (foundPortIds.size + this.#startPortIds.size < this.#port.numPorts) {
            const missingPortIds = this.#port.portIds
                .filter((portId: number) => portId > startPortId && !foundPortIds.has(portId))
                .sort(simpleNumberSort)
            console.error(
                "Only",
                foundPortIds.size + this.#startPortIds.size,
                "of all",
                this.#port.numPorts,
                "ports found! Ports",
                missingPortIds,
                "are missing."
            )
            missingPortIds.forEach((missingPortId: number) => {
                this.#distances.push([startPortId, missingPortId, 0])
            })
        }
    }

    /**
     *  Calculate distances between all ports
     */
    async getAndSaveDistances(): Promise<void> {
        try {
            console.time("findPath")
            this.#port.apiPorts
                .sort((a: APIPort, b: APIPort) => Number(a.Id) - Number(b.Id))
                .forEach((fromPort: APIPort) => {
                    const fromPortId = Number(fromPort.Id)
                    const {
                        EntrancePosition: { z: y, x },
                    } = fromPort
                    const [fromPortY, fromPortX] = this.#port.getCoordinates(y, x)

                    this.findPaths(fromPortId, fromPortY, fromPortX)

                    console.timeLog("findPath", `${fromPortId} ${fromPort.Name} (${fromPortY}, ${fromPortX})`)
                })

            console.timeEnd("findPath")

            await saveJsonAsync(this.#distancesFile, this.#distances)
        } catch (error) {
            console.error("Map distance error:", error)
        }
    }

    getIndex(y: number, x: number): Index {
        return y * this.#mapWidth + x
    }

    getSpot(index: number): SpotType {
        return this.#map[index]
    }

    setSpot(index: number, spot: SpotType): void {
        this.#map[index] = spot
    }

    isSpotNotLand(neighbourIndex: number): boolean {
        return this.getSpot(neighbourIndex) !== this.#spotLand
    }
}

const bitsAvailable = 32
const bitsForPortIds = Number(378).toString(2).length
console.log(bitsAvailable, bitsForPortIds, bitsForPortIds + 3 < bitsAvailable)
// process.exit()

const map = new Map()
