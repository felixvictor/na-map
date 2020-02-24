import * as fs from "fs";
import * as path from "path";
import { makeDirAsync } from "../common";
import { commonPaths } from "./common-node";
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
