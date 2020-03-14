/*!
 * This file is part of na-map.
 *
 * @file      Move api files to directories (year|month).
 * @module    src/node/move-api-files
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import * as fs from "fs";
import * as path from "path";
import { commonPaths } from "./common-dir";
import { makeDirAsync } from "./common-file";
const yearRegex = /^api-.+-(\d{4})-\d{2}-\d{2}\.json(\.xz)?$/;
const monthRegex = /^api-.+-\d{4}-(\d{2})-\d{2}\.json(\.xz)?$/;
const moveFileAsync = (oldFileName, newFileName) => {
    fs.rename(oldFileName, newFileName, err => {
        if (err) {
            throw err;
        }
    });
};
const moveAPIFile = async (fileName) => {
    var _a, _b;
    const year = (_a = fileName.match(yearRegex)) === null || _a === void 0 ? void 0 : _a[1];
    const month = (_b = fileName.match(monthRegex)) === null || _b === void 0 ? void 0 : _b[1];
    if (year && month) {
        const dirNew = path.resolve(commonPaths.dirAPI, year, month);
        const fileNameNew = fileName.replace("api-", "");
        await makeDirAsync(dirNew);
        console.log("-> ", path.resolve(commonPaths.dirAPI, fileName), path.resolve(dirNew, fileNameNew));
        await moveFileAsync(path.resolve(commonPaths.dirAPI, fileName), path.resolve(dirNew, fileNameNew));
    }
};
for (const fileName of fs.readdirSync(commonPaths.dirAPI)) {
    console.log("loop", fileName);
    moveAPIFile(fileName);
}
//# sourceMappingURL=move-api-files.js.map