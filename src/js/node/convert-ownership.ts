/*!
 * This file is part of na-map.
 *
 * @file      Convert port ownership.
 * @module    convert-ownership
 * @author    iB aka Felix Victor
 * @copyright 2018, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import * as fs from "fs"
import { Stats } from "fs"
import * as path from "path"

import d3Collection from "d3-collection"
import d3Array from "d3-array"
const { nest: d3Nest } = d3Collection
const { ascending: d3Ascending } = d3Array

import { default as lzma } from "lzma-native"
import { default as readDirRecursive } from "recursive-readdir"

import { capitalToCounty, nations } from "../common/common"
import { commonPaths } from "../common/common-dir"
import { saveJsonAsync } from "../common/common-file"
import { serverNames } from "../common/common-var"
import { cleanName } from "../common/common-node"

import { APIPort } from "./api-port"
import { NationList, Ownership, OwnershipGroup, OwnershipLabel, OwnershipNation } from "../common/gen-json"

const fileExtension = ".json.xz"

interface Port {
    name: string
    region: string
    county: string
    data: OwnershipOverTime[]
    id?: string
}
interface OwnershipOverTime {
    timeRange: string[]
    val: string
    labelVal: string
}
interface RegionNested {
    key: string
    values: CountyNested[]
}
interface CountyNested {
    key: string
    values: Port[]
}

/**
 * Decompress file content
 * @param compressedContent - Compressed file content
 * @returns Decompressed file content or void
 */
const decompress = (compressedContent: Buffer): Buffer | void => {
    return lzma.decompress(compressedContent, {}, (decompressedContent: Buffer | void, error?: string) => {
        if (error) {
            throw new Error(error)
        }

        return decompressedContent
    })
}

/**
 * Read file content
 * @param fileName - File name
 * @returns Promise
 */
const readFileContent = async (fileName: string): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        fs.readFile(fileName, (error, data) => {
            if (error) {
                reject(error)
            } else {
                resolve(data)
            }
        })
    })
}

/**
 * Sort file names
 * @param fileNames - File names
 * @returns Sorted file names
 */
const sortFileNames = (fileNames: string[]): string[] => {
    return fileNames.sort((a, b) => {
        const ba = path.basename(a)
        const bb = path.basename(b)
        if (ba < bb) {
            return -1
        }

        if (ba > bb) {
            return 1
        }

        return 0
    })
}

/**
 * Retrieve port data for nation/clan ownership
 */
