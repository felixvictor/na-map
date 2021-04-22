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

import { getIdFromBaseName } from "common/common-browser"
import { Selection } from "d3-selection"
import { HtmlString } from "common/interface"

export default class Select {
    readonly #baseId: HtmlString
    readonly #selectsDiv: Selection<HTMLDivElement, unknown, HTMLElement, unknown>

    constructor(id: HtmlString, selectsDiv: Selection<HTMLDivElement, unknown, HTMLElement, unknown>) {
        this.#baseId = getIdFromBaseName(id)
        this.#selectsDiv = selectsDiv
    }

    get baseId(): HtmlString {
        return this.#baseId
    }

    get selectsDiv(): Selection<HTMLDivElement, unknown, HTMLElement, unknown> {
        return this.#selectsDiv
    }

    static getSelectValueAsNumberArray(value: string | number | string[] | undefined): number[] {
        if (Array.isArray(value)) {
            // Multiple selects
            return value.map((element) => Number(element))
        }

        // Single select
        return value ? [Number(value)] : []
    }

    static getSelectValueAsStringArray(value: number | number[]): string[] {
        if (Array.isArray(value)) {
            // Multiple selects
            return value.map((element) => String(element))
        }

        // Single select
        return value ? [String(value)] : []
    }

    static getValues(select$: JQuery<HTMLSelectElement>): string | number | string[] | undefined {
        return select$.val()
    }

    static setSelectValues(select$: JQuery<HTMLSelectElement>, ids: number | number[]): void {
        const value = Select.getSelectValueAsStringArray(ids)

        if (value.length > 0) {
            select$.val(value)
        }

        Select.refresh(select$)
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
