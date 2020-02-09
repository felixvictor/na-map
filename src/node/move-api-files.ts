/**
 * This file is part of na-map.
 *
 * @file      Move api files to directories (year|month).
 * @module    src/node/move-api-files
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import * as fs from "fs"
import * as path from "path"

import { commonPaths, makeDirAsync } from "./common"

const yearRegex = /^api-.+-(\d{4})-\d{2}-\d{2}\.json(\.xz)?$/
const monthRegex = /^api-.+-\d{4}-(\d{2})-\d{2}\.json(\.xz)?$/

/**
 * Move file (async)
 * @param {string} oldFileName
 * @param {string} newFileName
 */
const moveFileAsync = (oldFileName: string, newFileName: string): void => {
    fs.rename(oldFileName, newFileName, err => {
        if (err) {
            throw err
        }
    })
}

/**
 * Move API files
 * @param {string} fileName
 * @return {Promise<void>}
 */
const moveAPIFile = async (fileName: string): Promise<void> => {
    // Consider only file to match regex "api-...")
    const year = fileName.match(yearRegex)?.[1]
    const month = fileName.match(monthRegex)?.[1]
    if (year && month) {
        const dirNew = path.resolve(commonPaths.dirAPI, year, month)
        const fileNameNew = fileName.replace("api-", "")
        await makeDirAsync(dirNew)

        console.log("-> ", path.resolve(commonPaths.dirAPI, fileName), path.resolve(dirNew, fileNameNew))
        await moveFileAsync(path.resolve(commonPaths.dirAPI, fileName), path.resolve(dirNew, fileNameNew))
    }
}

for (const fileName of fs.readdirSync(commonPaths.dirAPI)) {
    console.log("loop", fileName)
    moveAPIFile(fileName)
}
