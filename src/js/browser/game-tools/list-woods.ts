/*!
 * This file is part of na-map.
 *
 * @file      List woods.
 * @module    game-tools/list-woods
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import "bootstrap/js/dist/util"
import "bootstrap/js/dist/modal"

import { select as d3Select, Selection } from "d3-selection"

import { registerEvent } from "../analytics"
import { capitalizeFirstLetter, WoodFamily, woodFamily, woodType, WoodType, WoodTypeList } from "../../common/common"
import { insertBaseModal } from "../../common/common-browser"
import { formatFloatFixed, formatPP } from "../../common/common-format"
import { simpleStringSort } from "../../common/common-node"

import { WoodData, WoodProperty, WoodTrimOrFrame } from "../../common/gen-json"
import { HtmlString } from "../../common/interface"

/**
 *
 */
export default class ListWoods {
    private _modifiers: WoodTypeList<Set<string>> = {} as WoodTypeList<Set<string>>
    private _rows: WoodTypeList<
        Selection<HTMLTableRowElement, WoodTrimOrFrame, HTMLTableSectionElement, unknown>
    > = {} as WoodTypeList<Selection<HTMLTableRowElement, WoodTrimOrFrame, HTMLTableSectionElement, unknown>>

    private _sortAscending: WoodTypeList<boolean> = {} as WoodTypeList<boolean>
    private _sortIndex: WoodTypeList<number> = {} as WoodTypeList<number>
    private _switchesSel!: HTMLInputElement[]
    private _tables: WoodTypeList<Selection<HTMLTableElement, unknown, HTMLElement, unknown>> = {} as WoodTypeList<
        Selection<HTMLTableElement, unknown, HTMLElement, unknown>
    >

    private _woodData: WoodData = {} as WoodData
    private _woodDataDefault: WoodData = {} as WoodData
    private readonly _baseId: HtmlString
    private readonly _baseName: string
    private readonly _buttonId: HtmlString
    private readonly _checkboxId: HtmlString
    private readonly _modalId: HtmlString
    private readonly _modifiersNotUsed = new Set(["Ship material", "Boarding morale"])

    constructor() {
        this._baseName = "List woods"
        this._baseId = "wood-list"
        this._buttonId = `button-${this._baseId}`
        this._checkboxId = `checkbox-${this._baseId}`
        this._modalId = `modal-${this._baseId}`

        this._setupListener()
    }

    _getModifiers(type: WoodType): string[] {
        const modifiers = new Set<string>()

        this._woodDataDefault[type].forEach((wood) => {
            wood.properties
                .filter((property) => !this._modifiersNotUsed.has(property.modifier))
                .forEach((property) => {
                    modifiers.add(property.modifier)
                })
        })
        return [...modifiers].sort(simpleStringSort)
    }

    async _loadData(): Promise<void> {
        this._woodDataDefault = (
            await import(/* webpackChunkName: "data-woods" */ "../../../lib/gen-generic/woods.json")
        ).default as WoodData
    }

    _setupData(): void {
        for (const type of woodType) {
            this._modifiers[type] = new Set(this._getModifiers(type))

            // Add missing properties to each wood
            this._woodDataDefault[type].forEach((wood) => {
                const currentWoodProperties = new Set(wood.properties.map((property) => property.modifier))
                for (const modifier of this._modifiers[type]) {
                    if (!currentWoodProperties.has(modifier)) {
                        wood.properties.push({
                            modifier,
                            amount: 0,
                            isPercentage: false,
                        })
                    }
                }

                wood.properties.sort((a, b) => a.modifier.localeCompare(b.modifier))
            })
        }

        this._woodData = { ...this._woodDataDefault }
    }

    async _loadAndSetupData(): Promise<void> {
        await this._loadData()
        this._setupData()
    }

    _setupListener(): void {
        let firstClick = true

        document.querySelector(`#${this._buttonId}`)?.addEventListener("click", async () => {
            if (firstClick) {
                firstClick = false
                await this._loadAndSetupData()
            }

            registerEvent("Tools", this._baseName)

            this._woodListSelected()
        })
    }

