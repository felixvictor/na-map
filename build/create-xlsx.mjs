/* eslint-disable no-param-reassign */

// eslint-disable-next-line import/no-extraneous-dependencies
import Excel from "exceljs";
import { readJson } from "./common.mjs";

const inFilename = process.argv[2],
    outFilename = process.argv[3];
const shipsOrig = readJson(inFilename).shipData;

const range = (start, end) => [...Array(1 + end - start).keys()].map(v => start + v);

/**
 * Converts integer to excel column name
 * {@link https://github.com/avilaton/excel-column-name/blob/master/index.js}
 * @param {Number} number - Column name as integer
 * @returns {String} Excel column name
 */
const intToExcelCol = number => {
    let colName = "",
        dividend = Math.floor(Math.abs(number)),
        rest;

    while (dividend > 0) {
        rest = (dividend - 1) % 26;
        colName = String.fromCharCode(65 + rest) + colName;
        dividend = parseInt((dividend - rest) / 26, 10);
    }
    return colName;
};

/**
 * Converts excel column name to integer
 * {@link https://github.com/avilaton/excel-column-name/blob/master/index.js}
 * @param {String} colName - Excel column name
 * @returns {Number} Column name as integer
 */
const excelColToInt = colName => {
    const digits = colName.toUpperCase().split("");
    let number = 0;

    for (let i = 0; i < digits.length; i += 1) {
        number += (digits[i].charCodeAt(0) - 64) * 26 ** (digits.length - i - 1);
    }

    return number;
};

// https://stackoverflow.com/questions/1144783/how-to-replace-all-occurrences-of-a-string-in-javascript
// eslint-disable-next-line no-extend-native,func-names
String.prototype.replaceAll = function(search, replacement) {
    const target = this;
    return target.replace(new RegExp(search, "g"), replacement);
};

/**
 * Sort ships
 * @param {Object} a - Ship a
 * @param {Object} b - Ship b
 * @returns {Number} Sort
 */
function sort(a, b) {
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
}

/**
 * Create excel spreadsheet
 * @returns {void}
 */
