import path from "path"

import { getActiveTime, getNationIdFromFullName, getTweetTimeDayjs, isDateAfterNow } from "./common"
import { sortBy } from "../../common/common"
import { readJson, saveJsonAsync } from "../../common/common-file"
import { getCommonPaths } from "../../common/common-dir"
import { serverIds } from "../../common/servers"

import { FlagEntity, FlagsPerNation } from "../../common/types"

const commonPaths = getCommonPaths()
const flagsFilename = path.resolve(commonPaths.dirGenServer, `${serverIds[0]}-flags.json`)

let flagsPerNations: FlagsPerNation[] = []
const flagsMap = new Map<number, Set<FlagEntity>>()

/**
 * A nation acquired one or more conquest flags
 */
export const flagAcquired = (result: RegExpExecArray): void => {
    const nationName = result[2]
    const numberOfFlags = Number(result[3])
    const tweetTimeDayjs = getTweetTimeDayjs(result[1])

    const nationId = getNationIdFromFullName(nationName)
    const active = getActiveTime(tweetTimeDayjs)

    console.log("      --- conquest flag", numberOfFlags, nationName, active)

    const flag = { expire: active, number: numberOfFlags }
    const flagsSet = flagsMap.get(nationId) ?? new Set<FlagEntity>()
    flagsSet.add(flag)
    flagsMap.set(nationId, flagsSet)
}

const cleanExpiredAndDoubleEntries = (flagSet: Set<FlagEntity>): Map<string, number> => {
    const cleanedFlags = new Map<string, number>()

    for (const flag of flagSet) {
        if (isDateAfterNow(flag.expire)) {
            cleanedFlags.set(flag.expire, flag.number)
        }
    }

    return cleanedFlags
}

const cleanFlags = (): FlagsPerNation[] => {
    const cleanedFlagsPerNation = [] as FlagsPerNation[]

    for (const [nation, flagSet] of flagsMap) {
        const cleanedFlags = cleanExpiredAndDoubleEntries(flagSet)

        if (cleanedFlags.size > 0) {
            // Map to FlagEntity[]
            const flags = (
                [...cleanedFlags].map(([expire, number]) => ({
                    expire,
                    number,
                })) as FlagEntity[]
            ).sort(sortBy(["expire"]))

            cleanedFlagsPerNation.push({
                nation,
                flags,
            })
        }
    }

    return cleanedFlagsPerNation.sort(sortBy(["nation"]))
}

export const initFlags = (): void => {
    flagsPerNations = readJson(flagsFilename)

    for (const flagsPerNation of flagsPerNations) {
        const flagsSet = new Set<FlagEntity>()
        for (const flag of flagsPerNation.flags) {
            flagsSet.add(flag)
        }

        flagsMap.set(flagsPerNation.nation, flagsSet)
    }
}

export const updateFlags = async (): Promise<void> => {
    const cleanedFlagsPerNation = cleanFlags()

    await saveJsonAsync(flagsFilename, cleanedFlagsPerNation)
}
