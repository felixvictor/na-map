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
    #selectSel: HTMLSelectElement
    #select$: JQuery<HTMLSelectElement>

    #clanSelectId: string
    #nationSelectId: string

    constructor(title: string) {
        this.baseName = title
        this.#baseId = getBaseId(title)
        this.#selectId = `${this.#selectBaseId}-${this.#baseId}`
        this.#selectSel = document.querySelector<HTMLSelectElement>(`#${this.#selectId}`) as HTMLSelectElement
        this.#select$ = $(this.#selectSel)

        this.#clanSelectId = `${this.#selectBaseId}-select-clan`
        this.#nationSelectId = `${this.#selectBaseId}-select-nation`
    }

    _resetOtherSelects(): void {
        const otherSelectSels = document.querySelectorAll(`select[id^=${this.#selectBaseId}]`)
        for (const otherSelectSel of otherSelectSels) {
            if (
                !otherSelectSel.isEqualNode(this.selectSel) &&
                !(this.selectSel.id === this.#nationSelectId && otherSelectSel.id === this.#clanSelectId) &&
                !(this.selectSel.id === this.#clanSelectId && otherSelectSel.id === this.#nationSelectId)
            ) {
                $(otherSelectSel).val("default").selectpicker("refresh")
            }
        }
    }

    get selectSel(): HTMLSelectElement {
        return this.#selectSel
    }

    get select$(): JQuery<HTMLSelectElement> {
        return this.#select$
    }
}
