/*!
 * This file is part of na-map.
 *
 * @file      List cannons.
 * @module    game-tools/list-cannons
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import "bootstrap/js/dist/util"
import "bootstrap/js/dist/tab"
import "bootstrap/js/dist/modal"

import { select as d3Select, Selection } from "d3-selection"

import { registerEvent } from "../analytics"
import {
    CannonFamily,
    cannonFamilyList,
    CannonType,
    cannonType,
    CannonTypeList,
    capitalizeFirstLetter,
    putImportError,
} from "../../common/common"
import { insertBaseModal } from "../../common/common-browser"
import { formatFloatFixed } from "../../common/common-format"

import { Cannon, CannonEntity, CannonValue } from "../../common/gen-json"
import { HeaderMap, HtmlResult, HtmlString } from "../../common/interface"

interface FamilyRowData {
    family: CannonFamily
    data: RowData[]
}
interface RowData {
    value: number | string
    formattedValue: HtmlString
}

/**
 *
 */
export default class ListCannons {
    private readonly _rows = {} as CannonTypeList<
        Selection<HTMLTableRowElement, RowData[], HTMLTableSectionElement, unknown>
    >

    private _sortAscending = {} as CannonTypeList<boolean>
    private _sortIndex = {} as CannonTypeList<number>
    private readonly _switchesSel = {} as CannonTypeList<HTMLInputElement[]>
    private readonly _tables = {} as CannonTypeList<Selection<HTMLTableElement, unknown, HTMLElement, unknown>>
    private readonly _groupOrder = ["name", "damage", "penetration", "generic", "family"]
    private _cannonData = {} as CannonTypeList<RowData[][]>
    private _cannonDataDefault = {} as CannonTypeList<FamilyRowData[]>
    private readonly _baseName: string
    private readonly _baseId: HtmlString
    private readonly _buttonId: HtmlString
    private readonly _checkboxId: HtmlString
    private readonly _modalId: HtmlString
    private readonly _header: HeaderMap

    constructor() {
        this._baseName = "List cannons"
        this._baseId = "cannon-list"
        this._buttonId = `button-${this._baseId}`
        this._checkboxId = `checkbox-${this._baseId}`
        this._modalId = `modal-${this._baseId}`

        this._header = { group: new Map(), element: new Set() }
        this._setupListener()
    }

    async _loadAndSetupData(): Promise<void> {
        try {
            const cannonData = (await import(/* webpackChunkName: "data-cannons" */ "Lib/gen-generic/cannons.json"))
                .default as Cannon
            this._setupData(cannonData)
        } catch (error: unknown) {
            putImportError(error as string)
        }
    }

    _getFormattedName(name: string): RowData {
        let nameConverted: HtmlResult | string = name
        const nameSplit = name.split(" ")
        const sortPre = `c${nameSplit[0].padStart(3, "0")}`
        const sortPost = nameSplit[1] ? nameSplit[1][1] : "0"

        if (nameSplit.length > 1) {
            nameConverted = `${nameSplit[0]} <em>${nameSplit[1]}</em>`
        }

        return { value: `${sortPre}${sortPost}`, formattedValue: nameConverted }
    }

