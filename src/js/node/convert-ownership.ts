/*!
 * This file is part of na-map.
 *
 * @file      Convert port ownership.
 * @module    convert-ownership
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import * as fs from "fs"
import path from "path"

import d3Array from "d3-array"
const { group: d3Group } = d3Array

import { default as lzma } from "lzma-native"
import { default as readDirRecursive } from "recursive-readdir"

import { capitalToCounty, nations, NationShortName } from "../common/common"
import { commonPaths } from "../common/common-dir"
import { saveJsonAsync } from "../common/common-file"
import { cleanName, sortBy } from "../common/common-node"
import { ServerId, serverIds } from "../common/servers"

import { APIPort } from "./api-port"
import { NationList, Ownership, OwnershipNation } from "../common/gen-json"
import { PowerMapList } from "../common/interface"
import { Group, Line, Segment } from "timelines-chart"

const fileExtension = ".json.xz"

type ServerIdList<T> = {
    [K in ServerId]: T
}

const ports = {} as ServerIdList<Map<string, Port>>
const portOwnershipPerDate = {} as ServerIdList<PowerMapList>
const numPortsDates = {} as ServerIdList<Array<OwnershipNation<number>>>

let serverId: ServerId
const fileBaseNameRegex = {} as ServerIdList<RegExp>
const fileNames = {} as ServerIdList<string[]>

interface Port {
    name: string
    region: string
    county: string
    data: Segment[]
    id?: string
}
type RegionGroup = Map<string, CountyGroup>
type CountyGroup = Map<string, Port[]>

/**
 * Decompress file content
 * @param compressedContent - Compressed file content
 * @returns Decompressed file content or void
 */
