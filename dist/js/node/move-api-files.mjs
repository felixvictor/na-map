/*!
 * This file is part of na-map.
 *
 * @file      Move api files to directories (year|month).
 * @module    src/node/move-api-files
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import * as fs from "fs";
import path from "path";
import { getCommonPaths } from "../common/common-dir";
import { makeDirAsync } from "../common/common-file";
const commonPaths = getCommonPaths();
const monthRegex = /^api-.+-\d{4}-(\d{2})-\d{2}\.json(\.xz)?$/;
const yearRegex = /^api-.+-(\d{4})-\d{2}-\d{2}\.json(\.xz)?$/;
const moveFileAsync = async (oldFileName, newFileName) => {
    fs.rename(oldFileName, newFileName, (err) => {
        if (err) {
            throw err;
        }
    });
};
const moveAPIFile = async (fileName) => {
    const year = yearRegex.exec(fileName)?.[1];
    const month = monthRegex.exec(fileName)?.[1];
    if (year && month) {
        const dirNew = path.resolve(commonPaths.dirAPI, year, month);
        const fileNameNew = fileName.replace("api-", "");
        await makeDirAsync(dirNew);
        console.log("->", path.resolve(commonPaths.dirAPI, fileName), path.resolve(dirNew, fileNameNew));
        await moveFileAsync(path.resolve(commonPaths.dirAPI, fileName), path.resolve(dirNew, fileNameNew));
    }
};
for (const fileName of fs.readdirSync(commonPaths.dirAPI)) {
    console.log("loop", fileName);
    void moveAPIFile(fileName);
}
//# sourceMappingURL=move-api-files.js.map