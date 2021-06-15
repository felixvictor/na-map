import filterXSS from "xss";
import { default as nodeFetch } from "node-fetch";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import utc from "dayjs/plugin/utc.js";
dayjs.extend(customParseFormat);
dayjs.extend(utc);
import { currentServerStartDateTime } from "../common/common";
import { getCommonPaths } from "../common/common-dir";
import { fileExists, readTextFile, saveTextFile } from "../common/common-file";
import { cleanName } from "../common/common-node";
const maxResults = "100";
const queryFrom = "from:zz569k";
const endpointUrl = "https://api.twitter.com/2/tweets/search/recent";
const commonPaths = getCommonPaths();
const bearerToken = process.argv[2];
export const runType = process.argv[3] ?? "full";
const tweets = [];
const refreshDefault = "0";
let refresh = refreshDefault;
const getRefreshId = () => {
    if (fileExists(commonPaths.fileTwitterRefreshId)) {
        const fileData = readTextFile(commonPaths.fileTwitterRefreshId);
        if (fileData) {
            return fileData;
        }
    }
    return refreshDefault;
};
const saveRefreshId = (refresh) => {
    saveTextFile(commonPaths.fileTwitterRefreshId, refresh);
};
const addTwitterData = (data) => {
    tweets.push(...data.map((tweet) => cleanName(filterXSS(tweet.text ?? ""))));
};
const readTwitterJson = async (parameters) => {
    const url = new URL(endpointUrl);
    const headers = {
        authorization: `Bearer ${bearerToken}`,
    };
    const options = {
        method: "GET",
        headers,
    };
    for (const [key, value] of Object.entries(parameters)) {
        url.searchParams.set(key, String(value));
    }
    try {
        const response = await nodeFetch(url, options);
        if (response.ok) {
            return (await response.json());
        }
        return new Error(`Cannot load ${url.toString()}: ${response.statusText}`);
    }
    catch (error) {
        throw new Error(error);
    }
};
const getTwitterData = async (query, startDateTime = "", nextToken = undefined) => {
    const parameters = {
        max_results: maxResults,
        query,
    };
    if (startDateTime === "") {
        parameters.since_id = refresh;
    }
    else {
        parameters.start_time = startDateTime;
    }
    if (nextToken) {
        parameters.next_token = nextToken;
    }
    const result = await readTwitterJson(parameters);
    if (result instanceof Error) {
        throw result;
    }
    const { data: twitterDataRaw, meta: { newest_id, next_token }, } = result;
    if (twitterDataRaw) {
        addTwitterData(twitterDataRaw);
    }
    if (BigInt(newest_id ?? 0) > BigInt(refresh)) {
        refresh = newest_id;
    }
    return next_token;
};
const getTweetsSince = async (sinceDateTime) => {
    let nextToken;
    do {
        nextToken = await getTwitterData(queryFrom, sinceDateTime.toISOString(), nextToken);
    } while (nextToken);
};
const getTweetsFull = async () => {
    refresh = refreshDefault;
    await getTweetsSince(dayjs.utc().subtract(7, "day"));
};
const getTweetsSinceMaintenance = async () => {
    await getTweetsSince(dayjs.utc(currentServerStartDateTime));
};
const getTweetsSinceRefresh = async () => {
    await getTwitterData(queryFrom);
};
const getTweetsPartial = async () => {
    if (refresh === refreshDefault) {
        await getTweetsSinceMaintenance();
    }
    else {
        await getTweetsSinceRefresh();
    }
};
export const getTweets = async () => {
    refresh = getRefreshId();
    if (runType.startsWith("full")) {
        await getTweetsFull();
    }
    else {
        await getTweetsPartial();
    }
    saveRefreshId(refresh);
    return tweets.reverse();
};
//# sourceMappingURL=get-tweets.js.map