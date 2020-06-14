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
import { capitalizeFirstLetter, putImportError, woodType, WoodType, WoodTypeList } from "../../common/common"
import { insertBaseModal } from "../../common/common-browser"
import { formatFloatFixedHTML, initTablesort } from "../../common/common-game-tools"
import { simpleStringSort } from "../../common/common-node"

import { WoodData } from "../../common/gen-json"
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
    private readonly _modalId: HtmlString
    private _woodData: WoodData = {} as WoodData
    private _div!: WoodTypeList<d3Selection.Selection<HTMLDivElement, unknown, HTMLElement, unknown>>

    constructor() {
        this._baseName = "List woods"
        this._baseId = "wood-list"
        this._buttonId = `button-${this._baseId}`
        this._modalId = `modal-${this._baseId}`

        this._setupListener()
    }

    async _loadAndSetupData(): Promise<void> {
        try {
            this._woodData = (await import(/* webpackChunkName: "data-woods" */ "Lib/gen-generic/woods.json"))
                .default as WoodData
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
        this._div = {} as WoodTypeList<d3Selection.Selection<HTMLDivElement, unknown, HTMLElement, unknown>>
        for (const type of woodType) {
            body.append("h5").text(capitalizeFirstLetter(`${type}s`))
            this._div[type] = body.append("div").attr("id", `${type}-list`)
        }
    }

    _initModal(): void {
        initTablesort()
        this._injectModal()

        for (const type of woodType) {
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

    _getModifiers(type: WoodType): string[] {
        const modifiers = new Set<string>()
        this._woodData[type].forEach((wood) => {
            wood.properties.forEach((property) => {
                if (property.modifier !== "Ship material" && property.modifier !== "Boarding morale") {
                    modifiers.add(property.modifier)
                }
            })
        })
        return [...modifiers].sort(simpleStringSort)
    }

    _getList(type: WoodType): HtmlResult {
        const modifiers = this._getModifiers(type)

        const addLineBreak = (string: string): HtmlResult => {
            const strings = string.split(" ", 2)
            const rest = string.slice(strings.join(" ").length)
            return html`${strings[0]}<br />${strings[1]} ${rest}`
        }

        const getHead = () => {
            return html` <thead>
                <tr>
                    <th data-sort-default>Wood</th>
                    ${modifiers.map(
                        (modifier) => html`<th class="text-right">
                            ${addLineBreak(modifier)}
                        </th>`
                    )}
                </tr>
            </thead>`
        }

        const getBody = (type: WoodType): HtmlResult => {
            return html`<tbody>
                ${this._woodData[type].map(
                    (wood) =>
                        html`
                            <tr>
                                <td>${wood.name}</td>

                                ${modifiers.map((modifier) => {
                                    const amount = wood.properties
                                        .filter((property) => property.modifier === modifier)
                                        .map((property) => property.amount)[0]

                                    return html` <td class="text-right" data-sort="${amount ?? 0}">
                                        ${amount ? formatFloatFixedHTML(amount) : ""}
                                    </td>`
                                })}
                            </tr>
                        `
                )}
            </tbody>`
        }

        return html`
            <table id="table-${this._baseId}-${type}-list" class="table table-sm small tablesort na-table">
                ${getHead()} ${getBody(type)}
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
        void new Tablesort(table)
    }
}
