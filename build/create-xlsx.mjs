/**
 * This file is part of na-map.
 *
 * @file      Create pb sheets.
 * @module    build/create-xlsx
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018, 2019
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import Excel4Node from "excel4node";

import sass from "node-sass";
import css from "css";
import { readJson, sortBy } from "./common.mjs";

const shallowWaterFrigates = ["Cerberus", "Hercules", "L’Hermione", "La Renommée", "Surprise"];
const minDeepWaterBR = 80;
const maxNumPlayers = 25;

const columnWidth = 20;
const rowHeight = 24;

const shipFilename = process.argv[2];
const portFilename = process.argv[3];
const outFilename = process.argv[4];

const shipsOrig = readJson(shipFilename);
const portData = readJson(portFilename);

/**
 * Create array with numbers ranging from start to end
 * {@link https://stackoverflow.com/questions/36947847/how-to-generate-range-of-numbers-from-0-to-n-in-es2015-only/36953272}
 * @param {Number} start - Start index
 * @param {Number} end - End index
 * @returns {Number[]} Result
 */
const range = (start, end) => [...new Array(1 + end - start).keys()].map(v => start + v);

const dwPorts = portData
    .filter(port => !port.shallow)
    .map(port => ({
        name: port.name,
        br: port.brLimit
    }))
    .sort(sortBy(["name"]));

