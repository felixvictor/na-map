/*!
 * This file is part of na-map.
 *
 * @file      List modules.
 * @module    game-tools/list-modules
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import "bootstrap/js/dist/util"
import "bootstrap/js/dist/modal"

import "bootstrap-select"
import { select as d3Select } from "d3-selection"

import { registerEvent } from "../analytics"
import { insertBaseModal } from "common/common-browser"
import { formatPP, formatSignInt, formatSignPercent } from "common/common-format"
import { getOrdinal } from "common/common-math"
import { sortBy } from "common/common-node"
import { chunkify } from "../util"

import JQuery from "jquery"
import { Module, ModuleEntity } from "common/gen-json"
import { HtmlString } from "common/interface"

export default class ListModules {
    private readonly _baseName: string
    private readonly _baseId: HtmlString
    private readonly _buttonId: HtmlString
    private readonly _modalId: HtmlString
    private _moduleData: Module[] = {} as Module[]
    constructor() {
        this._baseName = "List modules"
        this._baseId = "module-list"
        this._buttonId = `button-${this._baseId}`
        this._modalId = `modal-${this._baseId}`

        this._setupListener()
    }

    async _loadAndSetupData(): Promise<void> {
        this._moduleData = (
            await import(/* webpackChunkName: "data-modules" */ "../../../lib/gen-generic/modules.json")
        ).default as Module[]
    }

    _setupListener(): void {
        let firstClick = true

        document.querySelector(`#${this._buttonId}`)?.addEventListener("click", async () => {
            if (firstClick) {
                firstClick = false
                await this._loadAndSetupData()
            }

            registerEvent("Tools", this._baseName)

            this._moduleListSelected()
        })
    }

    // noinspection DuplicatedCode
    _injectModal(): void {
        insertBaseModal({ id: this._modalId, title: this._baseName })

        const id = `${this._baseId}-select`
        const body = d3Select(`#${this._modalId} .modal-body`)
        body.append("label").attr("for", id)
        body.append("select").attr("name", id).attr("id", id)
        body.append("div").attr("id", `${this._baseId}`)
    }

    _getOptions(): HtmlString {
        return `${this._moduleData.map((type) => `<option value="${type[0]}"">${type[0]}</option>;`).join("")}`
    }

    _setupSelect(): void {
        const select$ = $(`#${this._baseId}-select`)
        const options = this._getOptions()
        select$.append(options)
    }

    _setupSelectListener(): void {
        const select$ = $(`#${this._baseId}-select`)

        select$
            .addClass("selectpicker")
            .on("change", (event) => {
                this._moduleSelected(event)
            })
            .selectpicker({ noneSelectedText: "Select module category" })
            .val("default")
            .selectpicker("refresh")
    }

    _initModal(): void {
        this._injectModal()
        this._setupSelect()
        this._setupSelectListener()
    }

    _moduleListSelected(): void {
        // If the modal has no content yet, insert it
        if (!document.querySelector(`#${this._modalId}`)) {
            this._initModal()
        }

        // Show modal
        $(`#${this._modalId}`).modal("show")
    }

    /**
     * Get rows with modules for module moduleType
     * @param moduleType - Module Type
     * @returns html table rows
     */
    _getRows(moduleType: string): HtmlString[] {
        /**
         * Rate code mapped into human readable string
         */
        const rates = new Map<string, string>([
            ["L", `${getOrdinal(1)}\u202F\u2013\u202F${getOrdinal(3)}`],
            ["M", `${getOrdinal(4)}\u202F\u2013\u202F${getOrdinal(5)}`],
            ["S", `${getOrdinal(6)}\u202F\u2013\u202F${getOrdinal(7)}`],
        ])

        /**
         * Get ship rate from module level
         * @param moduleLevel - Module level
         * @returns Ship rate
         */
        const getRate = (moduleLevel: string): string => (moduleLevel === "U" ? "" : `${rates.get(moduleLevel) ?? ""}`)

        /**
         * Test if current module and module at index position has same properties
         * @returns True if same
         */
        // eslint-disable-next-line unicorn/consistent-function-scoping
        const hasSameProperties = (module: ModuleEntity, nextModule: ModuleEntity | undefined): boolean =>
            nextModule !== undefined &&
            module.name === nextModule.name &&
            JSON.stringify(module.properties) === JSON.stringify(nextModule.properties)

        let rate = ""
        const rows = [] as HtmlString[]
        for (const type of this._moduleData) {
            if (type[0] === moduleType) {
                for (const [i, module] of type[1].sort(sortBy(["name"])).entries()) {
                    rate = getRate(module.moduleLevel)
                    if (hasSameProperties(module, type[1][i + 1])) {
                        type[1][i + 1].hasSamePropertiesAsPrevious = true
                        rate += `<br>${getRate(type[1][i + 1].moduleLevel)}`
                    }

                    if (hasSameProperties(module, type[1][i + 2])) {
                        type[1][i + 2].hasSamePropertiesAsPrevious = true
                        rate = ""
                    }

                    if (
                        typeof module.hasSamePropertiesAsPrevious === "undefined" ||
                        !module.hasSamePropertiesAsPrevious
                    ) {
                        rows.push(
                            `<tr><td><span class="name">${module.name}<br>${rate}</span></td><td>${module.properties
                                .map((property) => {
                                    let amount
                                    if (property.isPercentage) {
                                        amount = formatSignPercent(property.amount / 100)
                                    } else {
                                        amount =
                                            property.amount < 1 && property.amount > 0
                                                ? formatPP(property.amount, 1)
                                                : formatSignInt(property.amount)
                                    }

                                    return `${property.modifier} ${amount}`
                                })
                                .join("<br>")}</td></tr>`
                        )
                    }
                }
            }
        }

        return rows
    }

    /**
     * Construct module list tables
     * @param moduleType - Module type.
     */
    _getText(moduleType: string): HtmlString {
        const columns = 3
        const rows = this._getRows(moduleType)
        const splitRows = chunkify(rows, columns)
        let text = ""
        for (const column of Array.from({ length: splitRows.length }).keys()) {
            text += `<div class="col-md-${Math.floor(12 / splitRows.length)}">`
            text += '<table class="table table-sm small na-table"><thead>'
            text += "<tr><th>Module</th><th>Modifier</th></tr></thead><tbody>"
            text += splitRows[column].join("")
            text += "</tbody></table></div>"
        }

        return text
    }

    /**
     * Show modules for selected module type
     * @param event - Event
     */
    _moduleSelected(event: JQuery.ChangeEvent): void {
        const moduleType = $(event.currentTarget).find(":selected").val() as string

        // Remove old recipe list
        d3Select(`#${this._baseId} div`).remove()

        // Add new recipe list
        d3Select(`#${this._baseId}`).append("div").classed("row mt-4", true)
        d3Select(`#${this._baseId} div`).html(this._getText(moduleType))
    }
}