const decompress = (compressedContent: Buffer): void | Buffer => {
    // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
    return lzma.decompress(compressedContent, {}, (decompressedContent: void | Buffer, error?: string) => {
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

const getDate = (date: string): number => new Date(date).getTime()

/**
 * Parse data and construct ports Map
 * @param serverId - Server id
 * @param portData - Port data
 * @param date - current date
 */
function parseData(serverId: ServerId, portData: APIPort[], date: string): void {
    // console.log("**** new date", date);

    const numPorts = {} as NationList<number>
    nations
        .filter((nation) => nation.id !== 9)
        .forEach((nation) => {
            numPorts[nation.short] = 0
        })
    const nationsForPowerMap = []

    for (const port of portData) {
        /**
         * Get data object
         */
        const getObject = (): Segment => {
            const dateF = getDate(date)
            return {
                timeRange: [dateF, dateF],
                val: nations[port.Nation].short,
            }
        }

        /**
         * Set initial data
         */
        const initData = (): void => {
            ports[serverId].set(port.Id, {
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
        const getPreviousNation = (): NationShortName | "" => {
            const portData = ports[serverId].get(port.Id)
            if (portData) {
                const index = portData.data.length - 1 ?? 0
                return portData.data[index].val as NationShortName
            }

            return ""
        }

        /**
         * Add new nation entry
         */
        const setNewNation = (): void => {
            // console.log("setNewNation -> ", ports.get(port.Id));
            const portData = ports[serverId].get(port.Id)
            if (portData) {
                portData.data.push(getObject())
                ports[serverId].set(port.Id, portData)
            }
        }

        /**
         * Change end date for current nation
         */
        const setNewEndDate = (): void => {
            const portData = ports[serverId].get(port.Id)
            if (portData) {
                // console.log("setNewEndDate -> ", ports.get(port.Id), values);
                portData.data[portData.data.length - 1].timeRange[1] = getDate(date)
                ports[serverId].set(port.Id, portData)
            }
        }

        // Exclude free towns
        if (port.Nation !== 9) {
            const currentNation = nations[port.Nation].short
            numPorts[currentNation] = Number(numPorts[currentNation]) + 1
            if (ports[serverId].get(port.Id)) {
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

            nationsForPowerMap.push(port.Nation)
        }
    }

    // console.log(serverId, date, nationsForPowerMap.length)
    portOwnershipPerDate[serverId].push([date, nationsForPowerMap])

    const numPortsDate = {} as OwnershipNation<number>
    numPortsDate.date = date
    nations
        .filter((nation) => nation.id !== 9)
        .forEach((nation) => {
            numPortsDate[nation.short] = numPorts[nation.short]
        })
    numPortsDates[serverId].push(numPortsDate)
    // console.log("**** 138 -->", [serverId], ports[serverId].get("138"));
}

/**
 * Process all files
 * @param serverId - Server id
 * @param fileNames - File names
 * @returns Resolved promise
 */
const processFiles = async (serverId: ServerId, fileNames: string[]): Promise<unknown> => {
    // eslint-disable-next-line unicorn/no-array-reduce
    return fileNames.reduce(
        async (sequence, fileName) =>
            sequence
                .then(async () => readFileContent(fileName))
                .then((compressedContent) => decompress(compressedContent))
                .then((decompressedContent) => {
                    if (decompressedContent) {
                        const currentDate = (fileBaseNameRegex[serverId].exec(path.basename(fileName)) ?? [])[1]
                        parseData(serverId, JSON.parse(decompressedContent.toString()), currentDate)
                    }
                })
                .catch((error) => {
                    throw new Error(error)
                }),
        Promise.resolve()
    )
}

/**
 * Write out result
 * @param serverId - Server id
 */
const writeResult = async (serverId: ServerId): Promise<void> => {
    const groups = (d3Group<Port, string>(
        [...ports[serverId].values()],
        (d) => d.region,
        // @ts-expect-error
        (d) => d.county
    ) as unknown) as RegionGroup

    // Convert to data structure needed for timelines-chart
    // region
    // -- group (counties)
    //    -- label (ports)
    const grouped = [...groups]
        .map(
            ([regionKey, regionValue]) =>
                ({
                    region: regionKey,
                    data: [...regionValue]
                        .map(
                            ([countyKey, countyValue]) =>
                                ({
                                    group: countyKey,
                                    data: countyValue
                                        .map((port) => {
                                            return {
                                                label: port.name,
                                                data: port.data,
                                            } as Line
                                        })
                                        .sort(sortBy(["label"])),
                                } as Group)
                        )
                        .sort(sortBy(["group"])),
                } as Ownership)
        )
        .sort(sortBy(["region"]))

    await saveJsonAsync(path.resolve(commonPaths.dirGenServer, `${serverId}-ownership.json`), grouped)
    await saveJsonAsync(path.resolve(commonPaths.dirGenServer, `${serverId}-nation.json`), numPortsDates[serverId])
    await saveJsonAsync(
        path.resolve(commonPaths.dirGenServer, `${serverId}-power.json`),
        portOwnershipPerDate[serverId]
    )
}

/**
 * Retrieve port data for nation/clan ownership
 * @param serverId - Server id
 */
const convertOwnership = async (serverId: ServerId): Promise<void> => {
    /**
     * Check if file should be ignored
     * @param fileName - File name
     * @param stats - Stat
     * @returns True if file should be ignored
     */
    const ignoreFileName = (fileName: string, stats: fs.Stats): boolean => {
        return !stats.isDirectory() && fileBaseNameRegex[serverId].exec(path.basename(fileName)) === null
    }

    ports[serverId] = new Map()
    numPortsDates[serverId] = []
    portOwnershipPerDate[serverId] = []

    try {
        fileNames[serverId] = await readDirRecursive(commonPaths.dirAPI, [ignoreFileName])
        sortFileNames(fileNames[serverId])
        await processFiles(serverId, fileNames[serverId])
        await writeResult(serverId)
    } catch (error: unknown) {
        throw new Error(error as string)
    }
}

export const convertOwnershipData = async (): Promise<unknown[]> => {
    const results = []
    for (serverId of serverIds) {
        fileBaseNameRegex[serverId] = new RegExp(`${serverId}-Ports-(20\\d{2}-\\d{2}-\\d{2})${fileExtension}`)
        results.push(convertOwnership(serverId))
    }

    return Promise.all(results)
}
