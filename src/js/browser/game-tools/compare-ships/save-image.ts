/*!
 * This file is part of na-map.
 *
 * @file      Compare ships - save image.
 * @module    game-tools/compare-ships/compare-ships/save-image
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import html2canvas from "html2canvas"

import dayjs from "dayjs"
import utc from "dayjs/plugin/utc.js"
dayjs.extend(utc)

import { ShipColumnType } from "./index"
import { ShipColumnTypeList, SelectedData } from "compare-ships"
import { select as d3Select } from "d3-selection"
import { showCursorDefault, showCursorWait } from "common/common-browser"
import { HtmlString } from "common/interface"

export default class SaveImage {
    #baseId: HtmlString
    #data: ShipColumnTypeList<SelectedData>
    #modalSel: HTMLDivElement

    constructor(id: HtmlString, data: ShipColumnTypeList<SelectedData>, modalSel: HTMLDivElement) {
        this.#baseId = id
        this.#data = data
        this.#modalSel = modalSel
    }

    static _saveCanvasAsImage(uri: string): void {
        const date = dayjs.utc().format("YYYY-MM-DD HH-mm-ss")
        const fileName = `na-map ship compare ${date}.png`
        const link = document.createElement("a")

        link.href = uri
        link.download = fileName

        // Firefox requires the link to be in the body
        document.body.append(link)

        // simulate click
        link.click()

        // remove the link when done
        link.remove()
    }

    _printSelectedData(clonedDocument: Document, selectedData: SelectedData, columnId: ShipColumnType): void {
        const labels = clonedDocument.querySelectorAll<HTMLElement>(`#${this.#baseId}-${columnId.toLowerCase()} label`)
        const parent = labels[0].parentNode as HTMLElement
        const labelHeight = labels[0].offsetHeight
        for (const label of labels) {
            label.remove()
        }

        const mainDiv = d3Select(parent)
            .insert("div", ":first-child")
            .style("height", `${labelHeight * 5}px`)

        if (selectedData.ship) {
            mainDiv.append("div").style("margin-bottom", "5px").style("line-height", "1.1").text(selectedData.ship)
        }

        if (selectedData.wood[0] !== "") {
            mainDiv
                .append("div")
                .style("font-size", "smaller")
                .style("margin-bottom", "5px")
                .style("line-height", "1.1")
                .text(selectedData.wood.join(" | "))
        }

        for (const [key, value] of selectedData.moduleData) {
            if (value !== "") {
                mainDiv
                    .append("div")
                    .style("font-size", "small")
                    .style("margin-bottom", "5px")
                    .style("line-height", "1.1")
                    .html(`<em>${key}</em>: ${value}`)
            }
        }
    }

    _replaceSelectsWithText(clonedDocument: Document): void {
        for (const [key, value] of Object.entries(this.#data)) {
            this._printSelectedData(clonedDocument, value, key)
        }
    }

    async _save(element: HTMLElement): Promise<void> {
        if (element) {
            const canvas = await html2canvas(element, {
                allowTaint: true,
                foreignObjectRendering: true,
                ignoreElements: (element) =>
                    element.classList.contains("central") ||
                    element.classList.contains("overlay") ||
                    element.classList.contains("navbar"),
                logging: true,
                onclone: (clonedDocument) => {
                    this._replaceSelectsWithText(clonedDocument)
                },
                x: 0,
                y: 0,
            })

            SaveImage._saveCanvasAsImage(canvas.toDataURL())
        }
    }

    async init(): Promise<void> {
        showCursorWait()
        await this._save(this.#modalSel)
        showCursorDefault()
    }
}