    _setupData(cannonData: Cannon): void {
        // Get group and element header from first long cannon, sort by groupOrder
        const cannon = Object.entries(cannonData.long[0]).sort(
            (a, b) => this._groupOrder.indexOf(a[0]) - this._groupOrder.indexOf(b[0])
        )
        for (const [groupKey, groupValue] of cannon) {
            if (groupKey === "name") {
                this._header.group.set("", 1)
                this._header.element.add("Lb")
            } else if (groupKey !== "family") {
                this._header.group.set(capitalizeFirstLetter(groupKey), Object.entries(groupValue).length)
                for (const elementKey of Object.keys(groupValue)) {
                    this._header.element.add(capitalizeFirstLetter(elementKey))
                }
            }
        }

        // Get data, sort by groupOrder
        for (const type of cannonType) {
            this._cannonDataDefault[type] = cannonData[type].map(
                (cannon: CannonEntity): FamilyRowData => {
                    const elements = [] as RowData[]
                    const cannonSorted = Object.entries(cannon).sort(
                        (a, b) => this._groupOrder.indexOf(a[0]) - this._groupOrder.indexOf(b[0])
                    )
                    for (const [groupKey, groupValue] of cannonSorted) {
                        if (groupKey === "name") {
                            elements.push(this._getFormattedName(groupValue))
                        } else if (groupKey !== "family") {
                            for (const [, elementValue] of Object.entries<CannonValue>(groupValue)) {
                                elements.push({
                                    value: elementValue.value,
                                    formattedValue:
                                        elementValue.value === 0
                                            ? ""
                                            : formatFloatFixed(elementValue.value, elementValue.digits ?? 0),
                                })
                            }
                        }
                    }

                    return { family: cannon.family, data: elements }
                }
            )
        }
    }

    _setupListener(): void {
        let firstClick = true
        ;(document.querySelector(`#${this._buttonId}`) as HTMLElement)?.addEventListener("click", async () => {
            if (firstClick) {
                firstClick = false
                await this._loadAndSetupData()
            }

            registerEvent("Tools", this._baseName)

            this._cannonListSelected()
        })
    }

    _sortRows(type: CannonType, index: number, changeOrder = true): void {
        if (changeOrder && this._sortIndex[type] === index) {
            this._sortAscending[type] = !this._sortAscending[type]
        }

        this._sortIndex[type] = index
        const sign = this._sortAscending[type] ? 1 : -1
        this._rows[type].sort((a, b): number => {
            if (index === 0) {
                return (a[index].value as string).localeCompare(b[index].value as string) * sign
            }

            return ((a[index].value as number) - (b[index].value as number)) * sign
        })
    }

    _addNavPills(body: Selection<HTMLDivElement, unknown, HTMLElement, unknown>): void {
        const nav = body.append("ul").attr("class", "nav nav-pills").attr("role", "tablist")
        for (const [index, type] of cannonType.entries()) {
            nav.append("li")
                .attr("class", "nav-item")
                .attr("role", "presentation")
                .append("a")
                .attr("class", `nav-link${index === 0 ? " active" : ""}`)
                .attr("id", `tab-${this._baseId}-${type}`)
                .attr("href", `#tab-content-${this._baseId}-${type}`)
                .attr("data-toggle", "tab")
                .attr("role", "tab")
                .attr("aria-controls", `${this._baseId}-${type}`)
                .attr("aria-selected", `${index === 0 ? "true" : "false"}`)
                .text(capitalizeFirstLetter(type))
        }
    }

    _injectSwitches(tabContent: Selection<HTMLDivElement, unknown, HTMLElement, unknown>, type: CannonType): void {
        const divSwitches = tabContent.append("div").attr("class", "mb-3")
        for (const family of cannonFamilyList[type]) {
            const divSwitch = divSwitches
                .append("div")
                .attr("class", "custom-control custom-switch custom-control-inline")
            divSwitch
                .append("input")
                .attr("id", `${this._checkboxId}-${type}-${family}`)
                .attr("name", `${this._checkboxId}-${type}`)
                .attr("class", "custom-control-input")
                .attr("type", "checkbox")
                .property("checked", true)
            divSwitch
                .append("label")
                .attr("for", `${this._checkboxId}-${type}-${family}`)
                .attr("class", "custom-control-label")
                .text(capitalizeFirstLetter(family))
        }

        this._switchesSel[type] = [
            ...document.querySelectorAll<HTMLInputElement>(`input[name=${this._checkboxId}-${type}]`),
        ]
        for (const input of this._switchesSel[type]) {
            input.addEventListener("change", (event: Event) => {
                event.preventDefault()
                this._cannonFamilySelected(type)
            })
        }
    }

