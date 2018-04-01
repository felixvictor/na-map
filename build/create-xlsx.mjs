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
        const numHeader = 3,
            textAlignment = { vertical: "middle", horizontal: "left", indent: 1 },
            numberAlignment = { vertical: "middle", horizontal: "right", indent: 1 },
            numFmt = "#";

        sheet.views = [{ state: "frozen", xSplit: 5, ySplit: 2 }];
        sheet.properties.defaultRowHeight = 24;

        // ** Columns
        // Content and format first columns
        sheet.columns = [
            {
                key: "rate",
                width: 8,
                style: { alignment: numberAlignment, numFmt }
            },
            {
                key: "ship",
                width: 24,
                style: { alignment: textAlignment }
            },
            {
                key: "br",
                width: 8,
                style: { alignment: numberAlignment, numFmt }
            },
            {
                key: "player",
                width: 12,
                style: { alignment: numberAlignment, numFmt }
            },
            {
                key: "brTotal",
                width: 12,
                style: { alignment: numberAlignment, numFmt }
            },
            {
                key: "names",
                width: 20,
                style: { alignment: textAlignment }
            }
        ];

        // Format other columns (player names)
        for (let columnNum = 7; columnNum <= 7 + 23; columnNum += 1) {
            sheet.getColumn(columnNum).width = 20;
            sheet.getColumn(columnNum).alignment = textAlignment;
        }

        // ** Rows
        // First Row (description)
        sheet.mergeCells("A1:C1");
        sheet.getCell("A1").value = "Simple port battle calculator by Felix Victor";
        sheet.mergeCells("D1:E1");
        sheet.getCell("D1").value = {
            text: "Game Labs Forum",
            hyperlink: "http://forum.game-labs.net/topic/23980-yet-another-map-naval-action-map/"
        };
        sheet.getRow(1).height = 40;
        sheet.getRow(1).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "e9f1f4" }
        };
        sheet.getRow(1).font = { color: { argb: "6b7478" } };

        sheet.addRow({
            rate: "Rate",
            ship: "Ship",
            br: "BR",
            player: "# Player",
            brTotal: "BR total",
            names: "Player names"
        });

        sheet.mergeCells("F2:G2");
        sheet.addRow({
            rate: "",
            ship: "",
            br: "",
            player: { formula: `SUM(D4:D${numHeader + ships.length})` },
            brTotal: { formula: `SUM(E4:E${numHeader + ships.length})` }
        });

        ships.forEach((ship, i) => {
            if (!i) {
                sheet.addRow({
                    // First row with formula for player/brTotal
                    rate: ship.class,
                    ship: ship.name,
                    br: ship.battleRating,
                    player: { formula: 'COUNTIF(F4:AE4,"*")' },
                    brTotal: { formula: "C4*D4" }
                });
            } else {
                // Other rows with formula reference for player/brTotal
                sheet.addRow({
                    rate: ship.class,
                    ship: ship.name,
                    br: ship.battleRating,
                    player: { sharedFormula: "D4" },
                    brTotal: { sharedFormula: "E4" }
                });
            }
        });

        [2, 3].forEach(row => {
            sheet.getRow(row).height = 40;
            sheet.getRow(row).fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "dcc6a9" }
            };
            sheet.getRow(row).font = { bold: true, color: { argb: "6f6150" } };
        });

        ["A2", "A3", "B2", "B3", "C2", "C3", "D2", "E2"].forEach(cell => {
            sheet.getCell(cell).fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "acbbc1" }
            };
            sheet.getCell(cell).font = { bold: true, color: { argb: "f3f7f9" } };
        });

        ["D3", "E3"].forEach(cell => {
            sheet.getCell(cell).fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "cddfe6" }
            };
            sheet.getCell(cell).font = { bold: true, color: { argb: "4a5053" } };
        });

        sheet.getCell("D3").alignment = numberAlignment;
        sheet.getCell("E3").alignment = numberAlignment;
        sheet.mergeCells("F3:I3");
        sheet.getCell("F3").value = "Enter player names";
        sheet.getCell("F3").font = { bold: false, italic: true, color: { argb: "4a5053" } };

        for (let rowNum = numHeader + 1; rowNum <= numHeader + ships.length; rowNum += 1) {
            sheet.getRow(rowNum);
        }

        for (let rowNum = numHeader + 1; rowNum <= numHeader + ships.length; rowNum += 1) {
            const row = sheet.getRow(rowNum);
            row.border = {
                top: { style: "thin", color: { argb: "cccccc" } },
                bottom: { style: "thin", color: { argb: "cccccc" } }
            };
            for (let columnNum = 1; columnNum <= 5; columnNum += 1) {
                row.getCell(columnNum).fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "e9f1f4" }
                };
            }
            for (let columnNum = 6; columnNum <= 6 + 24; columnNum += 1) {
                row.getCell(columnNum).fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "ede1d2" }
                };
            }
        }

        // Sample values
        sheet.getCell("F4").value = "Fritz";
        sheet.getCell("G4").value = "Franz";
        sheet.getCell("H4").value = "Klaus";
        sheet.getCell("F5").value = "x";
        sheet.getCell("G5").value = "X";
        sheet.getCell("H5").value = "x";
    }

    const workbook = new Excel.Workbook(),
        now = new Date();
    const dwShips = shipsOrig
            .filter(ship => ship.class < 6 || ship.name === "Mortar Brig")
            .sort((a, b) => a.class - b.class || b.battleRating - a.battleRating || a.name - b.name),
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
            properties: { tabColor: { argb: "d5bb99" } }
        }),
        swSheet = workbook.addWorksheet("Shallow water port", {
            properties: { tabColor: { argb: "cddfe6" } }
        });

    fillSheet(dwSheet, dwShips);
    fillSheet(swSheet, swShips);

    workbook.xlsx.writeFile(outFilename);
}

createExcel();