function createExcel() {
    const primary050 = "faf7f3",
        primary200 = "ede1d2",
        primary400 = "dcc6a9",
        primary500 = "d5bb99",
        primary800 = "6f6150",
        secondary050 = "f9fbfc",
        secondary100 = "f3f7f9",
        secondary200 = "e9f1f4",
        secondary500 = "cddfe6",
        secondary600 = "acbbc1",
        secondary800 = "6b7478",
        secondary900 = "4a5053",
        background600 = "c5bbbb";

    /**
     * Fill worksheet
     * @param {Worksheet} sheet - Worksheet
     * @param {Object[]} ships - Ship data
     * @returns {void}
     */
    function fillSheet(sheet, ships) {
        /**
         * Returns fill pattern object
         * @param {String} colour - Pattern colour
         * @returns {Object} Fill pattern
         */
        const fillPattern = colour => ({ type: "pattern", pattern: "solid", fgColor: { argb: colour } });

        const headerRows = 4,
            headerColumns = 5,
            numPlayers = 24,
            rowHeight = 40,
            textAlignment = { vertical: "middle", horizontal: "left", indent: 1 },
            numberAlignment = { vertical: "middle", horizontal: "right", indent: 1 },
            numFmt = "#";

        sheet.views = [{ state: "frozen", xSplit: 5, ySplit: 2, showGridLines: false }];
        sheet.properties.defaultRowHeight = 24;

        // ***** Columns *****
        // Content and format first columns
        const columns = [
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
            }
        ];

        // Format other columns (player names)
        for (let i = 1; i <= numPlayers; i += 1) {
            columns.push({
                key: `name-${i}`,
                width: 20,
                style: { alignment: textAlignment }
            });
        }

        // Add columns to sheet
        sheet.columns = columns;

        // ***** Rows *****
        // General description row
        let currentRow = 1;
        sheet.mergeCells(`A${currentRow}:C${currentRow}`);
        sheet.getCell(`A${currentRow}`).value = "Simple port battle calculator by Felix Victor";
        sheet.mergeCells(`D${currentRow}:E${currentRow}`);
        sheet.getCell(`D${currentRow}`).value = {
            text: "Game Labs Forum",
            hyperlink: "http://forum.game-labs.net/topic/23980-yet-another-map-naval-action-map/"
        };
        sheet.getRow(currentRow).height = rowHeight;
        sheet.getRow(currentRow).fill = fillPattern(secondary200);
        sheet.getRow(currentRow).font = { color: { argb: secondary800 } };

        // Port description row
        currentRow += 1;
        sheet.addRow({
            rate: "",
            ship: "Ship",
            br: "",
            player: "",
            brTotal: "",
            names: "Player names"
        });
        sheet.getRow(currentRow).height = rowHeight;
        sheet.getRow(currentRow).fill = fillPattern(secondary200);
        sheet.getRow(currentRow).font = { color: { argb: secondary800 } };

        // Column description row
        currentRow += 1;
        sheet.addRow({
            rate: "Rate",
            ship: "Ship",
            br: "BR",
            player: "# Player",
            brTotal: "BR total",
            names: "Player names"
        });
        sheet.mergeCells(`F${currentRow}:G${currentRow}`);

        // Total row
        currentRow += 1;
        sheet.addRow({
            rate: "",
            ship: "",
            br: "",
            player: { formula: `SUM(D${headerRows + 1}:D${headerRows + ships.length})` },
            brTotal: { formula: `SUM(E${headerRows + 1}:E${headerRows + ships.length})` }
        });

        ships.forEach((ship, i) => {
            currentRow += 1;
            if (!i) {
                sheet.addRow({
                    // First row with formula for player/brTotal
                    rate: ship.class,
                    ship: ship.name,
                    br: ship.battleRating,
                    player: { formula: `COUNTIF(F${headerRows + 1}:AE${headerRows + 1},"*")` },
                    brTotal: { formula: `C${headerRows + 1}*D${headerRows + 1}` }
                });
            } else {
                // Other rows with formula reference for player/brTotal
                sheet.addRow({
                    rate: ship.class,
                    ship: ship.name,
                    br: ship.battleRating,
                    player: { sharedFormula: `D${headerRows + 1}` },
                    brTotal: { sharedFormula: `E${headerRows + 1}` }
                });
            }
        });

        range(headerRows - 1, headerRows).forEach(row => {
            sheet.getRow(row).height = rowHeight;
            sheet.getRow(row).fill = fillPattern(primary400);
            sheet.getRow(row).font = { bold: true, color: { argb: primary800 } };
        });

        range(1, headerColumns).forEach(columnInt => {
            const column = intToExcelCol(columnInt);
            range(headerRows - 1, headerRows).forEach(row => {
                sheet.getCell(column + row).fill = fillPattern(secondary600);
                sheet.getCell(column + row).font = { bold: true, color: { argb: secondary100 } };
            });
        });

        range(headerColumns - 1, headerColumns).forEach(columnInt => {
            const column = intToExcelCol(columnInt);
            [headerRows].forEach(row => {
                sheet.getCell(column + row).fill = fillPattern(secondary500);
                sheet.getCell(column + row).font = { bold: true, color: { argb: secondary900 } };
                sheet.getCell(column + row).alignment = numberAlignment;
            });
        });

        /*
        sheet.mergeCells("F3:I3");
        sheet.getCell("F3").value = "Enter player names";
        sheet.getCell("F3").font = { bold: false, italic: true, color: { argb: secondary900 } };
        */
        sheet.mergeCells(
            `${intToExcelCol(headerColumns + 1)}${headerRows}:${intToExcelCol(headerColumns + 4)}${headerRows}`
        );
        sheet.getCell(`${intToExcelCol(headerColumns + 1)}${headerRows}`).value = "Enter player names";
        sheet.getCell(`${intToExcelCol(headerColumns + 1)}${headerRows}`).font = {
            bold: false,
            italic: true,
            color: { argb: secondary900 }
        };

        const fgColourShip = [{ argb: secondary050 }, { argb: secondary200 }],
            fgColourPlayer = [{ argb: primary050 }, { argb: primary200 }];
        for (let rowNum = headerRows + 1; rowNum <= headerRows + ships.length; rowNum += 1) {
            const row = sheet.getRow(rowNum);
            row.border = {
                top: { style: "thin", color: { argb: background600 } },
                bottom: { style: "thin", color: { argb: background600 } }
            };
            for (let columnNum = 1; columnNum <= headerColumns; columnNum += 1) {
                row.getCell(columnNum).fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: fgColourShip[row.getCell(1).value % 2]
                };
            }
            for (let columnNum = headerColumns + 1; columnNum < headerColumns + 1 + numPlayers; columnNum += 1) {
                row.getCell(columnNum).fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: fgColourPlayer[row.getCell(1).value % 2]
                };
            }
        }

        // Sample values
        sheet.getCell(`${intToExcelCol(headerColumns + 1)}${headerRows + 1}`).value = "Fritz";
        sheet.getCell(`${intToExcelCol(headerColumns + 2)}${headerRows + 1}`).value = "Franz";
        sheet.getCell(`${intToExcelCol(headerColumns + 3)}${headerRows + 1}`).value = "Klaus";
        sheet.getCell(`${intToExcelCol(headerColumns + 1)}${headerRows + 2}`).value = "x";
        sheet.getCell(`${intToExcelCol(headerColumns + 2)}${headerRows + 2}`).value = "X";
        sheet.getCell(`${intToExcelCol(headerColumns + 3)}${headerRows + 2}`).value = "x";
    }

    const workbook = new Excel.Workbook(),
        now = new Date();
    const dwShips = shipsOrig
            .filter(
                ship =>
                    !(
                        ship.name.startsWith("Basic") ||
                        ship.name.startsWith("Rookie") ||
                        ship.name.startsWith("Trader")
                    ) &&
                    (ship.battleRating >= 80 || ship.name === "Mortar Brig")
            )
            .sort((a, b) => sort(a, b)),
        swShips = shipsOrig
            .filter(
                ship =>
                    ship.class >= 6 &&
                    !(ship.name.startsWith("Basic") || ship.name.startsWith("Rookie") || ship.name.startsWith("Trader"))
            )
            .sort((a, b) => sort(a, b));

    workbook.creator = "iB aka Felix Victor";
    workbook.created = now;

    const dwSheet = workbook.addWorksheet("Deep water port", {
            properties: { tabColor: { argb: primary500 } }
        }),
        swSheet = workbook.addWorksheet("Shallow water port", {
            properties: { tabColor: { argb: secondary500 } }
        });

    fillSheet(dwSheet, dwShips);
    fillSheet(swSheet, swShips);

    workbook.xlsx.writeFile(outFilename);
}

createExcel();
