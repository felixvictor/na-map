import filterXSS from "xss";
import { default as nodeFetch } from "node-fetch";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import utc from "dayjs/plugin/utc.js";
dayjs.extend(customParseFormat);
dayjs.extend(utc);
import { currentServerStartDateTime } from "../common/common";
import { cleanName } from "../common/common-node";
const maxResults = "100";
const queryFrom = "from:zz569k";
const endpointUrl = "https://api.twitter.com/2/tweets/search/recent";
const bearerToken = process.argv[2];
export const runType = process.argv[3] ?? "full";
const tweets = [];
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
        const response = await nodeFetch(url.toString(), options);
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
        start_time: startDateTime,
        query,
    };
    if (nextToken) {
        parameters.next_token = nextToken;
    }
    const result = await readTwitterJson(parameters);
    if (result instanceof Error) {
        throw result;
    }
    const { data: twitterDataRaw, meta: { next_token }, } = result;
    if (twitterDataRaw) {
        addTwitterData(twitterDataRaw);
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
    await getTweetsSince(dayjs.utc().subtract(7, "day"));
};
const getTweetsSinceMaintenance = async () => {
    await getTweetsSince(dayjs.utc(currentServerStartDateTime));
};
const getTweetsPartial = async () => {
    await getTweetsSinceMaintenance();
};
export const getTweets = async () => {
    if (runType.startsWith("full")) {
        await getTweetsFull();
    }
    else {
        await getTweetsPartial();
    }
    return tweets.reverse();
};
//# sourceMappingURL=get-tweets.js.map