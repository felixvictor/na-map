/*!
 * This file is part of na-map.
 *
 * @file      List cannons.
 * @module    game-tools/list-cannons
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { default as BSTab } from "bootstrap/js/dist/tab"

import { registerEvent } from "../../analytics"
import {
    CannonFamily,
    cannonFamilyList,
    CannonType,
    cannonType,
    CannonTypeList,
    capitalizeFirstLetter,
} from "common/common"
import { getIdFromBaseName } from "common/common-browser"
import { formatFloatFixed } from "common/common-format"

import { Selection } from "d3-selection"
import { Cannon, CannonDamage, CannonEntity, CannonGeneric, CannonPenetration } from "common/gen-json"
import { HeaderMap, HtmlResult, HtmlString } from "common/interface"
import Modal from "util/modal"

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
    readonly #baseId: HtmlString
    readonly #baseName = "List cannons"
    readonly #checkboxId: HtmlString
    readonly #groupOrder = ["name", "damage", "penetration", "generic", "family"]
    readonly #header = { group: new Map(), element: new Set() } as HeaderMap
    readonly #menuId: HtmlString
    readonly #rows = {} as CannonTypeList<Selection<HTMLTableRowElement, RowData[], HTMLTableSectionElement, unknown>>
    readonly #switchesSel = {} as CannonTypeList<HTMLInputElement[]>
    readonly #tables = {} as CannonTypeList<Selection<HTMLTableElement, unknown, HTMLElement, unknown>>
    #cannonData = {} as CannonTypeList<RowData[][]>
    #cannonDataDefault = {} as CannonTypeList<FamilyRowData[]>
    #modal: Modal | undefined = undefined
    #sortAscending = {} as CannonTypeList<boolean>
    #sortIndex = {} as CannonTypeList<number>

    constructor() {
        this.#baseId = getIdFromBaseName(this.#baseName)
        this.#menuId = `menu-${this.#baseId}`
        this.#checkboxId = `checkbox-${this.#baseId}`

        this._setupListener()
    }

    async _loadAndSetupData(): Promise<void> {
        const cannonData = (
            await import(/* webpackChunkName: "data-cannons" */ "../../../../../lib/gen-generic/cannons.json")
        ).default as Cannon
        this._setupData(cannonData)
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
            (a, b) => this.#groupOrder.indexOf(a[0]) - this.#groupOrder.indexOf(b[0])
        )
        for (const [groupKey, groupValue] of cannon) {
            if (groupKey === "name") {
                this.#header.group.set("", 1)
                this.#header.element.add("Lb")
            } else if (groupKey !== "family") {
                this.#header.group.set(capitalizeFirstLetter(groupKey), Object.entries(groupValue).length)
                for (const elementKey of Object.keys(groupValue)) {
                    this.#header.element.add(capitalizeFirstLetter(elementKey))
                }
            }
        }

        // Get data, sort by groupOrder
        for (const type of cannonType) {
            this.#cannonDataDefault[type] = cannonData[type].map(
                (cannon: CannonEntity): FamilyRowData => {
                    const elements = [] as RowData[]
                    const cannonSorted = Object.entries(cannon).sort(
                        (a, b) => this.#groupOrder.indexOf(a[0]) - this.#groupOrder.indexOf(b[0])
                    )
                    for (const [groupKey, groupValue] of cannonSorted) {
                        if (groupKey === "name") {
                            elements.push(this._getFormattedName(groupValue as string))
                        } else if (groupKey !== "family") {
                            for (const [, elementValue] of Object.entries(
                                groupValue as CannonDamage | CannonGeneric | CannonPenetration
                            )) {
                                if (elementValue) {
                                    elements.push({
                                        value: elementValue.value,
                                        formattedValue:
                                            elementValue.value === 0
                                                ? ""
                                                : formatFloatFixed(elementValue.value, elementValue?.digits ?? 0),
                                    })
                                }
                            }
                        }
                    }

                    return { family: cannon.family, data: elements }
                }
            )
        }
    }

    async _menuClicked(): Promise<void> {
        registerEvent("Tools", this.#baseName)

        if (this.#modal) {
            this.#modal.show()
        } else {
            await this._loadAndSetupData()
            this.#modal = new Modal(this.#baseName, "xl")
            this._injectTab()
        }
    }

    _setupListener(): void {
        document.querySelector(`#${this.#menuId}`)?.addEventListener("click", () => {
            void this._menuClicked()
        })
    }

    _sortRows(type: CannonType, index: number, changeOrder = true): void {
        if (changeOrder && this.#sortIndex[type] === index) {
            this.#sortAscending[type] = !this.#sortAscending[type]
        }

        this.#sortIndex[type] = index
        const sign = this.#sortAscending[type] ? 1 : -1
        this.#rows[type].sort((a, b): number => {
            if (index === 0) {
                return (a[index].value as string).localeCompare(b[index].value as string) * sign
            }

            return ((a[index].value as number) - (b[index].value as number)) * sign
        })
    }

    _getTabId(): HtmlString {
        return `${this.#baseId}-tab`
    }

    _getTabItemId(type: CannonType): HtmlString {
        return `${this._getTabId()}-${type}-item`
    }

    _getTabContentId(type: CannonType): HtmlString {
        return `${this._getTabId()}-${type}-content`
    }

    _getListId(type: CannonType): HtmlString {
        return `${this._getTabId()}-${type}-list`
    }

    _addNavPills(body: Selection<HTMLDivElement, unknown, HTMLElement, unknown>): void {
        const nav = body.append("ul").attr("id", this._getTabId()).attr("class", "nav nav-tabs").attr("role", "tablist")
        for (const [index, type] of cannonType.entries()) {
            const item = nav.append("li").attr("class", "nav-item").attr("role", "presentation")
            const button = item
                .append("button")
                .attr("class", "nav-link")
                .attr("id", this._getTabItemId(type))
                .attr("data-bs-target", `#${this._getTabContentId(type)}`)
                .attr("data-bs-toggle", "tab")
                .attr("role", "tab")
                .text(capitalizeFirstLetter(type))

            if (index === 0) {
                button.attr("class", "nav-link active").attr("aria-current", "page")
            }
        }
    }

    _injectSwitches(tabContent: Selection<HTMLDivElement, unknown, HTMLElement, unknown>, type: CannonType): void {
        const divSwitches = tabContent.append("div").attr("class", "mb-3")
        for (const family of cannonFamilyList[type]) {
            const divSwitch = divSwitches.append("div").attr("class", "form-check form-check-inline form-switch")
            divSwitch
                .append("input")
                .attr("id", `${this.#checkboxId}-${type}-${family}`)
                .attr("name", `${this.#checkboxId}-${type}`)
                .attr("class", "form-check-input")
                .attr("type", "checkbox")
                .property("checked", true)
            divSwitch
                .append("label")
                .attr("for", `${this.#checkboxId}-${type}-${family}`)
                .attr("class", "form-check-label")
                .text(capitalizeFirstLetter(family))
        }

        this.#switchesSel[type] = [
            ...document.querySelectorAll<HTMLInputElement>(`input[name=${this.#checkboxId}-${type}]`),
        ]
        for (const input of this.#switchesSel[type]) {
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
        this.#sortAscending[type] = true
        this.#tables[type] = tabContent.append("table").attr("class", "table table-sm small table-striped table-hover")
        const head = this.#tables[type].append("thead")
        head.append("tr")
            .attr("class", "thead-group")
            .selectAll("th")
            .data([...this.#header.group])
            .join("th")
            .classed("border-bottom-0", (d, i) => i === 0)
            .classed("text-center", (d, i) => i !== 0)
            .attr("colspan", (d) => `${d[1]}`)
            .attr("scope", "col")
            .text((d) => d[0])
        head.append("tr")
            .selectAll("th")
            .data([...this.#header.element])
            .join("th")
            .datum((d, i) => ({ data: d, index: i }))
            .classed("border-top-0", (d, i) => i === 0)
            .classed("text-end", (d, i) => i !== 0)
            .text((d) => d.data)
            .on("click", (_event, d) => {
                this._sortRows(type, d.index)
            })
        this.#tables[type].append("tbody")
    }

    _insertTabContent(
        tab: Selection<HTMLDivElement, unknown, HTMLElement, unknown>,
        type: CannonType,
        index: number
    ): void {
        this.#sortAscending[type] = true

        const tabContent = tab
            .append("div")
            .attr("class", `tab-pane fade${index === 0 ? " show active" : ""}`)
            .attr("id", this._getTabContentId(type))
            .attr("role", "tabpanel")
            .attr("aria-labelledby", this._getTabItemId(type))
            .append("div")
            .attr("id", this._getListId(type))

        this._injectSwitches(tabContent, type)
        this._injectTableStructure(tabContent, type)
    }

    _injectTab(): void {
        const div = this.#modal!.outputSel
        this._addNavPills(div)

        const tab = div.append("div").attr("class", "tab-content pt-2")
        for (const [index, type] of cannonType.entries()) {
            this.#sortIndex[type] = 0
            this._insertTabContent(tab, type, index)
            this._cannonFamilySelected(type)
        }

        const firstTabEl = document.querySelector(`#${this._getTabId()} li:first-child button`) as HTMLButtonElement
        const bsTab = new BSTab(firstTabEl)
        bsTab.show()
    }

    _updateTable(type: CannonType): void {
        // Data join rows
        this.#rows[type] = this.#tables[type]
            .select<HTMLTableSectionElement>("tbody")
            .selectAll<HTMLTableRowElement, RowData[]>("tr")
            .data(this.#cannonData[type], (d: RowData[]): string => d[0].formattedValue)
            .join((enter) => enter.append("tr"))

        // Data join cells
        this.#rows[type]
            .selectAll<HTMLTableCellElement, string>("td")
            .data((row): RowData[] => row)
            .join((enter) =>
                enter.append("td").html((d) => {
                    return d.formattedValue
                })
            )
    }

    _cannonFamilySelected(type: CannonType): void {
        const activeFamilies = new Set<CannonFamily>()

        for (const input of this.#switchesSel[type]) {
            if (input.checked) {
                const family = input.id.replace(`${this.#checkboxId}-${type}-`, "")
                activeFamilies.add(family)
            }
        }

        this.#cannonData[type] = this.#cannonDataDefault[type]
            .filter((cannon) => activeFamilies.has(cannon.family))
            .map((cannon) => cannon.data)
        this._updateTable(type)
        this._sortRows(type, this.#sortIndex[type], false)
    }
}
