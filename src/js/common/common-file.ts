/*!
 * This file is part of na-map.
 *
 * @file      Common data and functions for node.
 * @module    src/node/common-file
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2022
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { exec, execSync } from "child_process"
import { default as fs, promises as fsPromises } from "fs"
import path from "path"
import { promisify } from "util"

import { currentServerStartDate } from "./common"
import { apiBaseFiles } from "./common-var"
import { serverIds } from "./servers"
import { baseAPIFilename } from "./common-node"

// https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/node/globals.d.ts
interface ErrnoException extends Error {
    errno?: number
    code?: string
    path?: string
    syscall?: string
    stack?: string
}

const execP = promisify(exec)

export const fileExists = (fileName: string): boolean => fs.existsSync(fileName)

/**
 * Make directories (recursive)
 */
export const makeDirAsync = async (dir: string): Promise<void> => {
    await fsPromises.mkdir(dir, { recursive: true })
}

// eslint-disable-next-line @typescript-eslint/ban-types
export const saveJsonAsync = async (fileName: string, data: object): Promise<void> => {
    await makeDirAsync(path.dirname(fileName))
    await fsPromises.writeFile(fileName, JSON.stringify(data), { encoding: "utf8" })
}

export const saveTextFile = (fileName: string, data: string): void => {
    fs.writeFileSync(fileName, data, { encoding: "utf8" })
}

export const isNodeError = (error: unknown): error is ErrnoException => error instanceof Error

export const readTextFile = (fileName: string): string => {
    let data = ""
    try {
        data = fs.readFileSync(fileName, { encoding: "utf8" })
    } catch (error: unknown) {
        if (isNodeError(error as Error) && (error as ErrnoException).code === "ENOENT") {
            console.error("File", fileName, "not found")
        } else {
            putFetchError(error as string)
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

    for (const serverName of serverIds) {
        for (const apiBaseFile of apiBaseFiles) {
            const fileName = path.resolve(
                baseAPIFilename,
                `${serverName}-${apiBaseFile}-${currentServerStartDate}.${ext}`
            )
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
 * Write error to console
 */
export const putFetchError = (error: string): void => {
    console.error("Request failed -->", error)
}

export const executeCommand = (command: string): Buffer => {
    let result = {} as Buffer

    try {
        result = execSync(command)
    } catch (error: unknown) {
        if (isNodeError(error) && error.code === "ENOENT") {
            console.error("Command failed -->", error)
        } else {
            putFetchError(error as string)
        }
    }

    return result
}