    _sortRows(type: WoodType, index: number, changeOrder = true): void {
        if (changeOrder && this._sortIndex[type] === index) {
            this._sortAscending[type] = !this._sortAscending[type]
        }

        this._sortIndex[type] = index
        const sign = this._sortAscending[type] ? 1 : -1
        this._rows[type].sort((a, b): number => {
            if (index === 0) {
                return a.name.localeCompare(b.name) * sign
            }

            return (a.properties[index - 1].amount - b.properties[index - 1].amount) * sign
        })
    }

    _initTable(type: WoodType): void {
        this._sortAscending[type] = true
        this._tables[type]
            .append("thead")
            .append("tr")
            .selectAll("th")
            .data(["Wood", ...this._modifiers[type]])
            .join("th")
            .datum((d, i) => ({ data: d, index: i }))
            .classed("text-right", (d, i) => i !== 0)
            .attr("role", "columnheader")
            .text((d) => d.data)
            .on("click", (_event, d) => {
                this._sortRows(type, d.index)
            })
        this._tables[type].append("tbody")
    }

    _injectModal(): void {
        insertBaseModal({ id: this._modalId, title: this._baseName, size: "modal-xl" })

        const body = d3Select(`#${this._modalId} .modal-body`)

        const divSwitches = body.append("div").attr("class", "mb-3")
        for (const family of woodFamily) {
            const divSwitch = divSwitches
                .append("div")
                .attr("class", "custom-control custom-switch custom-control-inline")
            divSwitch
                .append("input")
                .attr("id", `${this._checkboxId}-${family}`)
                .attr("name", `${this._checkboxId}`)
                .attr("class", "custom-control-input")
                .attr("type", "checkbox")
                .property("checked", true)
            divSwitch
                .append("label")
                .attr("for", `${this._checkboxId}-${family}`)
                .attr("class", "custom-control-label")
                .text(capitalizeFirstLetter(family))
        }

        this._switchesSel = [...document.querySelectorAll<HTMLInputElement>(`input[name=${this._checkboxId}]`)]
        for (const input of this._switchesSel) {
            input.addEventListener("change", (event: Event) => {
                event.preventDefault()
                this._woodFamilySelected()
            })
        }

        for (const type of woodType) {
            body.append("h5").text(capitalizeFirstLetter(`${type}s`))
            this._tables[type] = body.append("table").attr("class", "table table-sm small na-table")
            this._initTable(type)
            this._updateTable(type)
            this._sortRows(type, 0, false)
        }
    }

    _initModal(): void {
        this._injectModal()
    }

    _getFormattedAmount(property: WoodProperty): HtmlString {
        let formattedAmount
        if (property.modifier === "Repair amount" && property.amount) {
            formattedAmount = formatPP(property.amount, 1)
        } else {
            formattedAmount = property.amount ? formatFloatFixed(property.amount) : ""
        }

        return formattedAmount
    }

    _updateTable(type: WoodType): void {
        // Data join rows
        this._rows[type] = this._tables[type]
            .select<HTMLTableSectionElement>("tbody")
            .selectAll<HTMLTableRowElement, WoodTrimOrFrame>("tr")
            .data(this._woodData[type], (d: WoodTrimOrFrame): number => d.id)
            .join((enter) => enter.append("tr"))

        // Data join cells
        this._rows[type]
            .selectAll<HTMLTableCellElement, string>("td")
            .data((row): string[] => {
                return [
                    row.name,
                    ...row.properties
                        .filter((property) => !this._modifiersNotUsed.has(property.modifier))
                        .map((property) => this._getFormattedAmount(property)),
                ]
            })
            .join((enter) =>
                enter
                    .append("td")
                    .classed("text-right", (d, i) => i !== 0)
                    .html((d) => {
                        return d
                    })
            )
    }

    _woodFamilySelected(): void {
        const activeFamilies = new Set<WoodFamily>()
        for (const input of this._switchesSel) {
            if (input.checked) {
                const family = input.id.replace(`${this._checkboxId}-`, "")!
                activeFamilies.add(family)
            }
        }

        for (const type of woodType) {
            this._woodData[type] = this._woodDataDefault[type].filter((wood) => activeFamilies.has(wood.family))
            this._updateTable(type)
            this._sortRows(type, this._sortIndex[type], false)
        }
    }

    _woodListSelected(): void {
        // If the modal has no content yet, insert it
        if (!document.querySelector(`#${this._modalId}`)) {
            this._initModal()
        }

        // Show modal
        $(`#${this._modalId}`).modal("show")
    }
}
