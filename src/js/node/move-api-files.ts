/*!
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

import { commonPaths } from "../common/common-dir"
import { makeDirAsync } from "../common/common-file"

const yearRegex = /^api-.+-(\d{4})-\d{2}-\d{2}\.json(\.xz)?$/
const monthRegex = /^api-.+-\d{4}-(\d{2})-\d{2}\.json(\.xz)?$/

/**
 * Move file (async)
 */
const moveFileAsync = async (oldFileName: string, newFileName: string): Promise<void> => {
    fs.rename(oldFileName, newFileName, err => {
        if (err) {
            throw err
        }
    })
}

/**
 * Move API files
 */
const moveAPIFile = async (fileName: string): Promise<void> => {
    // Consider only file to match regex "api-...")
    const year = yearRegex.exec(fileName)?.[1]
    const month = monthRegex.exec(fileName)?.[1]
    if (year && month) {
        const dirNew = path.resolve(commonPaths.dirAPI, year, month)
        const fileNameNew = fileName.replace("api-", "")
        await makeDirAsync(dirNew)

        console.log("->", path.resolve(commonPaths.dirAPI, fileName), path.resolve(dirNew, fileNameNew))
        await moveFileAsync(path.resolve(commonPaths.dirAPI, fileName), path.resolve(dirNew, fileNameNew))
    }
}

for (const fileName of fs.readdirSync(commonPaths.dirAPI)) {
    console.log("loop", fileName)
    // noinspection JSIgnoredPromiseFromCall
    moveAPIFile(fileName)
}
