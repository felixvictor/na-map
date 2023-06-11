import dotenv from "dotenv"
import { default as nodeFetch, RequestInit } from "node-fetch"
import filterXSS from "xss"

import { getSinceDateTimeLastSevenDays, getSinceDateTimeThisMaintenance } from "./common"
import { cleanName } from "../../common/common-node"

type NextToken = string | undefined
interface TwitterSearchResult {
    data: TwitterData[]
    meta: TwitterMetaData
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
const endpointUrl = "https://api.twitter.com/2/tweets/search/recent"

const { parsed: dotEnvData } = dotenv.config()

const bearerToken = dotEnvData?.BEARER_TOKEN
export const runType = process.argv[2] ?? "full"

const tweets: string[] = []

/**
 * Add sanitised data to tweets
 */
const addTwitterData = (data: TwitterData[]): void => {
    tweets.push(...data.map((tweet: TwitterData) => cleanName(filterXSS(tweet.text ?? ""))))
}

const readTwitterJson = async (parameters: TwitterQueryParameters): Promise<Error | TwitterSearchResult> => {
    const url = new URL(endpointUrl)
    const headers = {
        authorization: `Bearer ${bearerToken}`,
    }
    const options: RequestInit = {
        method: "GET",
        headers,
    }

    for (const [key, value] of Object.entries(parameters)) {
        url.searchParams.set(key, String(value))
    }

    try {
        const response = await nodeFetch(url.toString(), options)

        if (response.ok) {
            return (await response.json()) as TwitterSearchResult
        }

        return new Error(`Cannot load ${url.toString()}: ${response.statusText}`)
    } catch (error: unknown) {
        throw new Error(error as string)
    }
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
        start_time: startDateTime,
        query,
    }

    // Use next page token if given
    if (nextToken) {
        parameters.next_token = nextToken
    }

    const result = await readTwitterJson(parameters)

    if (result instanceof Error) {
        throw result
    }

    const {
        data: twitterDataRaw,
        meta: { next_token },
    } = result

    if (twitterDataRaw) {
        addTwitterData(twitterDataRaw)
    }

    return next_token
}

/**
 * Get tweets since sinceDateTime
 * @param sinceDateTime - Start dateTime
 */
const getTweetsSince = async (sinceDateTime: string): Promise<void> => {
    let nextToken: NextToken

    do {
        // noinspection JSUnusedAssignment
        nextToken = await getTwitterData(queryFrom, sinceDateTime, nextToken) // eslint-disable-line no-await-in-loop
    } while (nextToken)
}

/**
 * Get all available tweets from the 7 last days
 */
const getTweetsFull = async (): Promise<void> => {
    const sinceDateTime = getSinceDateTimeLastSevenDays()
    await getTweetsSince(sinceDateTime)
}

/**
 * Get tweets since maintenance
 */
const getTweetsSinceMaintenance = async (): Promise<void> => {
    const sinceDateTime = getSinceDateTimeThisMaintenance()
    await getTweetsSince(sinceDateTime)
}

/**
 * Get partial data since maintenance or later based on refresh id
 */
const getTweetsPartial = async (): Promise<void> => {
    await getTweetsSinceMaintenance()
}

/**
 * Get tweets
 */
export const getTweets = async (): Promise<string[]> => {
    /*
    // eslint-disable-next-line unicorn/prefer-ternary
    if (runType.startsWith("full")) {
        await getTweetsFull()
    } else {
        await getTweetsPartial()
    }

    return tweets.reverse()
    */

    return []
}
