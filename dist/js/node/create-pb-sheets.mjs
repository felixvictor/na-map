/*!
 * This file is part of na-map.
 *
 * @file      Create pb sheets.
 * @module    src/js/node/create-pb-sheets
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import path from "path";
import Excel4Node from "excel4node";
import sass from "node-sass";
import css from "css";
import { range } from "../common/common";
import { commonPaths } from "../common/common-dir";
import { sortBy } from "../common/common-node";
import { readJson } from "../common/common-file";
const shallowWaterFrigates = new Set(["Cerberus", "Hercules", "L’Hermione", "La Renommée", "Surprise"]);
const minDeepWaterBR = 80;
const maxNumPlayers = 25;
const columnWidth = 20;
const rowHeight = 24;
let portsOrig;
let shipsOrig;
const fileScssPreCompile = path.resolve("src", "scss", "pre-compile.scss");
const setColours = () => {
    var _a;
    const compiledCss = sass
        .renderSync({
        file: fileScssPreCompile,
    })
        .css.toString();
    const parsedCss = css.parse(compiledCss);
    return new Map(((_a = parsedCss.stylesheet) === null || _a === void 0 ? void 0 : _a.rules.filter((rule) => { var _a; return (_a = rule.selectors) === null || _a === void 0 ? void 0 : _a[0].startsWith(".colour-palette "); }))
        .filter((rule) => { var _a; return (_a = rule === null || rule === void 0 ? void 0 : rule.declarations) === null || _a === void 0 ? void 0 : _a.find((declaration) => declaration.property === "background-color"); })
        .map((rule) => {
        var _a, _b, _c, _d;
        const d = (_a = rule === null || rule === void 0 ? void 0 : rule.declarations) === null || _a === void 0 ? void 0 : _a.find((declaration) => declaration.property === "background-color");
        return [(_c = (_b = rule.selectors) === null || _b === void 0 ? void 0 : _b[0].replace(".colour-palette .", "")) !== null && _c !== void 0 ? _c : "", (_d = d.value) !== null && _d !== void 0 ? _d : ""];
    }));
};
const createPortBattleSheets = () => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const portsDeepWater = portsOrig
        .filter((port) => !port.shallow)
        .map((port) => ({
        name: port.name,
        br: port.brLimit,
    }))
        .sort((a, b) => a.name.localeCompare(b.name));
    const portsShallowWater = portsOrig
        .filter((port) => port.shallow)
        .map((port) => ({
        name: port.name,
        br: port.brLimit,
    }))
        .sort((a, b) => a.name.localeCompare(b.name));
    const colours = setColours();
    const colourPrimaryWhite = (_a = colours.get("primary-050")) !== null && _a !== void 0 ? _a : "";
    const colourContrastWhite = (_b = colours.get("secondary-050")) !== null && _b !== void 0 ? _b : "";
    const colourContrastNearWhite = (_c = colours.get("secondary-100")) !== null && _c !== void 0 ? _c : "";
    const colourContrastLight = (_d = colours.get("secondary-200")) !== null && _d !== void 0 ? _d : "";
    const colourContrastMiddle = (_e = colours.get("secondary-400")) !== null && _e !== void 0 ? _e : "";
    const colourText = (_f = colours.get("secondary-800")) !== null && _f !== void 0 ? _f : "";
    const colourHighlight = (_g = colours.get("info")) !== null && _g !== void 0 ? _g : "";
    const colourRed = (_h = colours.get("pink")) !== null && _h !== void 0 ? _h : "";
    const wsOptions = {
        sheetView: {
            showGridLines: false,
        },
        sheetFormat: {
            baseColWidth: columnWidth,
            defaultColWidth: columnWidth,
            defaultRowHeight: rowHeight,
        },
    };
    const workbook = new Excel4Node.Workbook();
    const fillPattern = (colour) => workbook.createStyle({ fill: { type: "pattern", patternType: "solid", fgColor: colour } });
    const fontColourBold = (colour) => workbook.createStyle({ font: { bold: true, color: colour } });
    const border = workbook.createStyle({
        border: {
            top: {
                style: "thin",
                color: colourContrastLight,
            },
            bottom: {
                style: "thin",
                color: colourContrastLight,
            },
        },
    });
    const brTooHigh = workbook.createStyle({ font: { bold: true, color: colourRed } });
    function fillSheet(sheet, ships, ports) {
        const numberStyle = {
            alignment: {
                horizontal: "right",
                indent: 1,
                vertical: "center",
            },
            numberFormat: "#",
        };
        const textStyle = {
            alignment: {
                horizontal: "left",
                indent: 1,
                vertical: "center",
            },
            numberFormat: "@",
        };
        const columnsHeader = [
            { name: "Ship rate", width: 8, style: numberStyle },
            { name: "Ship name", width: 22, style: textStyle },
            { name: "Ship battle rating", width: 8, style: numberStyle },
            { name: "Number of players", width: 12, style: numberStyle },
            { name: "Total battle rating", width: 12, style: numberStyle },
        ];
        const numRowsHeader = 4;
        const numRowsTotal = numRowsHeader + ships.length;
        const numColumnsHeader = columnsHeader.length;
        const numColumnsTotal = numColumnsHeader + maxNumPlayers;
        sheet.column(numColumnsHeader).freeze();
        sheet.row(numRowsHeader).freeze();
        const setColumns = () => {
            for (const column of columnsHeader) {
                const i = columnsHeader.indexOf(column);
                sheet.column(i + 1).setWidth(column.width);
                sheet.cell(1, i + 1, numRowsTotal, i + 1).style(column.style);
            }
            for (const column of range(numColumnsHeader + 1, numColumnsHeader + maxNumPlayers)) {
                sheet.column(column).setWidth(columnWidth);
                sheet.cell(1, column, numRowsTotal, column).style(textStyle);
            }
        };
        setColumns();
        let currentRow = 1;
        sheet.cell(currentRow, 1, currentRow, numColumnsTotal).style(textStyle).style(fillPattern("white"));
        sheet.cell(currentRow, 1, currentRow, 3, true).string("Port battle calculator by Felix Victor");
        sheet
            .cell(currentRow, 4, currentRow, 5, true)
            .link("https://forum.game-labs.net/topic/23980-yet-another-map-naval-action-map/", "Game Labs Forum");
        currentRow += 1;
        sheet
            .cell(currentRow, 1, currentRow, numColumnsTotal)
            .style(textStyle)
            .style(fillPattern(colourContrastNearWhite));
        sheet.cell(currentRow, 1).string("Port");
        sheet.cell(currentRow, 2).string("1. Select port").style(fontColourBold(colourHighlight));
        sheet.cell(currentRow, numColumnsHeader - 1).string("Max BR");
        sheet.cell(currentRow, numColumnsHeader).style(numberStyle);
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
            .formula(`SUM(${Excel4Node.getExcelAlpha(numColumnsHeader - 1)}${numRowsHeader + 1}:${Excel4Node.getExcelAlpha(numColumnsHeader - 1)}${numRowsTotal})`);
        sheet
            .cell(currentRow, numColumnsHeader)
            .formula(`SUM(${Excel4Node.getExcelAlpha(numColumnsHeader)}${numRowsHeader + 1}:${Excel4Node.getExcelAlpha(numColumnsHeader)}${numRowsTotal})`);
        sheet
            .cell(currentRow, numColumnsHeader + 1, currentRow, numColumnsTotal, true)
            .string("2. Enter player names")
            .style(fontColourBold(colourHighlight));
        const fgColourShip = ["white", colourContrastWhite];
        const fgColourPlayer = ["white", colourPrimaryWhite];
        for (const ship of ships) {
            currentRow += 1;
            sheet
                .cell(currentRow, 1, currentRow, numColumnsHeader)
                .style(textStyle)
                .style(border)
                .style(fillPattern(fgColourShip[ship.class % 2]));
            sheet.cell(currentRow, 1).number(ship.class).style(numberStyle);
            sheet.cell(currentRow, 2).string(ship.name);
            sheet.cell(currentRow, 3).number(ship.battleRating).style(numberStyle);
            sheet
                .cell(currentRow, numColumnsHeader - 1)
                .formula(`COUNTA(${Excel4Node.getExcelAlpha(numColumnsHeader + 1)}${currentRow}:${Excel4Node.getExcelAlpha(numColumnsTotal)}${currentRow})`)
                .style(numberStyle);
            sheet
                .cell(currentRow, numColumnsHeader)
                .formula(`${Excel4Node.getExcelAlpha(numColumnsHeader - 2)}${currentRow}*${Excel4Node.getExcelAlpha(numColumnsHeader - 1)}${currentRow}`)
                .style(numberStyle);
            sheet
                .cell(currentRow, numColumnsHeader + 1, currentRow, numColumnsTotal)
                .style(textStyle)
                .style(border)
                .style(fillPattern(fgColourPlayer[ship.class % 2]));
        }
        sheet.addConditionalFormattingRule(`${Excel4Node.getExcelAlpha(numColumnsHeader)}${numRowsHeader}`, {
            type: "expression",
            priority: 1,
            formula: `AND(NOT(ISBLANK(${Excel4Node.getExcelAlpha(numColumnsHeader)}${numRowsHeader - 2})),
                ${Excel4Node.getExcelAlpha(numColumnsHeader)}${numRowsHeader} >
                ${Excel4Node.getExcelAlpha(numColumnsHeader)}${numRowsHeader - 2})`,
            style: brTooHigh,
        });
        for (const port of ports) {
            const i = ports.indexOf(port);
            sheet.cell(i + 1, numColumnsTotal + 1).string(port.name);
            sheet.cell(i + 1, numColumnsTotal + 2).number(port.br);
        }
        sheet.addDataValidation({
            type: "list",
            allowBlank: true,
            prompt: "Select port from dropdown",
            error: "Invalid choice",
            showDropDown: true,
            sqref: "B2",
            formulas: [
                `=${Excel4Node.getExcelAlpha(numColumnsTotal + 1)}1:${Excel4Node.getExcelAlpha(numColumnsTotal + 1)}${ports.length}`,
            ],
        });
        sheet
            .cell(2, numColumnsHeader)
            .formula(`VLOOKUP(B2,${Excel4Node.getExcelAlpha(numColumnsTotal + 1)}1:${Excel4Node.getExcelAlpha(numColumnsTotal + 2)}${ports.length},2,0)`);
        sheet.cell(numRowsHeader + 1, numColumnsHeader + 1).string("Fritz");
        sheet.cell(numRowsHeader + 1, numColumnsHeader + 2).string("Franz");
        sheet.cell(numRowsHeader + 1, numColumnsHeader + 3).string("Klaus");
        sheet.cell(numRowsHeader + 2, numColumnsHeader + 1).string("x");
        sheet.cell(numRowsHeader + 2, numColumnsHeader + 2).string("X");
        sheet.cell(numRowsHeader + 2, numColumnsHeader + 3).string("x");
    }
    const dwShips = shipsOrig
        .filter((ship) => !["Basic", "Hulk ", "Rooki", "Trade", "Tutor"].includes(ship.name.slice(0, 5)) &&
        (ship.battleRating >= minDeepWaterBR || ship.name === "Mortar Brig"))
        .sort(sortBy(["class", "-battleRating", "name"]));
    const swShips = shipsOrig
        .filter((ship) => shallowWaterFrigates.has(ship.name) ||
        (ship.class >= 6 && !["Basic", "Rooki", "Trade", "Tutor"].includes(ship.name.slice(0, 5))))
        .sort(sortBy(["class", "-battleRating", "name"]));
    const dwSheet = workbook.addWorksheet("Deep water port", wsOptions);
    const swSheet = workbook.addWorksheet("Shallow water port", wsOptions);
    fillSheet(dwSheet, dwShips, portsDeepWater);
    fillSheet(swSheet, swShips, portsShallowWater);
    workbook.write(commonPaths.filePbSheet, (err) => {
        if (err) {
            console.error(err);
        }
    });
};
export const createPortBattleSheet = () => {
    portsOrig = readJson(commonPaths.filePort);
    shipsOrig = readJson(commonPaths.fileShip);
    createPortBattleSheets();
};
//# sourceMappingURL=create-pb-sheets.js.map