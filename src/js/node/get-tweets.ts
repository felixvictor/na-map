import filterXSS from "xss"
import Twitter, { RequestParameters } from "twitter-v2"

import dayjs from "dayjs"
import customParseFormat from "dayjs/plugin/customParseFormat.js"
import utc from "dayjs/plugin/utc.js"
dayjs.extend(customParseFormat)
dayjs.extend(utc)

import { currentServerStartDateTime, simpleStringSort } from "../common/common"
import { getCommonPaths } from "../common/common-dir"
import { fileExists, readTextFile, saveTextFile } from "../common/common-file"
import { cleanName } from "../common/common-node"

type NextToken = string | undefined
interface TwitterSearchResult {
    data: TwitterData[]
    meta: TwitterMetaData
    errors: string
}
interface TwitterData {
    id: string
    text: string
}
interface TwitterMetaData {
    newest_id?: string
    oldest_id?: string
    result_count: number
    next_token?: NextToken
}
interface TwitterQueryParameters {
    [key: string]: number | string | undefined
    end_time?: string
    max_results?: string
    next_token?: string
    query: string
    since_id?: string
    start_time?: string
}

const maxResults = "100"
const queryFrom = "from:zz569k"

const commonPaths = getCommonPaths()
const consumerKey = process.argv[2]
const consumerSecret = process.argv[3]
const accessToken = process.argv[4]
const accessTokenSecret = process.argv[5]
export const runType = process.argv[6] ?? "full"

let TwitterClient: Twitter
const tweets: string[] = []
const refreshDefault = "0"
let refresh = refreshDefault

/**
 * Get refresh id, either from file or set default value (0)
 * @returns Refresh id
 */
const getRefreshId = (): string => {
    if (fileExists(commonPaths.fileTwitterRefreshId)) {
        const fileData = readTextFile(commonPaths.fileTwitterRefreshId)
        if (fileData) {
            return fileData
        }
    }

    return refreshDefault
}

/**
 * Save refresh id to file
 */
const saveRefreshId = (refresh: string): void => {
    saveTextFile(commonPaths.fileTwitterRefreshId, refresh)
}

/**
 * Add sanitised data to tweets
 */
const addTwitterData = (data: TwitterData[]): void => {
    tweets.push(...data.map((tweet: TwitterData) => cleanName(filterXSS(tweet.text ?? ""))))
}

/**
 * Load data from twitter
 */
const getTwitterData = async (
    query: string,
    startDateTime = "",
    nextToken: NextToken = undefined
): Promise<NextToken> => {
    const parameters: TwitterQueryParameters = {
        max_results: maxResults,
        query,
    }

    // If no start time is provided use refresh id
    if (startDateTime === "") {
        parameters.since_id = refresh
    } else {
        parameters.start_time = startDateTime
    }

    // Use next page token if given
    if (nextToken) {
        parameters.next_token = nextToken
    }

    try {
        const { data: tweetsRaw, meta }: TwitterSearchResult = await TwitterClient.get(
            "tweets/search/recent",
            parameters as RequestParameters
        )

        if (tweetsRaw) {
            addTwitterData(tweetsRaw)
        }

        // Test for new refresh id
        if (BigInt(meta.newest_id ?? 0) > BigInt(refresh)) {
            refresh = meta.newest_id!
        }

        return meta.next_token
    } catch (error: unknown) {
        throw new Error(error as string)
    }
}

/**
 * Get tweets since sinceDateTime
 * @param sinceDateTime - Start dateTime
 */
const getTweetsSince = async (sinceDateTime: dayjs.Dayjs): Promise<void> => {
    let nextToken: NextToken

    do {
        // noinspection JSUnusedAssignment
        nextToken = await getTwitterData(queryFrom, sinceDateTime.toISOString(), nextToken) // eslint-disable-line no-await-in-loop
    } while (nextToken)
}

/**
 * Get all available tweets from the 7 last days
 */
const getTweetsFull = async (): Promise<void> => {
    refresh = refreshDefault
    await getTweetsSince(dayjs.utc().subtract(7, "day"))
}

/**
 * Get tweets since maintenance
 */
const getTweetsSinceMaintenance = async (): Promise<void> => {
    await getTweetsSince(dayjs.utc(currentServerStartDateTime))
}

/**
 * Get tweets since last refresh id
 */
const getTweetsSinceRefresh = async (): Promise<void> => {
    await getTwitterData(queryFrom)
}

/**
 * Get partial data since maintenance or later based on refresh id
 */
const getTweetsPartial = async (): Promise<void> => {
    // eslint-disable-next-line unicorn/prefer-ternary
    if (refresh === refreshDefault) {
        await getTweetsSinceMaintenance()
    } else {
        await getTweetsSinceRefresh()
    }
}

/**
 * Get tweets
 */
export const getTweets = async (): Promise<string[]> => {
    refresh = getRefreshId()

    TwitterClient = new Twitter({
        consumer_key: consumerKey,
        consumer_secret: consumerSecret,
        access_token_key: accessToken,
        access_token_secret: accessTokenSecret,
    })

    // eslint-disable-next-line unicorn/prefer-ternary
    if (runType.startsWith("full")) {
        await getTweetsFull()
    } else {
        await getTweetsPartial()
    }

    saveRefreshId(refresh)

    return tweets.sort(simpleStringSort)
}
