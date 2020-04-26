/*!
 * This file is part of na-map.
 *
 * @file      Create pb sheets.
 * @module    src/js/node/create-pb-sheets
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import path from "path"

import Excel4Node, { Style, Worksheet } from "excel4node"
import sass from "node-sass"

import css, { Declaration, Rule } from "css"
import { range } from "../common/common"
import { commonPaths } from "../common/common-dir"
import { sortBy } from "../common/common-node"

import { readJson } from "../common/common-file"
import { PortBasic, ShipData } from "../common/gen-json"

type ColourMap = Map<string, string>
interface PortBR {
    name: string
    br: number
}

const shallowWaterFrigates = new Set(["Cerberus", "Hercules", "L’Hermione", "La Renommée", "Surprise"])
const minDeepWaterBR = 80
const maxNumPlayers = 25

const columnWidth = 20
const rowHeight = 24

let portsOrig: PortBasic[]
let shipsOrig: ShipData[]

const fileScssPreCompile = path.resolve("src", "scss", "pre-compile.scss")
/**
 * Set colours
 * @returns Colours
 */
const setColours = (): ColourMap => {
    const compiledCss = sass
        .renderSync({
            file: fileScssPreCompile,
        })
        .css.toString()
    const parsedCss = css.parse(compiledCss)
    return new Map(
        (parsedCss.stylesheet?.rules.filter((rule: Rule) =>
            rule.selectors?.[0].startsWith(".colour-palette ")
        ) as Rule[])
            .filter((rule: Rule) =>
                rule?.declarations?.find((declaration: Declaration) => declaration.property === "background-color")
            )
            .map((rule) => {
                const d = rule?.declarations?.find(
                    (declaration: Declaration) => declaration.property === "background-color"
                ) as Declaration
                return [rule.selectors?.[0].replace(".colour-palette .", "") ?? "", d.value ?? ""]
            })
    )
}

// noinspection FunctionTooLongJS
/**
 * Create excel spreadsheet
 */
