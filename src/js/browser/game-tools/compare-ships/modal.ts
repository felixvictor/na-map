/*!
 * This file is part of na-map.
 *
 * @file      Ship compare modal.
 * @module    map-tools/compare-ships/modal
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { Selection } from "d3-selection"

import { HtmlString } from "common/interface"
import { ShipColumnType } from "./index"

import Modal from "util/modal"

export default class CompareShipsModal extends Modal {
    #buttonMakeImage = {} as Selection<HTMLButtonElement, unknown, HTMLElement, unknown>

    readonly #cloneLeftButtonId: HtmlString
    readonly #cloneRightButtonId: HtmlString
    readonly #columnIds: ShipColumnType[]
    readonly #copyButtonId: HtmlString
    readonly #imageButtonId: HtmlString
    readonly #lastColumnId: string

    constructor(title: string, columnIds: ShipColumnType[], lastColumnId: string) {
        super(title, "xl")

        this.#columnIds = columnIds
        this.#lastColumnId = lastColumnId

        this.#copyButtonId = `${super.baseId}-button-copy`
        this.#cloneLeftButtonId = `${super.baseId}-button-clone-left`
        this.#cloneRightButtonId = `${super.baseId}-button-clone-right`
        this.#imageButtonId = `${super.baseId}-button-image`

        this._init()
    }

    get buttonMakeImage(): Selection<HTMLButtonElement, unknown, HTMLElement, unknown> {
        return this.#buttonMakeImage
    }

    get imageButtonId(): HtmlString {
        return this.#imageButtonId
    }

    get copyButtonId(): HtmlString {
        return this.#copyButtonId
    }

    getCloneLeftButtonId(columnId: ShipColumnType): HtmlString {
        return `${this.#cloneLeftButtonId}-${columnId}`
    }

    getCloneRightButtonId(columnId: ShipColumnType): HtmlString {
        return `${this.#cloneRightButtonId}-${columnId}`
    }

    getBaseId(columnId: ShipColumnType): HtmlString {
        return `${super.baseId}-${columnId}`
    }

    getBaseIdSelectsShip(columnId: ShipColumnType): HtmlString {
        return `${this.getBaseIdSelects(columnId)}-ship`
    }

    getBaseIdSelects(columnId: ShipColumnType): HtmlString {
        return `${super.baseIdSelects}-${columnId}`
    }

    getBaseIdOutput(columnId: ShipColumnType): HtmlString {
        return `${super.baseIdOutput}-${columnId}`
    }

    _init(): void {
        this._injectModal()
    }

    _injectModal(): void {
        const body = super.bodySel

        const row = body.append("div").attr("class", "container-fluid").append("div").attr("class", "row")

        for (const columnId of this.#columnIds) {
            const columnDiv = row
                .append("div")
                .attr("id", this.getBaseId(columnId))
                .attr("class", `col-md-4 ms-auto pt-2 ${columnId === "base" ? "column-base" : "column-comp"}`)

            const selectsDiv = columnDiv.append("div").attr("id", this.getBaseIdSelects(columnId))
            const shipSelectDiv = selectsDiv
                .append("div")
                .attr("class", "input-group justify-content-between flex-nowrap mb-1")

            // Add clone icon except for first column
            if (columnId !== this.#columnIds[0]) {
                shipSelectDiv
                    .append("button")
                    .attr("class", "btn btn-default icon-outline-button")
                    .attr("id", this.getCloneLeftButtonId(columnId))
                    .attr("title", "Clone ship to left")
                    .attr("type", "button")
                    .append("i")
                    .attr("class", "icon icon-clone-left")
            }

            shipSelectDiv.append("div").attr("id", this.getBaseIdSelectsShip(columnId))

            // Add clone icon except for last right column
            if (columnId !== this.#lastColumnId) {
                shipSelectDiv
                    .append("button")
                    .attr("class", "btn btn-default icon-outline-button")
                    .attr("id", this.getCloneRightButtonId(columnId))
                    .attr("title", "Clone ship to right")
                    .attr("type", "button")
                    .append("i")
                    .attr("class", "icon icon-clone-right")
            }

            columnDiv
                .append("div")
                .attr("id", this.getBaseIdOutput(columnId))
                .attr("class", `${columnId === "base" ? "ship-base" : "ship-compare"} compress`)
        }

        const footer = super.footer
        footer
            .insert("button", "button")
            .attr("class", "btn btn-outline-secondary icon-outline-button")
            .attr("id", this.#copyButtonId)
            .attr("title", "Copy to clipboard (ctrl-c)")
            .attr("type", "button")
            .append("i")
            .attr("class", "icon icon-copy")
        this.#buttonMakeImage = footer
            .insert("button", "button")
            .attr("class", "btn btn-outline-secondary icon-outline-button")
            .attr("id", this.#imageButtonId)
            .attr("title", "Make image")
            .attr("type", "button")
        this.#buttonMakeImage.append("i").attr("class", "icon icon-image")
    }
}
