/*!
 * This file is part of na-map.
 *
 * @file      Convert repair data from setModules.
 * @module    src/node/convert-module-repair
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import path from "path";
import convert from "xml-js";
import { getCommonPaths } from "../common/common-dir";
import { readTextFile, saveJsonAsync } from "../common/common-file";
const commonPaths = getCommonPaths();
function toCamelCase(str) {
    str = str.replace(/[\s-_]+(.)?/g, (_match, ch) => (ch ? ch.toUpperCase() : ""));
    return str.slice(0, 1).toLowerCase() + str.slice(1);
}
const baseFileNames = ["armor repair", "sail repair", "crew repair"];
const getFileData = (baseFileName, ext) => {
    const fileName = path.resolve(commonPaths.dirModules, `${baseFileName} ${ext}.xml`);
    const fileXmlData = readTextFile(fileName);
    return convert.xml2js(fileXmlData, { compact: true }).ModuleTemplate;
};
export const convertRepairData = async () => {
    const repairs = {};
    for (const baseFileName of baseFileNames) {
        const fileData = getFileData(baseFileName, "kit");
        const data = {};
        for (const pair of fileData.Attributes.Pair) {
            if (pair.Key._text === "REPAIR_VOLUME_PER_ITEM") {
                data.volume = Number(pair.Value.Value._text);
            }
            if (pair.Key._text === "REPAIR_PERCENT") {
                data.percent = Number(pair.Value.Value._text);
            }
            if (pair.Key._text === "REPAIR_MODULE_TIME") {
                data.time = Number(pair.Value.Value._text);
            }
        }
        repairs[toCamelCase(baseFileName)] = data;
    }
    await saveJsonAsync(commonPaths.fileRepair, repairs);
};
//# sourceMappingURL=convert-module-repair-data.js.map