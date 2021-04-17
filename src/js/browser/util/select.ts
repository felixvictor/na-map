/*!
 * This file is part of na-map.
 *
 * @file      Compare ships file - select.
 * @module    game-tools/compare-ships/compare-ships/select-wood
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import "bootstrap-select"
import { HtmlString } from "common/interface"
import { getIdFromBaseName } from "common/common-browser"

export default class Select {
    readonly #baseId: HtmlString

    constructor(id: HtmlString) {
        this.#baseId = getIdFromBaseName(id)
    }

    get baseId(): HtmlString {
        return this.#baseId
    }

    static getSelectValueAsNumberArray(value: string | number | string[] | undefined): number[] {
        let values: number[]

        if (Array.isArray(value)) {
            // Multiple selects
            values = value.map((element) => Number(element))
        } else {
            // Single select
            values = value ? [Number(value)] : []
        }

        return values
    }

    static getSelectValueAsStringArray(value: number | number[]): string[] {
        let values: string[]

        if (Array.isArray(value)) {
            // Multiple selects
            values = value.map((element) => String(element))
        } else {
            // Single select
            values = value ? [String(value)] : []
        }

        return values
    }

    static setSelect(select$: JQuery<HTMLSelectElement>, ids: number | number[]): void {
        const value = Select.getSelectValueAsStringArray(ids)

        if (value) {
            select$.val(value)
        }

        Select.render(select$)
    }

    static construct(select$: JQuery<HTMLSelectElement>, options: BootstrapSelectOptions): void {
        select$.selectpicker(options)
    }

    static disable(select$: JQuery<HTMLSelectElement>): void {
        select$.prop("disabled", true)
    }

    static enable(select$: JQuery<HTMLSelectElement>): void {
        select$.removeAttr("disabled").selectpicker("refresh")
    }

    static render(select$: JQuery<HTMLSelectElement>): void {
        select$.selectpicker("render")
    }

    static refresh(select$: JQuery<HTMLSelectElement>): void {
        select$.selectpicker("refresh")
    }

    static reset(select$: JQuery<HTMLSelectElement>, value: string | number | string[] = "default"): void {
        select$.val(value).selectpicker("refresh")
    }
}
