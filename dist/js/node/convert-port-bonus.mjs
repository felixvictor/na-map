/*!
 * This file is part of na-map.
 *
 * @file      Convert port bonuses.
 * @module    node/convert-port-bonus
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import * as fs from "fs";
import path from "path";
import { default as csvParser } from "csv-parser";
import { baseAPIFilename, commonPaths, serverStartDate as serverDate } from "../common/common-dir";
import { sortBy } from "../common/common-node";
import { readJson, saveJsonAsync, xz } from "../common/common-file";
import { serverNames } from "../common/common-var";
let apiPorts = [];
let portNames = {};
const readCSV = () => {
    const csvData = [];
    fs.createReadStream(commonPaths.filePortBonusCSV)
        .pipe(csvParser({ separator: ";" }))
        .on("data", (data) => csvData.push(data))
        .on("error", (error) => {
        throw error;
    })
        .on("end", () => {
        void convert(csvData);
    });
};
const convert = async (csvData) => {
    const ports = csvData
        .map((csvPort) => {
        const port = {};
        port.id = portNames.get(csvPort.Port) ?? 0;
        port.name = csvPort.Port;
        port.portBonus = {};
        ["Bonus1", "Bonus2", "Bonus3", "Bonus4", "Bonus5"]
            .filter((bonusEntry) => csvPort[bonusEntry] !== "Empty")
            .forEach((bonusEntry) => {
            const bonusValue = Number(csvPort[bonusEntry].slice(-1));
            const bonusType = csvPort[bonusEntry]
                .replace("Bonus ", "")
                .replace(" and Rig", "")
                .toLowerCase()
                .slice(0, -2);
            port.portBonus[bonusType] = bonusValue;
        });
        return port;
    })
        .sort(sortBy(["id"]));
    await saveJsonAsync(commonPaths.filePortBonus, ports);
};
const apiPortJson = `${serverNames[0]}-Ports-${serverDate}.json`;
const fileNameJson = path.resolve(baseAPIFilename, `${apiPortJson}`);
xz("unxz", `${fileNameJson}.xz`);
apiPorts = readJson(path.resolve(baseAPIFilename, apiPortJson));
xz("xz", fileNameJson);
portNames = new Map(apiPorts.map((apiPort) => [apiPort.Name, Number(apiPort.Id)]));
readCSV();
//# sourceMappingURL=convert-port-bonus.js.map