/*!
 * This file is part of na-map.
 *
 * @file      Compare ships file - select.
 * @module    game-tools/compare-ships/compare-ships/select-wood
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2022
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
    placeholder: string | null
    virtualScroll: boolean | number
    width: string | false
    //     windowPadding: number | [number, number, number, number]
    //     whiteList: Record<string, string[]>
}

export type SelectValue = string | number | string[] | undefined

export default class Select {
    private _select$ = {} as JQuery<HTMLSelectElement>
    private readonly bsSelectOptions: Partial<BootstrapSelectOptions>
    private readonly id: HtmlString
    private readonly options: HtmlString
    private readonly isMultiple: boolean
    private readonly selectsDiv: Selection<HTMLDivElement, unknown, HTMLElement, unknown> | undefined

    // eslint-disable-next-line max-params
    constructor(
        id: HtmlString,
        selectsDivId: HtmlString | undefined,
        selectOptions: Partial<SelectOptions>,
        options: HtmlString,
        isMultiple = false
    ) {
        this.id = `${id}-select`
        this.selectsDiv = selectsDivId ? d3Select(`#${selectsDivId}`) : undefined
        this.bsSelectOptions = this.getBSSelectOptions(selectOptions)
        this.options = options
        this.isMultiple = isMultiple

        this.init()
    }

    private static getSelectValueAsArray<T>(value: unknown, conversionFunction: (value: unknown) => T): T[] {
        if (Array.isArray(value)) {
            // Multiple selects
            return value.map((element) => conversionFunction(element))
        }

        // Single select
        return value ? [conversionFunction(value)] : []
    }

    public static getSelectValueAsNumberArray(value: SelectValue): number[] {
        return this.getSelectValueAsArray<number>(value, Number)
    }

    public static getSelectValueAsStringArray(value: unknown): string[] {
        return this.getSelectValueAsArray<string>(value, String)
    }

    public static resetElement(element$ = $(".selectpicker") as JQuery<HTMLSelectElement>): void {
        element$.val("default").selectpicker("refresh")
    }

    public static resetAllExcept(selectWhiteList$: JQuery<HTMLSelectElement>[]): void {
        // Set of selects that should not be refreshed
        const selectWhiteList = new Set(selectWhiteList$.map((select) => select[0]))

        $(".selectpicker").each((index, element) => {
            if (!selectWhiteList.has(element as HTMLSelectElement)) {
                Select.resetElement($(element as HTMLSelectElement))
            }
        })
    }

    public get select$(): JQuery<HTMLSelectElement> {
        return this._select$
    }

    private getBSSelectOptions(selectOptions: Partial<SelectOptions>): Partial<BootstrapSelectOptions> {
        const bsSelectOptions: Partial<BootstrapSelectOptions> = selectOptions

        if (selectOptions.liveSearch) {
            bsSelectOptions.liveSearchNormalize = true
            bsSelectOptions.liveSearchPlaceholder = "Search ..."
        }

        return bsSelectOptions
    }

    public getValues(): SelectValue {
        return this._select$.val()
    }

    public setSelectValues(ids: unknown): void {
        const value = Select.getSelectValueAsStringArray(ids)

        if (value.length > 0) {
            this._select$.val(value)
        }

        this.refresh()
    }

    public disable(): void {
        this._select$.prop("disabled", true)
        this.refresh()
    }

    public enable(): void {
        this._select$.removeAttr("disabled")
        this.refresh()
    }

    public render(): void {
        this._select$.selectpicker("render")
    }

    public refresh(): void {
        this._select$.selectpicker("refresh")
    }

    public reset(value: SelectValue = "default"): void {
        this._select$.val(value)
        this.refresh()
    }

    public selectAll(): void {
        this._select$.selectpicker("selectAll")
    }

    public setSelectOptions(options = this.options): void {
        this._select$.empty()
        this._select$.append(options)
    }

    private injectSelects(): void {
        const div = this.selectsDiv!.append("div").attr("class", "mb-1")

        div.append("select").attr("name", this.id).attr("id", this.id).property("multiple", this.isMultiple)
        div.append("label").attr("for", this.id)
    }

    private construct(): void {
        this._select$.selectpicker(this.bsSelectOptions)
    }

    private init(): void {
        if (this.selectsDiv) {
            this.injectSelects()
        }
        this._select$ = $(`#${this.id}`)

        this.construct()
        this.setSelectOptions()
        this.refresh()
    }
}
