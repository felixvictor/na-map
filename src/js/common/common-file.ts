/*!
 * This file is part of na-map.
 *
 * @file      Common data and functions for node.
 * @module    src/node/common-file
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { exec, execSync } from "child_process"
import { default as fs, promises as pfs } from "fs"
import path from "path"
import { promisify } from "util"

import { apiBaseFiles, serverNames } from "./common-var"
import { baseAPIFilename, serverStartDate } from "./common-dir"

const execP = promisify(exec)

export const fileExists = (fileName: string): boolean => fs.existsSync(fileName)

/**
 * Make directories (recursive)
 */
export const makeDirAsync = async (dir: string): Promise<void> => {
    await pfs.mkdir(dir, { recursive: true })
}

export const saveJsonAsync = async (fileName: string, data: object): Promise<void> => {
    await makeDirAsync(path.dirname(fileName))
    await pfs.writeFile(fileName, JSON.stringify(data), { encoding: "utf8" })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const saveTextFile = (fileName: string, data: any): void =>
    fs.writeFileSync(fileName, data, { encoding: "utf8" })

export const readTextFile = (fileName: string): string => {
    let data = ""
    try {
        data = fs.readFileSync(fileName, { encoding: "utf8" })
    } catch (error) {
        if (error.code === "ENOENT") {
            console.error("File", fileName, "not found")
        } else {
            throw error
        }
    }

    return data
}

// export const readJson = (fileName: string): Record<string, string | number>[] => JSON.parse(readTextFile(fileName))
export const readJson = <T>(fileName: string): T => JSON.parse(readTextFile(fileName)) as T

/**
 * {@link https://stackoverflow.com/a/57708635}
 */
const fileExistsAsync = async (fileName: string): Promise<boolean> =>
    Boolean(await fs.promises.stat(fileName).catch(() => false))

export const xzAsync = async (command: string, fileName: string): Promise<boolean> => {
    const fileExists = await fileExistsAsync(fileName)

    if (fileExists) {
        await execP(`${command} ${fileName}`)
    }

    return true
}

export const xz = (command: string, fileName: string): void => {
    if (fs.existsSync(fileName)) {
        execSync(`${command} ${fileName}`)
    }
}

const loopApiFiles = (command: string): void => {
    const ext = command === "xz" ? "json" : "json.xz"

    for (const serverName of serverNames) {
        for (const apiBaseFile of apiBaseFiles) {
            const fileName = path.resolve(baseAPIFilename, `${serverName}-${apiBaseFile}-${serverStartDate}.${ext}`)
            xz(command, fileName)
        }
    }
}

export const compressApiData = (): void => {
    loopApiFiles("xz")
}

export const uncompressApiData = (): void => {
    loopApiFiles("unxz")
}

/**
 * Check fetch status (see {@link https://developers.google.com/web/updates/2015/03/introduction-to-fetch})
 */
export const checkFetchStatus = (response: Response): Promise<object> => {
    // noinspection MagicNumberJS
    if (response.status >= 200 && response.status < 300) {
        return Promise.resolve(response)
    }

    return Promise.reject(new Error(response.statusText))
}

/**
 * Get json from fetch response
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getJsonFromFetch = (response: Response): Promise<any> => response.json()

/**
 * Get text from fetch response
 */
export const getTextFromFetch = (response: Response): Promise<string> => response.text()

/**
 * Write error to console
 */
export const putFetchError = (error: string): void => {
    console.error("Request failed -->", error)
}
