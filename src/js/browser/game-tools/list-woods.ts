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

import { select as d3Select } from "d3-selection"
import Tablesort from "tablesort"
import { h, render } from "preact"
import htm from "htm"

import { registerEvent } from "../analytics"
import {
    capitalizeFirstLetter,
    putImportError,
    WoodFamily,
    woodFamily,
    woodType,
    WoodType,
    WoodTypeList,
} from "../../common/common"
import { insertBaseModal } from "../../common/common-browser"
import { formatPP } from "../../common/common-format"
import { formatFloatFixedHTML, initTablesort } from "../../common/common-game-tools"
import { simpleStringSort } from "../../common/common-node"

import { WoodData, WoodTrimOrFrame } from "../../common/gen-json"
import { HtmlResult, HtmlString } from "../../common/interface"
import * as d3Selection from "d3-selection"

const html = htm.bind(h)

/**
 *
 */
export default class ListWoods {
    private readonly _baseName: string
    private readonly _baseId: HtmlString
    private readonly _buttonId: HtmlString
    private readonly _checkboxId: HtmlString
    private readonly _modalId: HtmlString
    private _woodData: WoodData = {} as WoodData
    private _woodDataDefault: WoodData = {} as WoodData
    private _div: WoodTypeList<
        d3Selection.Selection<HTMLDivElement, unknown, HTMLElement, unknown>
    > = {} as WoodTypeList<d3Selection.Selection<HTMLDivElement, unknown, HTMLElement, unknown>>

    private _switchesSel!: HTMLInputElement[]
    private _modifiers: WoodTypeList<string[]> = {} as WoodTypeList<string[]>
    // @ts-expect-error
    private _tablesort!: Tablesort

    constructor() {
        this._baseName = "List woods"
        this._baseId = "wood-list"
        this._buttonId = `button-${this._baseId}`
        this._checkboxId = `checkbox-${this._baseId}`
        this._modalId = `modal-${this._baseId}`

        this._setupListener()
    }

    async _loadAndSetupData(): Promise<void> {
        try {
            this._woodDataDefault = (await import(/* webpackChunkName: "data-woods" */ "Lib/gen-generic/woods.json"))
                .default as WoodData
            this._woodData = { ...this._woodDataDefault }
        } catch (error) {
            putImportError(error)
        }
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
            this._div[type] = body.append("div").attr("id", `${type}-list`)
        }
    }

    _getModifiers(type: WoodType): string[] {
        const modifiers = new Set<string>()
        this._woodDataDefault[type].forEach((wood) => {
            wood.properties.forEach((property) => {
                if (property.modifier !== "Ship material" && property.modifier !== "Boarding morale") {
                    modifiers.add(property.modifier)
                }
            })
        })
        return [...modifiers].sort(simpleStringSort)
    }

    _initModal(): void {
        initTablesort()
        this._injectModal()
        for (const type of woodType) {
            this._modifiers[type] = this._getModifiers(type)
            this._injectList(type)
        }
    }

    _woodFamilySelected(): void {
        const activeFamilies = new Set<WoodFamily>()
        for (const input of this._switchesSel) {
            if (input.checked) {
                const family = input.id.replace(`${this._checkboxId}-`, "") as WoodFamily
                activeFamilies.add(family)
            }
        }

        for (const type of woodType) {
            this._woodData[type] = this._woodDataDefault[type].filter((wood) => activeFamilies.has(wood.family))
            this._injectList(type)
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

    _addLineBreak(string: string): HtmlResult {
        const strings = string.split(" ", 2)
        const rest = string.slice(strings.join(" ").length)
        return html`${strings[0]}<br />${strings[1]} ${rest}`
    }

    _getHead(type: WoodType): HtmlResult {
        return html` <thead>
            <tr>
                <th data-sort-default>Wood</th>
                ${this._modifiers[type].map(
                    (modifier) => html`<th class="text-right">
                        ${this._addLineBreak(modifier)}
                    </th>`
                )}
            </tr>
        </thead>`
    }

    _addRow(type: WoodType, wood: WoodTrimOrFrame): HtmlResult {
        return html`
            <tr>
                <td>${wood.name}</td>

                ${this._modifiers[type].map((modifier) => {
                    const amount = wood.properties.find((property) => property.modifier === modifier)?.amount ?? 0

                    let formattedAmount
                    if (modifier === "Repair amount" && amount) {
                        formattedAmount = formatPP(amount, 1)
                    } else {
                        formattedAmount = amount ? formatFloatFixedHTML(amount) : ""
                    }

                    return html`<td class="text-right" data-sort="${amount ?? 0}">
                        ${formattedAmount}
                    </td>`
                })}
            </tr>
        `
    }

    _getBody(type: WoodType): HtmlResult {
        return html`<tbody>
            ${this._woodData[type].map((wood) => this._addRow(type, wood))}
        </tbody>`
    }

    _getList(type: WoodType): HtmlResult {
        return html`
            <table id="table-${this._baseId}-${type}-list" class="table table-sm small tablesort na-table">
                ${this._getHead(type)} ${this._getBody(type)}
            </table>
        `
    }

    /**
     * Show wood type
     */
    _injectList(type: WoodType): void {
        render(this._getList(type), this._div[type].node() as HTMLDivElement)

        const table = document.querySelector(`#table-${this._baseId}-${type}-list`) as HTMLTableElement
        // @ts-expect-error
        this._tablesort = new Tablesort(table)
    }
}
