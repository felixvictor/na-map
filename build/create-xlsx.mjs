/* eslint-disable no-param-reassign */
import fs from "fs";
// eslint-disable-next-line import/no-extraneous-dependencies
import Excel from "exceljs";

const inFilename = process.argv[2],
    outFilename = process.argv[3];
const shipsOrig = JSON.parse(fs.readFileSync(inFilename, "utf8")).shipData;

// https://stackoverflow.com/questions/1144783/how-to-replace-all-occurrences-of-a-string-in-javascript
// eslint-disable-next-line no-extend-native,func-names
String.prototype.replaceAll = function(search, replacement) {
    const target = this;
    return target.replace(new RegExp(search, "g"), replacement);
};

function createExcel() {
    function fillSheet(sheet, ships) {
        sheet.properties.defaultRowHeight = 20;

        sheet.columns = [
            { header: "Rate", key: "rate", width: 8 },
            { header: "Ship", key: "ship", width: 20 },
            { header: "BR", key: "br", width: 8 },
            { header: "Player", key: "player", width: 10 },
            { header: "BR total", key: "brTotal", width: 10 },
            { header: "Player names", key: "names", width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 }
        ];
        sheet.mergeCells("F1:G1");

        sheet.addRow({
            rate: "",
            ship: "",
            br: "",
            player: { formula: `SUM(D3:D${2 + ships.length})` },
            brTotal: { formula: `SUM(E3:E${2 + ships.length})` }
        });
        sheet.mergeCells("A2:C2");
        sheet.getCell("A2").value = "Total";

        ships.forEach((ship, i) => {
            if (!i) {
                sheet.addRow({
                    rate: ship.class,
                    ship: ship.name,
                    br: ship.battleRating,
                    player: { formula: 'COUNTIF(F3:AE3,"*")' },
                    brTotal: { formula: "C3*D3" }
                });
            } else {
                sheet.addRow({
                    rate: ship.class,
                    ship: ship.name,
                    br: ship.battleRating,
                    player: { sharedFormula: "D3" },
                    brTotal: { sharedFormula: "E3" }
                });
            }
        });

        sheet.getCell("F3").value = "Fritz";
        sheet.getCell("G3").value = "Franz";
        sheet.getCell("H3").value = "Klaus";
        sheet.getCell("F4").value = "x";
        sheet.getCell("G4").value = "X";
        sheet.getCell("H4").value = "x";

        sheet.getRow(1).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "6f6150" }
        };
        sheet.getRow(1).font = { bold: true, color: { argb: "f5efe7" } };

        sheet.getRow(2).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "f5efe7" }
        };
        sheet.getRow(2).font = { bold: true, color: { argb: "6f6150" } };
    }

    const workbook = new Excel.Workbook(),
        now = new Date();
    const dwShips = shipsOrig.filter(ship => ship.class < 6 || ship.name === "Mortar Brig").sort((a, b) => {
            if (a.class < b.class) {
                return -1;
            }
            if (a.class > b.class) {
                return 1;
            }
            if (a.battleRating > b.battleRating) {
                return -1;
            }
            if (a.battleRating < b.battleRating) {
                return 1;
            }
            if (a.name < b.name) {
                return -1;
            }
            if (a.name > b.name) {
                return 1;
            }
            return 0;
        }),
        swShips = shipsOrig
            .filter(
                ship =>
                    ship.class > 5 &&
                    !ship.name.startsWith("Basic") &&
                    !ship.name.startsWith("Rookie") &&
                    !ship.name.startsWith("Trader")
            )
            .sort((a, b) => {
                if (a.class < b.class) {
                    return -1;
                }
                if (a.class > b.class) {
                    return 1;
                }
                if (a.battleRating > b.battleRating) {
                    return -1;
                }
                if (a.battleRating < b.battleRating) {
                    return 1;
                }
                if (a.name < b.name) {
                    return -1;
                }
                if (a.name > b.name) {
                    return 1;
                }
                return 0;
            });

    workbook.creator = "iB aka Felix Victor";
    workbook.created = now;

    const dwSheet = workbook.addWorksheet("Deep water port", {
            properties: { tabColor: { argb: "d5bb99" } },
            views: [{ state: "frozen", xSplit: 5, ySplit: 2 }]
        }),
        swSheet = workbook.addWorksheet("Shallow water port", {
            properties: { tabColor: { argb: "cddfe6" } },
            views: [{ state: "frozen", xSplit: 5, ySplit: 2 }]
        });

    fillSheet(dwSheet, dwShips);
    fillSheet(swSheet, swShips);

    workbook.xlsx.writeFile(outFilename);
}

createExcel();
