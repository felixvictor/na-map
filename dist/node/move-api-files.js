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
    const year = fileName.match(yearRegex)?.[1];
    const month = fileName.match(monthRegex)?.[1];
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