const swPorts = portData
    .filter(port => port.shallow)
    .map(port => ({
        name: port.name,
        br: port.brLimit
    }))
    .sort(sortBy(["name"]));

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
    const colours = setColours();
    const colourWhite = colours.get("white");
    const colourPrimaryWhite = colours.get("primary-050");
    const colourPrimaryNearWhite = colours.get("primary-100");
    const colourPrimaryLight = colours.get("primary-200");
    const colourPrimaryDark = colours.get("primary-600");
    const colourContrastWhite = colours.get("secondary-050");
    const colourContrastNearWhite = colours.get("secondary-100");
    const colourContrastLight = colours.get("secondary-200");
    const colourContrastMiddle = colours.get("secondary-400");
    const colourContrastDark = colours.get("secondary-600");
    const colourText = colours.get("secondary-800");
    const colourBackground = colours.get("background-600");
    const colourHighlight = colours.get("info");
    const colourRed = colours.get("pink");

    const wsOptions = {
        sheetView: {
            showGridLines: false // Flag indicating whether the sheet should have gridlines enabled or disabled during view
        },
        sheetFormat: {
            baseColWidth: columnWidth, // Defaults to 10. Specifies the number of characters of the maximum digit width of the normal style's font. This value does not include margin padding or extra padding for gridlines. It is only the number of characters.,
            defaultColWidth: columnWidth,
            defaultRowHeight: rowHeight
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
                color: colourContrastLight
            },
            bottom: {
                style: "thin",
                color: colourContrastLight
            }
        }
    });

    /**
     * Returns font object with bold font
     * @param {String} colour - Font colour
     * @returns {Object} Font object
     */
    const brTooHigh = workbook.createStyle({ font: { bold: true, color: colourRed } }); // §18.8.22

    /**
     * Fill worksheet
     * @param {Worksheet} sheet - Worksheet
     * @param {Object[]} ships - Ship data
     * @param {Object[]} ports - port data
     * @returns {void}
     */
    function fillSheet(sheet, ships, ports) {
        const numberStyle = {
            alignment: {
                // §18.8.1
                horizontal: "right",
                indent: 1, // Number of spaces to indent = indent value * 3
                //                relativeIndent: integer, // number of additional spaces to indent
                vertical: "center"
            },
            numberFormat: "#" // §18.8.30 numFmt (Number Format)
        };
        const textStyle = {
            alignment: {
                // §18.8.1
                horizontal: "left",
                indent: 1, // Number of spaces to indent = indent value * 3
                //                relativeIndent: integer, // number of additional spaces to indent
                vertical: "center"
            },
            numberFormat: "@" // §18.8.30 numFmt (Number Format)
        };

        const columnsHeader = [
            { name: "Ship rate", width: 8, style: numberStyle },
            { name: "Ship name", width: 22, style: textStyle },
            { name: "Ship battle rating", width: 8, style: numberStyle },
            { name: "Number of players", width: 12, style: numberStyle },
            { name: "Total battle rating", width: 12, style: numberStyle }
        ];
        const numRowsHeader = 4;
        const numRowsTotal = numRowsHeader + ships.length;
        const numColumnsHeader = columnsHeader.length;
        const numColumnsTotal = numColumnsHeader + maxNumPlayers;

        sheet.column(numColumnsHeader).freeze(); // Freezes the first two columns and scrolls the right view to column D
        sheet.row(numRowsHeader).freeze();

        // ***** Columns *****
        const setColumns = () => {
            // Format first columns

            columnsHeader.forEach((column, i) => {
                sheet.column(i + 1).setWidth(column.width);
                sheet.cell(1, i + 1, numRowsTotal, i + 1).style(column.style);
            });

            // Player names
            range(numColumnsHeader + 1, numColumnsHeader + maxNumPlayers).forEach(column => {
                sheet.column(column).setWidth(columnWidth);
                sheet.cell(1, column, numRowsTotal, column).style(textStyle);
            });
        };

        setColumns();

        // ***** Rows *****
        // General description row
        let currentRow = 1;
        sheet
            .cell(currentRow, 1, currentRow, numColumnsTotal)
            .style(textStyle)
            .style(fillPattern("white"));
        sheet.cell(currentRow, 1, currentRow, 3, true).string("Port battle calculator by Felix Victor");
        sheet
            .cell(currentRow, 4, currentRow, 5, true)
            .link("https://forum.game-labs.net/topic/23980-yet-another-map-naval-action-map/", "Game Labs Forum");

        // Port description row
        currentRow += 1;
        sheet
            .cell(currentRow, 1, currentRow, numColumnsTotal)
            .style(textStyle)
            .style(fillPattern(colourContrastNearWhite));
        sheet.cell(currentRow, 1).string("Port");
        sheet
            .cell(currentRow, 2)
            .string("1. Select port")
            .style(fontColourBold(colourHighlight));
        sheet.cell(currentRow, numColumnsHeader - 1).string("Max BR");
        sheet.cell(currentRow, numColumnsHeader).style(numberStyle);

        // Column description row
        currentRow += 1;
        sheet
            .cell(currentRow, 1, currentRow, numColumnsTotal)
            .style(textStyle)
            .style(fontColourBold(colourContrastNearWhite))
            .style(fillPattern(colourContrastMiddle));
        sheet.cell(currentRow, 1).string("Rate");
        sheet.cell(currentRow, 2).string("Ship");
        sheet.cell(currentRow, 3).string("BR");
        sheet.cell(currentRow, 4).string("# Players");
        sheet.cell(currentRow, 5).string("BR total");

        sheet.cell(currentRow, numColumnsHeader + 1, currentRow, numColumnsHeader + 2, true).string("Player names");

        // Total row
        currentRow += 1;
        sheet
            .cell(currentRow, 1, currentRow, numColumnsTotal)
            .style(textStyle)
            .style(fontColourBold(colourContrastNearWhite))
            .style(fillPattern(colourContrastMiddle));

        sheet
            .cell(currentRow, numColumnsHeader - 1, currentRow, numColumnsHeader)
            .style(numberStyle)
            .style(fontColourBold(colourText))
            .style(fillPattern(colourContrastLight));
        sheet
            .cell(currentRow, numColumnsHeader - 1)
            .formula(
                `SUM(${Excel4Node.getExcelAlpha(numColumnsHeader - 1)}${numRowsHeader + 1}:${Excel4Node.getExcelAlpha(
                    numColumnsHeader - 1
                )}${numRowsTotal})`
            );
        sheet
            .cell(currentRow, numColumnsHeader)
            .formula(
                `SUM(${Excel4Node.getExcelAlpha(numColumnsHeader)}${numRowsHeader + 1}:${Excel4Node.getExcelAlpha(
                    numColumnsHeader
                )}${numRowsTotal})`
            );

        sheet
            .cell(currentRow, numColumnsHeader + 1, currentRow, numColumnsTotal, true)
            .string("2. Enter player names")
            .style(fontColourBold(colourHighlight));

        // Ship rows
        const fgColourShip = ["white", colourContrastWhite];
        const fgColourPlayer = ["white", colourPrimaryWhite];
        ships.forEach(ship => {
            currentRow += 1;

            sheet
                .cell(currentRow, 1, currentRow, numColumnsHeader)
                .style(textStyle)
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
                .cell(currentRow, numColumnsHeader - 1)
                .formula(
                    `COUNTA(${Excel4Node.getExcelAlpha(numColumnsHeader + 1)}${currentRow}:${Excel4Node.getExcelAlpha(
                        numColumnsTotal
                    )}${currentRow})`
                )
                .style(numberStyle);
            sheet
                .cell(currentRow, numColumnsHeader)
                .formula(
                    `${Excel4Node.getExcelAlpha(numColumnsHeader - 2)}${currentRow}*${Excel4Node.getExcelAlpha(
                        numColumnsHeader - 1
                    )}${currentRow}`
                )
                .style(numberStyle);

            sheet
                .cell(currentRow, numColumnsHeader + 1, currentRow, numColumnsTotal)
                .style(textStyle)
                .style(border)
                .style(fillPattern(fgColourPlayer[ship.class % 2]));
        });

        // BR too high colour
        sheet.addConditionalFormattingRule(`${Excel4Node.getExcelAlpha(numColumnsHeader)}${numRowsHeader}`, {
            type: "expression",
            priority: 1,
            formula: `AND(NOT(ISBLANK(${Excel4Node.getExcelAlpha(numColumnsHeader)}${numRowsHeader - 2})),
                ${Excel4Node.getExcelAlpha(numColumnsHeader)}${numRowsHeader} >
                ${Excel4Node.getExcelAlpha(numColumnsHeader)}${numRowsHeader - 2})`, // formula that returns nonzero or 0
            style: brTooHigh
        });

        // Port select dropdown
        ports.forEach((port, i) => {
            sheet.cell(i + 1, numColumnsTotal + 1).string(port.name);
            sheet.cell(i + 1, numColumnsTotal + 2).number(port.br);
        });

        sheet.addDataValidation({
            type: "list",
            allowBlank: true,
            prompt: "Select port from dropdown",
            error: "Invalid choice",
            showDropDown: true,
            sqref: "B2",
            formulas: [
                `=${Excel4Node.getExcelAlpha(numColumnsTotal + 1)}1:${Excel4Node.getExcelAlpha(numColumnsTotal + 1)}${
                    ports.length
                }`
            ]
        });

        sheet
            .cell(2, numColumnsHeader)
            .formula(
                `VLOOKUP(B2,${Excel4Node.getExcelAlpha(numColumnsTotal + 1)}1:${Excel4Node.getExcelAlpha(
                    numColumnsTotal + 2
                )}${ports.length},2,0)`
            );

        // Sample values
        sheet.cell(numRowsHeader + 1, numColumnsHeader + 1).string("Fritz");
        sheet.cell(numRowsHeader + 1, numColumnsHeader + 2).string("Franz");
        sheet.cell(numRowsHeader + 1, numColumnsHeader + 3).string("Klaus");
        sheet.cell(numRowsHeader + 2, numColumnsHeader + 1).string("x");
        sheet.cell(numRowsHeader + 2, numColumnsHeader + 2).string("X");
        sheet.cell(numRowsHeader + 2, numColumnsHeader + 3).string("x");
    }

    const dwShips = shipsOrig
        .filter(
            ship =>
                !(ship.name.startsWith("Basic") || ship.name.startsWith("Rookie") || ship.name.startsWith("Trader")) &&
                (ship.battleRating >= minDeepWaterBR || ship.name === "Mortar Brig")
        )
        .sort(sortBy(["class", "-battleRating", "name"]));
    const swShips = shipsOrig
        .filter(
            ship =>
                shallowWaterFrigates.includes(ship.name) ||
                (ship.class >= 6 && !["Basic", "Rooki", "Trade"].includes(ship.name.substring(0, 5)))
        )
        .sort(sortBy(["class", "-battleRating", "name"]));

    /*
    const dwSheet = workbook.addWorksheet("Deep water port", {
            properties: { tabColor: { argb: primary500 } }
        }),
        swSheet = workbook.addWorksheet("Shallow water port", {
            properties: { tabColor: { argb: secondary500 } }
        });
        */
    const dwSheet = workbook.addWorksheet("Deep water port", wsOptions);
    const swSheet = workbook.addWorksheet("Shallow water port", wsOptions);

    fillSheet(dwSheet, dwShips, dwPorts);
    fillSheet(swSheet, swShips, swPorts);

    workbook.write(outFilename, err => {
        if (err) {
            console.error(err);
        }
    });
}

createExcel();
