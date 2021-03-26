/*!
 * This file is part of na-map.
 *
 * @file      Select ports select.
 * @module    map/select-ports/select
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { HtmlString } from "common/interface"
import { getBaseId } from "common/common"

export default class SelectPortsSelect {
    baseName: string
    #baseId: HtmlString
    #selectBaseId = "port-select"
    #selectId: HtmlString
    selectSel: HTMLSelectElement

    constructor(title: string) {
        this.baseName = title
        this.#baseId = getBaseId(title)
        this.#selectId = `${this.#selectBaseId}-${this.#baseId}`
        this.selectSel = document.querySelector<HTMLSelectElement>(`#${this.#selectId}`) as HTMLSelectElement
        console.log("SelectPortsSelect", this.#selectId, this.selectSel)
    }

    _resetOtherSelects(): void {
        const selectSelectors = document.querySelectorAll(`select[id^=${this.#selectBaseId}]`)
        console.log("_resetOtherSelects", selectSelectors)
        for (const selectSelector of selectSelectors) {
            console.log(selectSelector, selectSelector.id.endsWith("goods-relations"))
            if (
                !selectSelector.isEqualNode(this.selectSel)
                // && !(selectSelector === this._propClanSelector && this.selectSel === this._propNationSelector)
                // && !(selectSelector === this._propNationSelector && this.selectSel === this._propClanSelector)
            ) {
                console.log("refresh", selectSelector)
                $(selectSelector).val("default").selectpicker("refresh")
            }
        }
    }
}
