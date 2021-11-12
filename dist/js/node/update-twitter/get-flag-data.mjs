import path from "path";
import { getActiveTime, getNationIdFromFullName, getTweetTimeDayjs, isDateInFuture } from "./common";
import { sortBy } from "../../common/common";
import { readJson, saveJsonAsync } from "../../common/common-file";
import { getCommonPaths } from "../../common/common-dir";
import { serverIds } from "../../common/servers";
const commonPaths = getCommonPaths();
const flagsFilename = path.resolve(commonPaths.dirGenServer, `${serverIds[0]}-flags.json`);
let flagsPerNations = [];
const flagsMap = new Map();
export const flagAcquired = (result) => {
    const nationName = result[2];
    const numberOfFlags = Number(result[3]);
    const tweetTimeDayjs = getTweetTimeDayjs(result[1]);
    const nationId = getNationIdFromFullName(nationName);
    const active = getActiveTime(tweetTimeDayjs);
    console.log("      --- conquest flag", numberOfFlags, nationName, active);
    const flag = { expire: active, number: numberOfFlags };
    const flagsSet = flagsMap.get(nationId) ?? new Set();
    flagsSet.add(flag);
    flagsMap.set(nationId, flagsSet);
};
const cleanExpiredAndDoubleEntries = (flagSet) => {
    const cleanedFlags = new Map();
    for (const flag of flagSet) {
        if (isDateInFuture(flag.expire)) {
            cleanedFlags.set(flag.expire, flag.number);
        }
    }
    return cleanedFlags;
};
const cleanFlags = () => {
    const cleanedFlagsPerNation = [];
    for (const [nation, flagSet] of flagsMap) {
        const cleanedFlags = cleanExpiredAndDoubleEntries(flagSet);
        if (cleanedFlags.size > 0) {
            const flags = [...cleanedFlags].map(([expire, number]) => ({
                expire,
                number,
            })).sort(sortBy(["expire"]));
            cleanedFlagsPerNation.push({
                nation,
                flags,
            });
        }
    }
    return cleanedFlagsPerNation.sort(sortBy(["nation"]));
};
export const initFlags = () => {
    flagsPerNations = readJson(flagsFilename);
    for (const flagsPerNation of flagsPerNations) {
        const flagsSet = new Set();
        for (const flag of flagsPerNation.flags) {
            flagsSet.add(flag);
        }
        flagsMap.set(flagsPerNation.nation, flagsSet);
    }
};
export const updateFlags = async () => {
    const cleanedFlagsPerNation = cleanFlags();
    await saveJsonAsync(flagsFilename, cleanedFlagsPerNation);
};
//# sourceMappingURL=get-flag-data.js.map