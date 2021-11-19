import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import utc from "dayjs/plugin/utc.js";
import { currentServerStartDateTime, findNationById, findNationByName, } from "../../common/common";
import { flagValidity, portBattleCooldown, serverMaintenanceHour } from "../../common/common-var";
dayjs.extend(customParseFormat);
dayjs.extend(utc);
const dateTimeFormat = "YYYY-MM-DD HH:mm";
const dateTimeFormatTwitter = "DD-MM-YYYY HH:mm";
export const getActiveTime = (time) => time.add(flagValidity, "days").format(dateTimeFormat);
export const getCaptureTime = (tweetTime) => getTimeEstimate(tweetTime, dateTimeFormatTwitter).format(dateTimeFormat);
export const getClanName = (clanNameRegexResult) => clanNameRegexResult.trim();
export const getCooldownTime = (tweetTime, nation) => nation === "NT"
    ? getNextServerStartDateTime(tweetTime).format(dateTimeFormat)
    : getTimeEstimate(tweetTime, dateTimeFormatTwitter).add(portBattleCooldown, "hour").format(dateTimeFormat);
export const isDateInFuture = (date) => dayjs.utc(date, dateTimeFormat).isAfter(dayjs.utc());
export const getNationIdFromFullName = (nationName) => findNationByName(nationName)?.id ?? 0;
export const getNationShortNameFromId = (nationId) => findNationById(nationId).short;
export const getNationShortNameFromFullName = (nationName) => findNationByName(nationName)?.short ?? "";
const getNextServerStartDateTime = (time) => {
    const timeDayjs = dayjs.utc(time, dateTimeFormatTwitter);
    const nextServerStartDateTime = timeDayjs.add(1, "day").utc().hour(serverMaintenanceHour).minute(0).second(0);
    return nextServerStartDateTime;
};
export const getPortBattleTime = (date) => dayjs.utc(date, "D MMM YYYY HH:mm").format(dateTimeFormat);
export const getSinceDateTimeLastSevenDays = () => dayjs.utc().subtract(7, "day").toISOString();
export const getSinceDateTimeThisMaintenance = () => dayjs.utc(currentServerStartDateTime).toISOString();
export const getTimeEstimate = (time, format) => {
    const timeDayjs = dayjs.utc(time, format);
    const timeEstimated = timeDayjs.subtract((5 * 60) / 2, "second");
    return timeEstimated;
};
export const getTweetTimeFormatted = (time) => getTweetTimeDayjs(time).format(dateTimeFormat);
export const getTweetTimeDayjs = (time) => dayjs.utc(time, dateTimeFormatTwitter);
export const isTweetTimeToday = (tweetTime) => {
    const tweetTimeDayjs = getTweetTimeDayjs(tweetTime);
    return tweetTimeDayjs.isAfter(dayjs.utc(currentServerStartDateTime));
};
export const isTweetTimeOneDayAgo = (tweetTime) => {
    const tweetTimeDayjs = getTweetTimeDayjs(tweetTime);
    return (tweetTimeDayjs.isAfter(dayjs.utc(currentServerStartDateTime).subtract(1, "day")) &&
        tweetTimeDayjs.isBefore(dayjs.utc(currentServerStartDateTime)));
};
export const isTweetTimeInLastThreeDays = (tweetTime) => {
    const tweetTimeDayjs = getTweetTimeDayjs(tweetTime);
    return (tweetTimeDayjs.isAfter(dayjs.utc(currentServerStartDateTime).subtract(3, "day")) &&
        tweetTimeDayjs.isBefore(dayjs.utc(currentServerStartDateTime)));
};
//# sourceMappingURL=common.js.map