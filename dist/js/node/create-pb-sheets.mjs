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
import css from "css";
import Excel from "exceljs";
import sass from "sass";
import { range } from "../common/common";
import { commonPaths, serverStartDate } from "../common/common-dir";
import { executeCommand, readJson } from "../common/common-file";
import { sortBy } from "../common/common-node";
const shallowWaterFrigates = new Set(["Cerberus", "Hercules", "L’Hermione", "La Renommée", "Surprise"]);
const minDeepWaterBR = 80;
const maxNumPlayers = 25;
const columnWidth = 20;
const rowHeight = 24;
const numRowsHeader = 4;
const numberNumFmt = "#";
const numberAlign = {
    horizontal: "right",
    indent: 1,
    vertical: "middle",
};
const numberStyle = {
    alignment: numberAlign,
    numFmt: numberNumFmt,
};
const textNumFmt = "@";
const textAlign = {
    horizontal: "left",
    indent: 1,
    vertical: "middle",
};
const textStyle = {
    alignment: textAlign,
    numFmt: textNumFmt,
};
const columnsHeader = [
    { name: "Ship rate", width: 8, style: numberStyle },
    { name: "Ship name", width: 22, style: textStyle },
    { name: "Ship battle rating", width: 8, style: numberStyle },
    { name: "Number of players", width: 12, style: numberStyle },
    { name: "Total battle rating", width: 12, style: numberStyle },
];
const numColumnsHeader = columnsHeader.length;
const numColumnsTotal = numColumnsHeader + maxNumPlayers;
const fileScssPreCompile = path.resolve("src", "scss", "pre-compile.scss");
const getArgbColour = (hexColour) => `00${hexColour.replace("#", "")}`;
const defaultColour = getArgbColour("#44ff00");
const setColours = () => {
    const compiledCss = sass
        .renderSync({
        file: fileScssPreCompile,
    })
        .css.toString();
    const parsedCss = css.parse(compiledCss);
    return new Map(parsedCss.stylesheet?.rules.filter((rule) => rule.selectors?.[0].startsWith(".colour-palette "))
        .filter((rule) => rule?.declarations?.find((declaration) => declaration.property === "background-color"))
        .map((rule) => {
        const d = rule?.declarations?.find((declaration) => declaration.property === "background-color");
        return [
            rule.selectors?.[0].replace(".colour-palette .", "") ?? "",
            getArgbColour(d.value ?? defaultColour),
        ];
    }));
};
let workbook;
let portsDeepWater;
let portsShallowWater;
let dwShips;
let swShips;
const colours = setColours();
const colourWhite = colours.get("white") ?? defaultColour;
const colourPrimaryWhite = colours.get("primary-050") ?? defaultColour;
const colourContrastWhite = colours.get("secondary-050") ?? defaultColour;
const colourContrastNearWhite = colours.get("secondary-100") ?? defaultColour;
const colourContrastLight = colours.get("secondary-200") ?? defaultColour;
const colourContrastMiddle = colours.get("secondary-400") ?? defaultColour;
const colourText = colours.get("secondary-800") ?? defaultColour;
const colourHighlight = colours.get("teal") ?? defaultColour;
const colourRed = colours.get("pink") ?? defaultColour;
const defaultFont = {
    bold: false,
    color: { argb: colourText },
    family: 2,
    italic: false,
    name: "Arial",
    outline: false,
    scheme: "minor",
    size: 11,
    strike: false,
    underline: false,
};
import StylesXform from "exceljs/lib/xlsx/xform/style/styles-xform";
const origStylesXformInit = StylesXform.prototype.init;
StylesXform.prototype.init = function () {
    Reflect.apply(origStylesXformInit, this, arguments);
    this._addFont(defaultFont);
};
const wsOptions = {
    views: [
        {
            activeCell: "A1",
            showGridLines: false,
            state: "frozen",
            xSplit: numColumnsHeader,
            ySplit: numRowsHeader,
        },
    ],
    properties: {
        defaultColWidth: columnWidth,
        defaultRowHeight: rowHeight,
    },
};
const setupData = () => {
    const portsOrig = readJson(commonPaths.filePort);
    const shipsOrig = readJson(commonPaths.fileShip);
    portsDeepWater = portsOrig
        .filter((port) => !port.shallow)
        .map((port) => ({
        name: port.name,
        br: port.brLimit,
    }))
        .sort((a, b) => a.name.localeCompare(b.name));
    portsShallowWater = portsOrig
        .filter((port) => port.shallow)
        .map((port) => ({
        name: port.name,
        br: port.brLimit,
    }))
        .sort((a, b) => a.name.localeCompare(b.name));
    dwShips = shipsOrig
        .filter((ship) => !["Basic", "Hulk ", "Rooki", "Trade", "Tutor"].includes(ship.name.slice(0, 5)) &&
        (ship.battleRating >= minDeepWaterBR || ship.name === "Mortar Brig"))
        .sort(sortBy(["class", "-battleRating", "name"]));
    swShips = shipsOrig
        .filter((ship) => shallowWaterFrigates.has(ship.name) ||
        (ship.class >= 6 && !["Basic", "Rooki", "Trade", "Tutor"].includes(ship.name.slice(0, 5))))
        .sort(sortBy(["class", "-battleRating", "name"]));
};
const fillPattern = (fgColour) => ({
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: fgColour },
});
const fontColourBold = (colour) => ({
    ...defaultFont,
    ...{
        bold: true,
        color: { argb: colour },
    },
});
const border = {
    top: {
        style: "thin",
        color: { argb: colourContrastLight },
    },
    bottom: {
        style: "thin",
        color: { argb: colourContrastLight },
    },
};
const brTooHigh = {
    font: { ...fontColourBold(colourRed), ...{ size: 14 } },
};
const getExcelAlpha = (colNum) => {
    let remaining = colNum;
    const aCharCode = 65;
    let columnName = "";
    while (remaining > 0) {
        const mod = (remaining - 1) % 26;
        columnName = String.fromCharCode(aCharCode + mod) + columnName;
        remaining = (remaining - 1 - mod) / 26;
    }
    return columnName;
};
const formula = (formula) => ({
    formula,
    date1904: false,
});
function fillSheet(sheet, ships, ports) {
    const numRowsTotal = numRowsHeader + ships.length;
    let row;
    let cell;
    const setColumns = () => {
        for (const column of columnsHeader) {
            const i = columnsHeader.indexOf(column);
            const col = sheet.getColumn(i + 1);
            col.width = column.width;
            col.style = column.style;
        }
        for (const column of range(numColumnsHeader + 1, numColumnsHeader + maxNumPlayers)) {
            const col = sheet.getColumn(column);
            col.width = columnWidth;
            col.style = textStyle;
        }
    };
    setColumns();
    let currentRowNumber = 1;
    row = sheet.getRow(currentRowNumber);
    row.alignment = textAlign;
    row.numFmt = textNumFmt;
    sheet.mergeCells(currentRowNumber, 1, currentRowNumber, 3);
    sheet.getCell(currentRowNumber, 1).value = "Port battle calculator by Felix Victor";
    sheet.mergeCells(currentRowNumber, 4, currentRowNumber, 5);
    sheet.getCell(currentRowNumber, 4).value = {
        text: "Game Labs Forum",
        hyperlink: "https://forum.game-labs.net/topic/23980-yet-another-map-naval-action-map/",
    };
    currentRowNumber += 1;
    row = sheet.getRow(currentRowNumber);
    row.alignment = textAlign;
    row.numFmt = textNumFmt;
    row.fill = fillPattern(colourContrastNearWhite);
    sheet.getCell(currentRowNumber, 1).value = "Port";
    sheet.getCell(currentRowNumber, 2).value = "1. Select port";
    sheet.getCell(currentRowNumber, 2).style.font = fontColourBold(colourHighlight);
    sheet.getCell(currentRowNumber, numColumnsHeader - 1).value = "Max BR";
    sheet.getCell(currentRowNumber, numColumnsHeader).numFmt = numberNumFmt;
    currentRowNumber += 1;
    row = sheet.getRow(currentRowNumber);
    row.alignment = textAlign;
    row.numFmt = textNumFmt;
    row.fill = fillPattern(colourContrastMiddle);
    row.font = fontColourBold(colourContrastNearWhite);
    sheet.getCell(currentRowNumber, 1).value = "Rate";
    sheet.getCell(currentRowNumber, 2).value = "Ship";
    sheet.getCell(currentRowNumber, 3).value = "BR";
    sheet.getCell(currentRowNumber, 4).value = "# Players";
    sheet.getCell(currentRowNumber, 5).value = "BR total";
    sheet.mergeCells(currentRowNumber, numColumnsHeader + 1, currentRowNumber, numColumnsHeader + 2);
    sheet.getCell(currentRowNumber, numColumnsHeader + 1).value = "Player names";
    currentRowNumber += 1;
    row = sheet.getRow(currentRowNumber);
    row.fill = fillPattern(colourContrastMiddle);
    cell = sheet.getCell(currentRowNumber, numColumnsHeader - 1);
    cell.value = formula(`SUM(${getExcelAlpha(numColumnsHeader - 1)}${numRowsHeader + 1}:${getExcelAlpha(numColumnsHeader - 1)}${numRowsTotal})`);
    cell.alignment = numberAlign;
    cell.numFmt = numberNumFmt;
    cell.font = fontColourBold(colourText);
    cell.fill = fillPattern(colourContrastLight);
    cell = sheet.getCell(currentRowNumber, numColumnsHeader);
    cell.value = formula(`SUM(${getExcelAlpha(numColumnsHeader)}${numRowsHeader + 1}:${getExcelAlpha(numColumnsHeader)}${numRowsTotal})`);
    cell.alignment = numberAlign;
    cell.numFmt = numberNumFmt;
    cell.font = fontColourBold(colourText);
    cell.fill = fillPattern(colourContrastLight);
    sheet.mergeCells(currentRowNumber, numColumnsHeader + 1, currentRowNumber, numColumnsTotal);
    cell = sheet.getCell(currentRowNumber, numColumnsHeader + 1);
    cell.value = "2. Enter player names";
    cell.alignment = textAlign;
    cell.numFmt = textNumFmt;
    cell.fill = fillPattern(colourContrastMiddle);
    cell.font = fontColourBold(colourHighlight);
    const fgColourShip = [colourWhite, colourContrastWhite];
    const fgColourPlayer = [colourWhite, colourPrimaryWhite];
    for (const ship of ships) {
        currentRowNumber += 1;
        row = sheet.getRow(currentRowNumber);
        cell = sheet.getCell(currentRowNumber, 1);
        cell.value = ship.class;
        cell.alignment = numberAlign;
        cell.numFmt = numberNumFmt;
        cell.border = border;
        cell.fill = fillPattern(fgColourShip[ship.class % 2]);
        cell = sheet.getCell(currentRowNumber, 2);
        cell.value = ship.name;
        cell.alignment = textAlign;
        cell.numFmt = textNumFmt;
        cell.border = border;
        cell.fill = fillPattern(fgColourShip[ship.class % 2]);
        cell = sheet.getCell(currentRowNumber, 3);
        cell.value = ship.battleRating;
        cell.alignment = numberAlign;
        cell.numFmt = numberNumFmt;
        cell.border = border;
        cell.fill = fillPattern(fgColourShip[ship.class % 2]);
        cell = sheet.getCell(currentRowNumber, numColumnsHeader - 1);
        cell.value = formula(`COUNTA(${getExcelAlpha(numColumnsHeader + 1)}${currentRowNumber}:${getExcelAlpha(numColumnsTotal)}${currentRowNumber})`);
        cell.alignment = numberAlign;
        cell.numFmt = numberNumFmt;
        cell.border = border;
        cell.fill = fillPattern(fgColourShip[ship.class % 2]);
        cell = sheet.getCell(currentRowNumber, numColumnsHeader);
        cell.value = formula(`${getExcelAlpha(numColumnsHeader - 2)}${currentRowNumber}*${getExcelAlpha(numColumnsHeader - 1)}${currentRowNumber}`);
        cell.alignment = numberAlign;
        cell.numFmt = numberNumFmt;
        cell.border = border;
        cell.fill = fillPattern(fgColourShip[ship.class % 2]);
        for (let playerCell = numColumnsHeader + 1; playerCell <= numColumnsTotal; playerCell++) {
            cell = sheet.getCell(currentRowNumber, playerCell);
            cell.alignment = textAlign;
            cell.numFmt = textNumFmt;
            cell.border = border;
            cell.fill = fillPattern(fgColourPlayer[ship.class % 2]);
        }
    }
    sheet.addConditionalFormatting({
        ref: `${getExcelAlpha(numColumnsHeader)}${numRowsHeader}`,
        rules: [
            {
                type: "expression",
                priority: 1,
                formulae: [
                    `AND(NOT(ISBLANK(${getExcelAlpha(numColumnsHeader)}${numRowsHeader - 2})),
                ${getExcelAlpha(numColumnsHeader)}${numRowsHeader} >
                ${getExcelAlpha(numColumnsHeader)}${numRowsHeader - 2})`,
                ],
                style: brTooHigh,
            },
        ],
    });
    for (const port of ports) {
        const i = ports.indexOf(port);
        sheet.getCell(i + 1, numColumnsTotal + 1).value = port.name;
        sheet.getCell(i + 1, numColumnsTotal + 2).value = port.br;
    }
    sheet.getCell("B2").dataValidation = {
        type: "list",
        allowBlank: true,
        prompt: "Select port from dropdown",
        error: "Invalid choice",
        formulae: [`=${getExcelAlpha(numColumnsTotal + 1)}1:${getExcelAlpha(numColumnsTotal + 1)}${ports.length}`],
    };
    sheet.getCell(2, numColumnsHeader).value = formula(`VLOOKUP(B2,${getExcelAlpha(numColumnsTotal + 1)}1:${getExcelAlpha(numColumnsTotal + 2)}${ports.length},2,0)`);
    sheet.getCell(numRowsHeader + 1, numColumnsHeader + 1).value = "Fritz";
    sheet.getCell(numRowsHeader + 1, numColumnsHeader + 2).value = "Franz";
    sheet.getCell(numRowsHeader + 1, numColumnsHeader + 3).value = "Klaus";
    sheet.getCell(numRowsHeader + 2, numColumnsHeader + 1).value = "x";
    sheet.getCell(numRowsHeader + 2, numColumnsHeader + 2).value = "X";
    sheet.getCell(numRowsHeader + 2, numColumnsHeader + 3).value = "x";
}
const createPortBattleSheets = async () => {
    const date = new Date(serverStartDate);
    workbook = new Excel.Workbook();
    workbook.creator = "Felix Victor";
    workbook.lastModifiedBy = "Felix Victor";
    workbook.created = date;
    workbook.modified = date;
    workbook.lastPrinted = date;
    const dwSheet = workbook.addWorksheet("Deep water port", wsOptions);
    const swSheet = workbook.addWorksheet("Shallow water port", wsOptions);
    fillSheet(dwSheet, dwShips, portsDeepWater);
    fillSheet(swSheet, swShips, portsShallowWater);
    await workbook.xlsx.writeFile(commonPaths.filePbSheet);
};
const isGitFileChanged = (fileName) => {
    const gitCommand = "git diff";
    const result = executeCommand(`${gitCommand} ${fileName}`);
    return result.length > 0;
};
const isSourceDataChanged = () => {
    const files = [commonPaths.filePort, commonPaths.fileShip];
    return files.some((file) => isGitFileChanged(file));
};
export const createPortBattleSheet = async () => {
    if (!isSourceDataChanged()) {
        setupData();
        await createPortBattleSheets();
    }
};
//# sourceMappingURL=create-pb-sheets.js.map