const createPortBattleSheets = (): void => {
    const portsDeepWater: PortBR[] = portsOrig
        .filter((port) => !port.shallow)
        .map((port) => ({
            name: port.name,
            br: port.brLimit,
        }))
        .sort((a, b) => a.name.localeCompare(b.name))

    const portsShallowWater: PortBR[] = portsOrig
        .filter((port) => port.shallow)
        .map((port) => ({
            name: port.name,
            br: port.brLimit,
        }))
        .sort((a, b) => a.name.localeCompare(b.name))

    const colours = setColours()
    // const colourWhite = colours.get("white")
    const colourPrimaryWhite = colours.get("primary-050") ?? ""
    // const colourPrimaryNearWhite = colours.get("primary-100")
    // const colourPrimaryLight = colours.get("primary-200")
    // const colourPrimaryDark = colours.get("primary-600")
    const colourContrastWhite = colours.get("secondary-050") ?? ""
    const colourContrastNearWhite = colours.get("secondary-100") ?? ""
    const colourContrastLight = colours.get("secondary-200") ?? ""
    const colourContrastMiddle = colours.get("secondary-400") ?? ""
    // const colourContrastDark = colours.get("secondary-600")
    const colourText = colours.get("secondary-800") ?? ""
    // const colourBackground = colours.get("background-600")
    const colourHighlight = colours.get("info") ?? ""
    const colourRed = colours.get("pink") ?? ""

    const wsOptions = {
        sheetView: {
            showGridLines: false, // Flag indicating whether the sheet should have gridlines enabled or disabled during view
        },
        sheetFormat: {
            baseColWidth: columnWidth, // Defaults to 10. Specifies the number of characters of the maximum digit width of the normal style's font. This value does not include margin padding or extra padding for gridlines. It is only the number of characters.,
            defaultColWidth: columnWidth,
            defaultRowHeight: rowHeight,
        },
    }

    const workbook = new Excel4Node.Workbook()

    /**
     * Returns fill pattern object
     * @param colour - Pattern colour
     * @returns Fill pattern
     */
    const fillPattern = (colour: string): Style =>
        workbook.createStyle({ fill: { type: "pattern", patternType: "solid", fgColor: colour } }) // §18.8.20 fill (Fill)

    /**
     * Returns font object with color colour
     * @param colour - Font colour
     * @returns Font object
     */
    // const fontColour = (colour: string) => workbook.createStyle({ font: { color: colour } }) // §18.8.22

    /**
     * Returns font object with bold font
     * @param colour - Font colour
     * @returns Font object
     */
    const fontColourBold = (colour: string): Style => workbook.createStyle({ font: { bold: true, color: colour } }) // §18.8.22

    const border = workbook.createStyle({
        // §18.8.4 border (Border)
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
    })

    const brTooHigh = workbook.createStyle({ font: { bold: true, color: colourRed } }) // §18.8.22

    // noinspection FunctionTooLongJS
    /**
     * Fill worksheet
     * @param sheet - Worksheet
     * @param ships - Ship data
     * @param ports - port data
     */
    function fillSheet(sheet: Worksheet, ships: ShipData[], ports: PortBR[]): void {
        const numberStyle = {
            alignment: {
                // §18.8.1
                horizontal: "right",
                indent: 1, // Number of spaces to indent = indent value * 3
                //                relativeIndent: integer, // number of additional spaces to indent
                vertical: "center",
            },
            numberFormat: "#", // §18.8.30 numFmt (Number Format)
        } as Style
        const textStyle = {
            alignment: {
                // §18.8.1
                horizontal: "left",
                indent: 1, // Number of spaces to indent = indent value * 3
                //                relativeIndent: integer, // number of additional spaces to indent
                vertical: "center",
            },
            numberFormat: "@", // §18.8.30 numFmt (Number Format)
        } as Style

        const columnsHeader = [
            { name: "Ship rate", width: 8, style: numberStyle },
            { name: "Ship name", width: 22, style: textStyle },
            { name: "Ship battle rating", width: 8, style: numberStyle },
            { name: "Number of players", width: 12, style: numberStyle },
            { name: "Total battle rating", width: 12, style: numberStyle },
        ]
        const numRowsHeader = 4
        const numRowsTotal = numRowsHeader + ships.length
        const numColumnsHeader = columnsHeader.length
        const numColumnsTotal = numColumnsHeader + maxNumPlayers

        sheet.column(numColumnsHeader).freeze() // Freezes the first two columns and scrolls the right view to column D
        sheet.row(numRowsHeader).freeze()

        // ***** Columns *****
        const setColumns = (): void => {
            // Format first columns

            for (const column of columnsHeader) {
                const i = columnsHeader.indexOf(column)
                sheet.column(i + 1).setWidth(column.width)
                sheet.cell(1, i + 1, numRowsTotal, i + 1).style(column.style)
            }

            // Player names
            for (const column of range(numColumnsHeader + 1, numColumnsHeader + maxNumPlayers)) {
                sheet.column(column).setWidth(columnWidth)
                sheet.cell(1, column, numRowsTotal, column).style(textStyle)
            }
        }

        setColumns()

        // ***** Rows *****
        // General description row
        let currentRow = 1
        sheet.cell(currentRow, 1, currentRow, numColumnsTotal).style(textStyle).style(fillPattern("white"))
        sheet.cell(currentRow, 1, currentRow, 3, true).string("Port battle calculator by Felix Victor")
        sheet
            .cell(currentRow, 4, currentRow, 5, true)
            .link("https://forum.game-labs.net/topic/23980-yet-another-map-naval-action-map/", "Game Labs Forum")

        // Port description row
        currentRow += 1
        sheet
            .cell(currentRow, 1, currentRow, numColumnsTotal)
            .style(textStyle)
            .style(fillPattern(colourContrastNearWhite))
        sheet.cell(currentRow, 1).string("Port")
        sheet.cell(currentRow, 2).string("1. Select port").style(fontColourBold(colourHighlight))
        sheet.cell(currentRow, numColumnsHeader - 1).string("Max BR")
        sheet.cell(currentRow, numColumnsHeader).style(numberStyle)

        // Column description row
        currentRow += 1
        sheet
            .cell(currentRow, 1, currentRow, numColumnsTotal)
            .style(textStyle)
            .style(fontColourBold(colourContrastNearWhite))
            .style(fillPattern(colourContrastMiddle))
        sheet.cell(currentRow, 1).string("Rate")
        sheet.cell(currentRow, 2).string("Ship")
        sheet.cell(currentRow, 3).string("BR")
        sheet.cell(currentRow, 4).string("# Players")
        sheet.cell(currentRow, 5).string("BR total")

        sheet.cell(currentRow, numColumnsHeader + 1, currentRow, numColumnsHeader + 2, true).string("Player names")

        // Total row
        currentRow += 1
        sheet
            .cell(currentRow, 1, currentRow, numColumnsTotal)
            .style(textStyle)
            .style(fontColourBold(colourContrastNearWhite))
            .style(fillPattern(colourContrastMiddle))

        sheet
            .cell(currentRow, numColumnsHeader - 1, currentRow, numColumnsHeader)
            .style(numberStyle)
            .style(fontColourBold(colourText))
            .style(fillPattern(colourContrastLight))
        sheet
            .cell(currentRow, numColumnsHeader - 1)
            .formula(
                `SUM(${Excel4Node.getExcelAlpha(numColumnsHeader - 1)}${numRowsHeader + 1}:${Excel4Node.getExcelAlpha(
                    numColumnsHeader - 1
                )}${numRowsTotal})`
            )
        sheet
            .cell(currentRow, numColumnsHeader)
            .formula(
                `SUM(${Excel4Node.getExcelAlpha(numColumnsHeader)}${numRowsHeader + 1}:${Excel4Node.getExcelAlpha(
                    numColumnsHeader
                )}${numRowsTotal})`
            )

        sheet
            .cell(currentRow, numColumnsHeader + 1, currentRow, numColumnsTotal, true)
            .string("2. Enter player names")
            .style(fontColourBold(colourHighlight))

        // Ship rows
        const fgColourShip = ["white", colourContrastWhite]
        const fgColourPlayer = ["white", colourPrimaryWhite]
        for (const ship of ships) {
            currentRow += 1

            sheet
                .cell(currentRow, 1, currentRow, numColumnsHeader)
                .style(textStyle)
                .style(border)
                .style(fillPattern(fgColourShip[ship.class % 2]))

            sheet.cell(currentRow, 1).number(ship.class).style(numberStyle)
            sheet.cell(currentRow, 2).string(ship.name)
            sheet.cell(currentRow, 3).number(ship.battleRating).style(numberStyle)
            sheet
                .cell(currentRow, numColumnsHeader - 1)
                .formula(
                    `COUNTA(${Excel4Node.getExcelAlpha(numColumnsHeader + 1)}${currentRow}:${Excel4Node.getExcelAlpha(
                        numColumnsTotal
                    )}${currentRow})`
                )
                .style(numberStyle)
            sheet
                .cell(currentRow, numColumnsHeader)
                .formula(
                    `${Excel4Node.getExcelAlpha(numColumnsHeader - 2)}${currentRow}*${Excel4Node.getExcelAlpha(
                        numColumnsHeader - 1
                    )}${currentRow}`
                )
                .style(numberStyle)

            sheet
                .cell(currentRow, numColumnsHeader + 1, currentRow, numColumnsTotal)
                .style(textStyle)
                .style(border)
                .style(fillPattern(fgColourPlayer[ship.class % 2]))
        }

        // BR too high colour
        sheet.addConditionalFormattingRule(`${Excel4Node.getExcelAlpha(numColumnsHeader)}${numRowsHeader}`, {
            type: "expression",
            priority: 1,
            formula: `AND(NOT(ISBLANK(${Excel4Node.getExcelAlpha(numColumnsHeader)}${numRowsHeader - 2})),
                ${Excel4Node.getExcelAlpha(numColumnsHeader)}${numRowsHeader} >
                ${Excel4Node.getExcelAlpha(numColumnsHeader)}${numRowsHeader - 2})`, // formula that returns nonzero or 0
            style: brTooHigh,
        })

        // Port select dropdown
        for (const port of ports) {
            const i = ports.indexOf(port)
            sheet.cell(i + 1, numColumnsTotal + 1).string(port.name)
            sheet.cell(i + 1, numColumnsTotal + 2).number(port.br)
        }

        // noinspection SqlNoDataSourceInspection
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
                }`,
            ],
        })

        sheet
            .cell(2, numColumnsHeader)
            .formula(
                `VLOOKUP(B2,${Excel4Node.getExcelAlpha(numColumnsTotal + 1)}1:${Excel4Node.getExcelAlpha(
                    numColumnsTotal + 2
                )}${ports.length},2,0)`
            )

        // Sample values
        sheet.cell(numRowsHeader + 1, numColumnsHeader + 1).string("Fritz")
        sheet.cell(numRowsHeader + 1, numColumnsHeader + 2).string("Franz")
        sheet.cell(numRowsHeader + 1, numColumnsHeader + 3).string("Klaus")
        sheet.cell(numRowsHeader + 2, numColumnsHeader + 1).string("x")
        sheet.cell(numRowsHeader + 2, numColumnsHeader + 2).string("X")
        sheet.cell(numRowsHeader + 2, numColumnsHeader + 3).string("x")
    }

    // noinspection OverlyComplexBooleanExpressionJS
    const dwShips = shipsOrig
        .filter(
            (ship) =>
                !["Basic", "Hulk ", "Rooki", "Trade", "Tutor"].includes(ship.name.slice(0, 5)) &&
                (ship.battleRating >= minDeepWaterBR || ship.name === "Mortar Brig")
        )
        .sort(sortBy(["class", "-battleRating", "name"]))
    const swShips = shipsOrig
        .filter(
            (ship) =>
                shallowWaterFrigates.has(ship.name) ||
                (ship.class >= 6 && !["Basic", "Rooki", "Trade", "Tutor"].includes(ship.name.slice(0, 5)))
        )
        .sort(sortBy(["class", "-battleRating", "name"]))

    /*
    const dwSheet = workbook.addWorksheet("Deep water port", {
            properties: { tabColor: { argb: primary500 } }
        }),
        swSheet = workbook.addWorksheet("Shallow water port", {
            properties: { tabColor: { argb: secondary500 } }
        });
        */
    const dwSheet = workbook.addWorksheet("Deep water port", wsOptions)
    const swSheet = workbook.addWorksheet("Shallow water port", wsOptions)

    fillSheet(dwSheet, dwShips, portsDeepWater)
    fillSheet(swSheet, swShips, portsShallowWater)

    workbook.write(commonPaths.filePbSheet, (err) => {
        if (err) {
            console.error(err)
        }
    })
}

export const createPortBattleSheet = (): void => {
    portsOrig = readJson(commonPaths.filePort)
    shipsOrig = readJson(commonPaths.fileShip)

    createPortBattleSheets()
}