    _injectTableStructure(
        tabContent: Selection<HTMLDivElement, unknown, HTMLElement, unknown>,
        type: CannonType
    ): void {
        this._sortAscending[type] = true
        this._tables[type] = tabContent.append("table").attr("class", "table table-sm small na-table")
        const head = this._tables[type]
        head.append("thead")
            .append("tr")
            .attr("class", "thead-group")
            .selectAll("th")
            .data([...this._header.group])
            .join("th")
            .classed("border-bottom-0", (d, i) => i === 0)
            .classed("text-center", (d, i) => i !== 0)
            .attr("colspan", (d) => `${d[1]}`)
            .attr("scope", "col")
            .text((d) => d[0])
        head.append("tr")
            .selectAll("th")
            .data([...this._header.element])
            .join("th")
            .datum((d, i) => ({ data: d, index: i }))
            .classed("border-top-0", (d, i) => i === 0)
            .classed("text-right", (d, i) => i !== 0)
            .text((d) => d.data)
            .on("click", (_event, d) => {
                this._sortRows(type, d.index)
            })
        this._tables[type].append("tbody")
    }

    _insertTabContent(
        tab: Selection<HTMLDivElement, unknown, HTMLElement, unknown>,
        type: CannonType,
        index: number
    ): void {
        this._sortAscending[type] = true

        const tabContent = tab
            .append("div")
            .attr("class", `tab-pane fade${index === 0 ? " show active" : ""}`)
            .attr("id", `tab-content-${this._baseId}-${type}`)
            .attr("href", `#tab-content-${this._baseId}-${type}`)
            .attr("role", "tabpanel")
            .attr("aria-labelledby", `${this._baseId}-${type}-tab`)
            .append("div")
            .attr("id", `${type}-list`)

        this._injectSwitches(tabContent, type)
        this._injectTableStructure(tabContent, type)
    }

    _injectModal(): void {
        insertBaseModal({ id: this._modalId, title: this._baseName, size: "modal-xl" })

        const body = d3Select<HTMLDivElement, unknown>(`#${this._modalId} .modal-body`)
        this._addNavPills(body)

        const tab = body.append("div").attr("class", "tab-content pt-2")
        for (const [index, type] of cannonType.entries()) {
            this._sortIndex[type] = 0
            this._insertTabContent(tab, type, index)
            this._cannonFamilySelected(type)
        }
    }

    _initModal(): void {
        this._injectModal()
    }

    _updateTable(type: CannonType): void {
        // Data join rows
        this._rows[type] = this._tables[type]
            .select<HTMLTableSectionElement>("tbody")
            .selectAll<HTMLTableRowElement, RowData[]>("tr")
            .data(this._cannonData[type], (d: RowData[]): string => d[0].formattedValue)
            .join((enter) => enter.append("tr"))

        // Data join cells
        this._rows[type]
            .selectAll<HTMLTableCellElement, string>("td")
            .data((row): RowData[] => row)
            .join((enter) =>
                enter
                    .append("td")
                    .classed("text-right", (d, i) => i !== 0)
                    .html((d) => {
                        return d.formattedValue
                    })
            )
    }

    _cannonFamilySelected(type: CannonType): void {
        const activeFamilies = new Set<CannonFamily>()

        for (const input of this._switchesSel[type]) {
            if (input.checked) {
                const family = input.id.replace(`${this._checkboxId}-${type}-`, "")
                activeFamilies.add(family)
            }
        }

        this._cannonData[type] = this._cannonDataDefault[type]
            .filter((cannon) => activeFamilies.has(cannon.family))
            .map((cannon) => cannon.data)
        this._updateTable(type)
        this._sortRows(type, this._sortIndex[type], false)
    }

    _cannonListSelected(): void {
        // If the modal has no content yet, insert it
        if (!document.querySelector(`#${this._modalId}`)) {
            this._initModal()
        }

        // Show modal
        $(`#${this._modalId}`).modal("show")
    }
}
