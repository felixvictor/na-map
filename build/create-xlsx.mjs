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
        sheet.properties.defaultRowHeight = 24;

        sheet.columns = [
            {
                header: "Rate",
                key: "rate",
                width: 8,
                style: { alignment: { vertical: "middle", horizontal: "right", indent: 1 } }
            },
            {
                header: "Ship",
                key: "ship",
                width: 24,
                style: { alignment: { vertical: "middle", horizontal: "left", indent: 1 } }
            },
            {
                header: "BR",
                key: "br",
                width: 8,
                style: { alignment: { vertical: "middle", horizontal: "right", indent: 1 } }
            },
            {
                header: "# Player",
                key: "player",
                width: 12,
                style: { alignment: { vertical: "middle", horizontal: "right", indent: 1 } }
            },
            {
                header: "BR total",
                key: "brTotal",
                width: 12,
                style: { alignment: { vertical: "middle", horizontal: "right", indent: 1 } }
            },
            {
                header: "Player names",
                key: "names",
                width: 20,
                style: { alignment: { vertical: "middle", horizontal: "left", indent: 1 } }
            }
        ];

        for (let columnNum = 7; columnNum <= 7 + 23; columnNum += 1) {
            sheet.getColumn(columnNum).width = 20;
            sheet.getColumn(columnNum).alignment = { vertical: "middle", horizontal: "left", indent: 1 };
        }

        sheet.mergeCells("F1:G1");

        sheet.addRow({
            rate: "",
            ship: "",
            br: "",
            player: { formula: `SUM(D3:D${2 + ships.length})` },
            brTotal: { formula: `SUM(E3:E${2 + ships.length})` }
        });

        ships.forEach((ship, i) => {
            if (!i) {
                sheet.addRow({
                    // First row with formula for player/brTotal
                    rate: ship.class,
                    ship: ship.name,
                    br: ship.battleRating,
                    player: { formula: 'COUNTIF(F3:AE3,"*")' },
                    brTotal: { formula: "C3*D3" }
                });
            } else {
                // Other rows with formula reference for player/brTotal
                sheet.addRow({
                    rate: ship.class,
                    ship: ship.name,
                    br: ship.battleRating,
                    player: { sharedFormula: "D3" },
                    brTotal: { sharedFormula: "E3" }
                });
            }
        });

        [1, 2].forEach(row => {
            sheet.getRow(row).height = 40;
            sheet.getRow(row).fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "dcc6a9" }
            };
            sheet.getRow(row).font = { bold: true, color: { argb: "6f6150" } };
        });

        ["A1", "A2", "B1", "B2", "C1", "C2", "D1", "E1"].forEach(cell => {
            sheet.getCell(cell).fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "acbbc1" }
            };
            sheet.getCell(cell).font = { bold: true, color: { argb: "f3f7f9" } };
        });

        ["D2", "E2"].forEach(cell => {
            sheet.getCell(cell).fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "cddfe6" }
            };
            sheet.getCell(cell).font = { bold: true, color: { argb: "4a5053" } };
        });

        sheet.getCell("D2").alignment = { vertical: "middle", horizontal: "right", indent: 1 };
        sheet.getCell("E2").alignment = { vertical: "middle", horizontal: "right", indent: 1 };
        sheet.mergeCells("F2:I2");
        sheet.getCell("F2").value = "Enter player names or any data";
        sheet.getCell("F2").font = { bold: false, italic: true, color: { argb: "4a5053" } };

        for (let rowNum = 3; rowNum <= 3 + ships.length - 1; rowNum += 1) {
            sheet.getRow(rowNum);
        }

        for (let rowNum = 3; rowNum <= 3 + ships.length - 1; rowNum += 1) {
            const row = sheet.getRow(rowNum);
            row.border = {
                top: { style: "thin", color: { argb: "cccccc" } },
                bottom: { style: "thin", color: { argb: "cccccc" } }
            };
            for (let columnNum = 1; columnNum <= 5; columnNum += 1) {
                row.getCell(columnNum).fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "f3f7f9" }
                };
            }
            for (let columnNum = 6; columnNum <= 6 + 24; columnNum += 1) {
                row.getCell(columnNum).fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "f5efe7" }
                };
            }
        }

        // Sample values
        sheet.getCell("F3").value = "Fritz";
        sheet.getCell("G3").value = "Franz";
        sheet.getCell("H3").value = "Klaus";
        sheet.getCell("F4").value = "x";
        sheet.getCell("G4").value = "X";
        sheet.getCell("H4").value = "x";
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
