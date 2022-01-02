/*!
 * This file is part of na-map.
 *
 * @file      Compare ships file - select.
 * @module    game-tools/compare-ships/compare-ships/select-wood
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import "bootstrap-select/js/bootstrap-select"

import { select as d3Select, Selection } from "d3-selection"
import { HtmlString } from "common/interface"

export interface SelectOptions {
    actionsBox: boolean
    //     container: string | false
    countSelectedText: string | ((numSelected: number, numTotal: number) => string)
    deselectAllText: string
    //     dropdownAlignRight: "auto" | boolean
    dropupAuto: boolean
    //     header: string
    //     hideDisabled: boolean
    //     iconBase: string
    liveSearch: boolean
    // liveSearchNormalize: boolean
    // liveSearchPlaceholder: string | null
    // liveSearchStyle: string
    maxOptions: number | false
    //     maxOptionsText: string | any[] | ((numAll: number, numGroup: number) => [string, string])
    //     mobile: boolean
    //     multipleSeparator: string
    //     noneResultsText: string
    noneSelectedText: string
    //     sanitize: boolean
    //     sanitizeFn: null | ((unsafeElements: Array<HTMLElement | ChildNode | Node>) => void)
    //     selectAllText: string
    selectedTextFormat: string
    //     selectOnTab: boolean
    //     showContent: boolean
    //     showIcon: boolean
    //     showSubtext: boolean
    //     showTick: boolean
    //     size: "auto" | number | false
    //     style: string | null
    //     styleBase: string | null
    //     tickIcon: string
    title: string | null
    virtualScroll: boolean | number
    width: string | false
    //     windowPadding: number | [number, number, number, number]
    //     whiteList: Record<string, string[]>
}

export default class Select {
    #select$ = {} as JQuery<HTMLSelectElement>
    readonly #bsSelectOptions: Partial<BootstrapSelectOptions>
    readonly #id: HtmlString
    readonly #isMultiple: boolean
    readonly #selectsDiv: Selection<HTMLDivElement, unknown, HTMLElement, unknown> | undefined

    // eslint-disable-next-line max-params
    constructor(
        id: HtmlString,
        selectsDivId: HtmlString | undefined,
        selectOptions: Partial<SelectOptions>,
        options: HtmlString,
        isMultiple = false
    ) {
        this.#id = `${id}-select`
        this.#selectsDiv = selectsDivId ? d3Select(`#${selectsDivId}`) : undefined
        this.#bsSelectOptions = this.getOptions(selectOptions)
        this.#isMultiple = isMultiple

        this._init(options)
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

    get select$(): JQuery<HTMLSelectElement> {
        return this.#select$
    }

    getOptions(selectOptions: Partial<SelectOptions>): Partial<BootstrapSelectOptions> {
        const bsSelectOptions: Partial<BootstrapSelectOptions> = selectOptions

        if (selectOptions.liveSearch) {
            bsSelectOptions.liveSearchNormalize = true
            bsSelectOptions.liveSearchPlaceholder = "Search ..."
        }

        return bsSelectOptions
    }

    getValues(): string | number | string[] | undefined {
        return this.#select$.val()
    }

    setSelectValues(ids: number | number[]): void {
        const value = Select.getSelectValueAsStringArray(ids)

        if (value.length > 0) {
            this.#select$.val(value)
        }

        this.refresh()
    }

    disable(): void {
        this.#select$.prop("disabled", true)
        this.refresh()
    }

    enable(): void {
        this.#select$.removeAttr("disabled").selectpicker("refresh")
        this.refresh()
    }

    render(): void {
        this.#select$.selectpicker("render")
    }

    refresh(): void {
        this.#select$.selectpicker("refresh")
    }

    reset(value: string | number | string[] = "default"): void {
        this.#select$.val(value).selectpicker("refresh")
    }

    setOptions(options: HtmlString): void {
        this.select$.empty()
        this.select$.append(options)
    }

    _injectSelects(): void {
        const div = this.#selectsDiv!.append("div").attr("class", "mb-1")

        div.append("select")
            .attr("name", this.#id)
            .attr("id", this.#id)
            .property("multiple", this.#isMultiple)
            .attr("class", "selectpicker")
        div.append("label").attr("for", this.#id)
    }

    _construct(): void {
        this.#select$.selectpicker(this.#bsSelectOptions)
    }

    _init(options: HtmlString): void {
        if (this.#selectsDiv) {
            this._injectSelects()
        }

        this.#select$ = $(`#${this.#id}`)
        this.setOptions(options)
        this._construct()
        this.reset()
    }
}
