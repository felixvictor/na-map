/* eslint-disable no-param-reassign */

// eslint-disable-next-line import/no-extraneous-dependencies
import Excel4Node from "excel4node";

// eslint-disable-next-line import/no-extraneous-dependencies
// import { sass.renderSync as sassRenderSync } from "node-sass";
import sass from "node-sass";
// eslint-disable-next-line import/no-extraneous-dependencies
import css from "css";
import { readJson } from "./common.mjs";

const shipFilename = process.argv[2],
    portFilename = process.argv[3],
    outFilename = process.argv[4],
    shipsOrig = readJson(shipFilename).shipData,
    portData = readJson(portFilename);

let colours;

/**
 * Create array with numbers ranging from start to end
 * {@link https://stackoverflow.com/questions/36947847/how-to-generate-range-of-numbers-from-0-to-n-in-es2015-only/36953272}
 * @param {Number} start - Start index
 * @param {Number} end - End index
 * @returns {Number[]} Result
 */
const range = (start, end) => [...Array(1 + end - start).keys()].map(v => start + v);

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
function sortShip(a, b) {
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
 * Sort ports
 * @param {Object} a - Ship a
 * @param {Object} b - Ship b
 * @returns {Number} Sort
 */
function sortPort(a, b) {
    if (a.name < b.name) {
        return -1;
    }
    if (a.name > b.name) {
        return 1;
    }
    return 0;
}

const dwPorts = portData.objects.ports.geometries
    .filter(port => !port.properties.shallow)
    .map(port => ({
        name: port.properties.name,
        br: port.properties.brLimit
    }))
    .sort(sortPort);

const swPorts = portData.objects.ports.geometries
    .filter(port => port.properties.shallow)
    .map(port => ({
        name: port.properties.name,
        br: port.properties.brLimit
    }))
    .sort(sortPort);

/** Set colours
 * @returns {Map} Colours
 */
function setColours() {
    const compiledCss = sass
        .renderSync({
            file: "src/scss/pre-compile.scss"
        })
        .css.toString();
    const parsedCss = css.parse(compiledCss);
    return new Map(
        parsedCss.stylesheet.rules
            .filter(rule => rule.selectors !== undefined && rule.selectors[0].startsWith(".colour-palette "))
            .map(rule => {
                const d = rule.declarations.find(declaration => declaration.property === "background-color");
                return [rule.selectors[0].replace(".colour-palette .", ""), d ? d.value : ""];
            })
    );
}

/**
 * Create excel spreadsheet
 * @returns {void}
 */
function createExcel() {
    const primary050 = colours.get("primary-050"),
        primary200 = colours.get("primary-200"),
        primary800 = colours.get("primary-800"),
        secondary050 = colours.get("secondary-050"),
        secondary100 = colours.get("secondary-100"),
        secondary200 = colours.get("secondary-200"),
        secondary400 = colours.get("secondary-400"),
        secondary600 = colours.get("secondary-600"),
        secondary800 = colours.get("secondary-800"),
        background600 = colours.get("background-600"),
        highlight = colours.get("info"),
        red = colours.get("pink");

    const wsOptions = {
        sheetView: {
            showGridLines: false // Flag indicating whether the sheet should have gridlines enabled or disabled during view
        },
        sheetFormat: {
            baseColWidth: 20, // Defaults to 10. Specifies the number of characters of the maximum digit width of the normal style's font. This value does not include margin padding or extra padding for gridlines. It is only the number of characters.,
            defaultColWidth: 20,
            defaultRowHeight: 24
        }
    };

    const workbook = new Excel4Node.Workbook();

    /**
     * Returns fill pattern object
     * @param {String} colour - Pattern colour
     * @returns {Object} Fill pattern
     */
    const fillPattern = colour =>
        workbook.createStyle({ fill: { type: "pattern", patternType: "solid", fgColor: colour } }); // §18.8.20 fill (Fill)

    /**
     * Returns font object with color colour
     * @param {String} colour - Font colour
     * @returns {Object} Font object
     */
    const fontColour = colour => workbook.createStyle({ font: { color: colour } }); // §18.8.22

    /**
     * Returns font object with bold font
     * @param {String} colour - Font colour
     * @returns {Object} Font object
     */
    const fontColourBold = colour => workbook.createStyle({ font: { bold: true, color: colour } }); // §18.8.22

    /**
     * Returns font object with bold font
     * @param {String} colour - Font colour
     * @returns {Object} Font object
     */
    const border = workbook.createStyle({
        // §18.8.4 border (Border)
        border: {
            top: {
                style: "thin",
                color: background600
            },
            bottom: {
                style: "thin",
                color: background600
            }
        }
    });

    /**
     * Returns font object with bold font
     * @param {String} colour - Font colour
     * @returns {Object} Font object
     */
    const brTooHigh = workbook.createStyle({ font: { bold: true, color: red } }); // §18.8.22

    /**
     * Fill worksheet
     * @param {Worksheet} sheet - Worksheet
     * @param {Object[]} ships - Ship data
     * @param {Object[]} ports - port data
     * @returns {void}
     */
    function fillSheet(sheet, ships, ports) {
        const headerRows = 4,
            headerColumns = 5,
            numPlayers = 24,
            numRows = headerRows + ships.length,
            numColumns = headerColumns + numPlayers,
            rowHeight = 40;

        const numberStyle = {
                alignment: {
                    // §18.8.1
                    horizontal: "right",
                    indent: 1, // Number of spaces to indent = indent value * 3
                    //                relativeIndent: integer, // number of additional spaces to indent
                    vertical: "center"
                },
                numberFormat: "#" // §18.8.30 numFmt (Number Format)
            },
            textStyle = {
                alignment: {
                    // §18.8.1
                    horizontal: "left",
                    indent: 1, // Number of spaces to indent = indent value * 3
                    //                relativeIndent: integer, // number of additional spaces to indent
                    vertical: "center"
                },
                numberFormat: "@" // §18.8.30 numFmt (Number Format)
            };

        sheet.column(headerColumns).freeze(); // Freezes the first two columns and scrolls the right view to column D
        sheet.row(headerRows).freeze();

        // ***** Columns *****
        // Format first columns
        // Ship rate
        let currentColumn = 1;
        sheet.column(currentColumn).setWidth(8);
        sheet.cell(1, currentColumn, numRows, currentColumn).style(numberStyle);

        // Ship name
        currentColumn += 1;
        sheet.column(currentColumn).setWidth(22);
        sheet.cell(1, currentColumn, numRows, currentColumn).style(textStyle);

        // Ship battle rating
        currentColumn += 1;
        sheet.column(currentColumn).setWidth(8);
        sheet.cell(1, currentColumn, numRows, currentColumn).style(numberStyle);

        // Number of players
        currentColumn += 1;
        sheet.column(currentColumn).setWidth(12);
        sheet.cell(1, currentColumn, numRows, currentColumn).style(numberStyle);

        // Total battle rating
        currentColumn += 1;
        sheet.column(currentColumn).setWidth(12);
        sheet.cell(1, currentColumn, numRows, currentColumn).style(numberStyle);

        // Player names
        range(headerColumns + 1, headerColumns + numPlayers).forEach(column => {
            sheet.column(column).setWidth(20);
            sheet.cell(1, column, numRows, column).style(textStyle);
        });

        // ***** Rows *****
        // General description row
        let currentRow = 1;
        sheet.row(currentRow).setHeight(rowHeight);
        sheet
            .cell(currentRow, 1, currentRow, numColumns)
            .style(textStyle)
            .style(fontColour(secondary800))
            .style(fillPattern(secondary200));
        sheet.cell(currentRow, 1, currentRow, 3, true).string("Port battle calculator by Felix Victor");
        sheet
            .cell(currentRow, 4, currentRow, 5, true)
            .link("https://forum.game-labs.net/topic/23980-yet-another-map-naval-action-map/", "Game Labs Forum");

        // Port description row
        currentRow += 1;
        sheet.row(currentRow).setHeight(rowHeight);
        sheet
            .cell(currentRow, 1, currentRow, numColumns)
            .style(textStyle)
            .style(fontColour(secondary800))
            .style(fillPattern(secondary200));
        sheet.cell(currentRow, 1).string("Port");
        sheet
            .cell(currentRow, 2)
            .string("1. Select port")
            .style(fontColourBold(highlight));
        sheet.cell(currentRow, headerColumns - 1).string("Max BR");
        sheet.cell(currentRow, headerColumns).style(numberStyle);

        // Column description row
        currentRow += 1;
        sheet.row(currentRow).setHeight(rowHeight);
        sheet
            .cell(currentRow, 1, currentRow, numColumns)
            .style(textStyle)
            .style(fontColourBold(secondary100))
            .style(fillPattern(secondary600));
        sheet.cell(currentRow, 1).string("Rate");
        sheet.cell(currentRow, 2).string("Ship");
        sheet.cell(currentRow, 3).string("BR");
        sheet.cell(currentRow, 4).string("# Players");
        sheet.cell(currentRow, 5).string("BR total");

        sheet.cell(currentRow, headerColumns + 1, currentRow, headerColumns + 2, true).string("Player names");

        // Total row
        currentRow += 1;
        sheet.row(currentRow).setHeight(rowHeight);
        sheet
            .cell(currentRow, 1, currentRow, numColumns)
            .style(textStyle)
            .style(fontColourBold(secondary100))
            .style(fillPattern(secondary600));

        sheet
            .cell(currentRow, headerColumns - 1, currentRow, headerColumns)
            .style(numberStyle)
            .style(fontColourBold(secondary800))
            .style(fillPattern(secondary400));
        sheet
            .cell(currentRow, headerColumns - 1)
            .formula(
                `SUM(${Excel4Node.getExcelAlpha(headerColumns - 1)}${headerRows + 1}:${Excel4Node.getExcelAlpha(
                    headerColumns - 1
                )}${numRows})`
            );
        sheet
            .cell(currentRow, headerColumns)
            .formula(
                `SUM(${Excel4Node.getExcelAlpha(headerColumns)}${headerRows + 1}:${Excel4Node.getExcelAlpha(
                    headerColumns
                )}${numRows})`
            );

        sheet
            .cell(currentRow, headerColumns + 1, currentRow, numColumns, true)
            .string("2. Enter player names")
            .style(fontColourBold(highlight));

        // Ship rows
        const fgColourShip = [secondary050, secondary200],
            fgColourPlayer = [primary050, primary200];
        ships.forEach(ship => {
            currentRow += 1;

            sheet
                .cell(currentRow, 1, currentRow, headerColumns)
                .style(textStyle)
                .style(fontColour(primary800))
                .style(border)
                .style(fillPattern(fgColourShip[ship.class % 2]));

            sheet
                .cell(currentRow, 1)
                .number(ship.class)
                .style(numberStyle);
            sheet.cell(currentRow, 2).string(ship.name);
            sheet
                .cell(currentRow, 3)
                .number(ship.battleRating)
                .style(numberStyle);
            sheet
                .cell(currentRow, headerColumns - 1)
                .formula(
                    `COUNTA(${Excel4Node.getExcelAlpha(headerColumns + 1)}${currentRow}:${Excel4Node.getExcelAlpha(
                        numColumns
                    )}${currentRow})`
                )
                .style(numberStyle);
            sheet
                .cell(currentRow, headerColumns)
                .formula(
                    `${Excel4Node.getExcelAlpha(headerColumns - 2)}${currentRow}*${Excel4Node.getExcelAlpha(
                        headerColumns - 1
                    )}${currentRow}`
                )
                .style(numberStyle);

            sheet
                .cell(currentRow, headerColumns + 1, currentRow, numColumns)
                .style(textStyle)
                .style(fontColour(primary800))
                .style(border)
                .style(fillPattern(fgColourPlayer[ship.class % 2]));
        });

        sheet.addConditionalFormattingRule(`${Excel4Node.getExcelAlpha(headerColumns)}${headerRows}`, {
            type: "expression",
            priority: 1,
            formula: `AND(NOT(ISBLANK(${Excel4Node.getExcelAlpha(headerColumns)}${headerRows - 2})),
                ${Excel4Node.getExcelAlpha(headerColumns)}${headerRows} >
                ${Excel4Node.getExcelAlpha(headerColumns)}${headerRows - 2})`, // formula that returns nonzero or 0
            style: brTooHigh
        });

        // Port select dropdown
        ports.forEach((port, i) => {
            sheet.cell(i + 1, numColumns + 1).string(port.name);
            sheet.cell(i + 1, numColumns + 2).number(port.br);
        });

        sheet.addDataValidation({
            type: "list",
            allowBlank: true,
            prompt: "Select port from dropdown",
            error: "Invalid choice",
            showDropDown: true,
            sqref: "B2",
            formulas: [
                `=${Excel4Node.getExcelAlpha(numColumns + 1)}1:${Excel4Node.getExcelAlpha(numColumns + 1)}${
                    ports.length
                }`
            ]
        });

        sheet
            .cell(2, headerColumns)
            .formula(
                `VLOOKUP(B2,${Excel4Node.getExcelAlpha(numColumns + 1)}1:${Excel4Node.getExcelAlpha(numColumns + 2)}${
                    ports.length
                },2,0)`
            );

        // Sample values
        sheet.cell(headerRows + 1, headerColumns + 1).string("Fritz");
        sheet.cell(headerRows + 1, headerColumns + 2).string("Franz");
        sheet.cell(headerRows + 1, headerColumns + 3).string("Klaus");
        sheet.cell(headerRows + 2, headerColumns + 1).string("x");
        sheet.cell(headerRows + 2, headerColumns + 2).string("X");
        sheet.cell(headerRows + 2, headerColumns + 3).string("x");
    }

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
            .sort((a, b) => sortShip(a, b)),
        swShips = shipsOrig
            .filter(
                ship =>
                    ship.class >= 6 &&
                    !(ship.name.startsWith("Basic") || ship.name.startsWith("Rookie") || ship.name.startsWith("Trader"))
            )
            .sort((a, b) => sortShip(a, b));

    /*
    const dwSheet = workbook.addWorksheet("Deep water port", {
            properties: { tabColor: { argb: primary500 } }
        }),
        swSheet = workbook.addWorksheet("Shallow water port", {
            properties: { tabColor: { argb: secondary500 } }
        });
        */
    const dwSheet = workbook.addWorksheet("Deep water port", wsOptions),
        swSheet = workbook.addWorksheet("Shallow water port", wsOptions);

    fillSheet(dwSheet, dwShips, dwPorts);
    fillSheet(swSheet, swShips, swPorts);

    workbook.write(outFilename, err => {
        if (err) {
            console.error(err);
        }
    });
}

colours = setColours();
createExcel();
