/*!
 * This file is part of na-map.
 *
 * @file      Wood compare modal.
 * @module    map-tools/compare-woods/modal
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { WoodColumnType } from "../compare-woods"

import Modal from "util/modal"

export default class CompareWoodsModal extends Modal {
    readonly #columnIds: WoodColumnType[]

    constructor(title: string, columnIds: WoodColumnType[]) {
        super(title, "xl")

        this.#columnIds = columnIds

        this._init()
    }

    _init(): void {
        this._injectModal()
    }

    _injectModal(): void {
        const body = super.getBodySel()

        const row = body.append("div").attr("class", "container-fluid").append("div").attr("class", "row wood")
        for (const column of this.#columnIds) {
            const div = row
                .append("div")
                .attr("class", `col-md-3 ms-auto pt-2 ${column === "base" ? "column-base" : "column-comp"}`)

            div.append("div").attr("id", `${super.baseId}-${column}`)
        }
    }
}
