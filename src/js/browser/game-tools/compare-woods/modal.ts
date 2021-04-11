/*!
 * This file is part of na-map.
 *
 * @file      Wood compare modal.
 * @module    map-tools/compare-woods/modal
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { getBaseIdOutput, getBaseIdSelects } from "common/common-browser"
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
        for (const columnId of this.#columnIds) {
            const columnDiv = row
                .append("div")
                .attr("class", `col-md-3 ms-auto pt-2 ${columnId === "base" ? "column-base" : "column-comp"}`)

            columnDiv.append("div").attr("id", `${getBaseIdSelects(super.baseId)}-${columnId}`)
            columnDiv.append("div").attr("id", `${getBaseIdOutput(super.baseId)}-${columnId}`)
        }
    }
}