function convertOwnership(): void {
    const ports = new Map() as Map<string, Port>
    const numPortsDates: Array<OwnershipNation<number>> = []
    const fileBaseNameRegex = new RegExp(`${serverNames[0]}-Ports-(20\\d{2}-\\d{2}-\\d{2})${fileExtension}`)

    /**
     * Parse data and construct ports Map
     * @param portData - Port data
     * @param date - current date
     */
    function parseData(portData: APIPort[], date: string): void {
        // console.log("**** new date", date);

        const numPorts = {} as NationList<number>
        nations
            .filter((nation) => nation.id !== 9)
            .forEach((nation) => {
                numPorts[nation.short] = 0
            })

        for (const port of portData) {
            /**
             * Get data object
             */
            const getObject = (): OwnershipOverTime => ({
                timeRange: [date, date],
                val: nations[port.Nation].short,
                labelVal: nations[port.Nation].sortName,
            })

            /**
             * Set initial data
             */
            const initData = (): void => {
                ports.set(port.Id, {
                    name: cleanName(port.Name),
                    region: port.Location,
                    county: capitalToCounty.get(port.CountyCapitalName) ?? "",
                    data: [getObject()],
                })
            }

            /**
             * Get previous nation short name
             * @returns nation short name
             */
            const getPreviousNation = (): string => {
                const portData = ports.get(port.Id)
                if (portData) {
                    const index = portData.data.length - 1 ?? 0
                    return portData.data[index].val
                }

                return ""
            }

            /**
             * Add new nation entry
             */
            const setNewNation = (): void => {
                // console.log("setNewNation -> ", ports.get(port.Id));
                const portData = ports.get(port.Id)
                if (portData) {
                    portData.data.push(getObject())
                    ports.set(port.Id, portData)
                }
            }

            /**
             * Change end date for current nation
             */
            const setNewEndDate = (): void => {
                const portData = ports.get(port.Id)
                if (portData) {
                    // console.log("setNewEndDate -> ", ports.get(port.Id), values);
                    portData.data[portData.data.length - 1].timeRange[1] = date
                    ports.set(port.Id, portData)
                }
            }

            // Exclude free towns
            if (port.Nation !== 9) {
                const currentNation = nations[port.Nation].short
                numPorts[currentNation] = Number(numPorts[currentNation]) + 1
                if (ports.get(port.Id)) {
                    // console.log("ports.get(port.Id)");
                    const oldNation = getPreviousNation()
                    if (currentNation === oldNation) {
                        setNewEndDate()
                    } else {
                        setNewNation()
                    }
                } else {
                    // console.log("!ports.get(port.Id)");
                    initData()
                }
            }
        }

        const numPortsDate = {} as OwnershipNation<number>
        numPortsDate.date = date
        nations
            .filter((nation) => nation.id !== 9)
            .forEach((nation) => {
                numPortsDate[nation.short] = numPorts[nation.short]
            })
        numPortsDates.push(numPortsDate)
        // console.log("**** 138 -->", ports.get("138"));
    }

    /**
     * Process all files
     * @param fileNames - File names
     * @returns Resolved promise
     */
    const processFiles = async (fileNames: string[]): Promise<any> => {
        return fileNames.reduce(
            async (sequence, fileName) =>
                sequence
                    .then(async () => readFileContent(fileName))
                    .then((compressedContent) => decompress(compressedContent))
                    .then((decompressedContent) => {
                        if (decompressedContent) {
                            const currentDate = (fileBaseNameRegex.exec(path.basename(fileName)) ?? [])[1]
                            parseData(JSON.parse(decompressedContent.toString()), currentDate)
                        }
                    })
                    .catch((error) => {
                        throw new Error(error)
                    }),
            Promise.resolve()
        )
    }

    /**
     * Check if file should be ignored
     * @param fileName - File name
     * @param stats - Stat
     * @returns True if file should be ignored
     */
    const ignoreFileName = (fileName: string, stats: Stats): boolean => {
        return !stats.isDirectory() && fileBaseNameRegex.exec(path.basename(fileName)) === null
    }

    /**
     * Write out result
     */
    const writeResult = async (): Promise<void> => {
        const portsArray = [...ports.entries()].map(([key, value]) => {
            value.id = key
            return value
        })

        // Nest by region and county
        const nested = d3Nest<Port>()
            .key((d) => d.region)
            .sortKeys(d3Ascending)
            .key((d) => d.county)
            .sortKeys(d3Ascending)
            .entries(portsArray) as RegionNested[]

        // Convert to data structure needed for timelines-chart
        // region
        // -- group (counties)
        //    -- label (ports)
        const result = nested.map((region) => {
            const newRegion = {} as Ownership
            newRegion.region = region.key
            newRegion.data = region.values.map((county) => {
                const group = {} as OwnershipGroup
                group.group = county.key
                group.data = county.values.map((port) => {
                    const label = {} as OwnershipLabel
                    label.label = port.name
                    label.data = port.data
                    return label
                })
                return group
            })
            return newRegion
        })

        await saveJsonAsync(commonPaths.fileOwnership, result)
        await saveJsonAsync(commonPaths.fileNation, numPortsDates)
    }

    readDirRecursive(commonPaths.dirAPI, [ignoreFileName])
        .then((fileNames) => sortFileNames(fileNames))
        .then(async (fileNames) => processFiles(fileNames))
        .then(async () => writeResult())
        .catch((error) => {
            throw new Error(error)
        })
}

export const convertOwnershipData = (): void => {
    convertOwnership()
}
