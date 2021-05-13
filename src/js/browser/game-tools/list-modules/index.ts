/*!
 * This file is part of na-map.
 *
 * @file      List modules.
 * @module    game-tools/list-modules
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { registerEvent } from "../../analytics"
import { formatPP, formatSignInt, formatSignPercentOldstyle } from "common/common-format"
import { getOrdinal } from "common/common-math"
import { chunkify } from "../../util"

import { Module, ModuleEntity } from "common/gen-json"
import { HtmlString } from "common/interface"
import { sortBy } from "common/common"
import Modal from "util/modal"
import { getIdFromBaseName } from "common/common-browser"
import Select from "util/select"

export default class ListModules {
    readonly #baseId: HtmlString
    readonly #baseName = "List modules"
    readonly #menuId: HtmlString
    #modal: Modal | undefined = undefined
    #select = {} as Select
    #moduleData = {} as Module[]

    constructor() {
        this.#baseId = getIdFromBaseName(this.#baseName)
        this.#menuId = `menu-${this.#baseId}`

        this._setupListener()
    }

    async _loadAndSetupData(): Promise<void> {
        this.#moduleData = (
            await import(/* webpackChunkName: "data-modules" */ "../../../../../lib/gen-generic/modules.json")
        ).default as Module[]
    }

    async _menuClicked(): Promise<void> {
        registerEvent("Tools", this.#baseName)

        if (this.#modal) {
            this.#modal.show()
        } else {
            await this._loadAndSetupData()
            this.#modal = new Modal(this.#baseName, "xl")
            this._setupSelect()
            this._setupSelectListener()
        }
    }

    _setupListener(): void {
        document.querySelector(`#${this.#menuId}`)?.addEventListener("click", () => {
            void this._menuClicked()
        })
    }

    _getOptions(): HtmlString {
        return `${this.#moduleData.map((type) => `<option value="${type[0]}">${type[0]}</option>`).join("")}`
    }

    _setupSelect(): void {
        const bsSelectOptions: BootstrapSelectOptions = { noneSelectedText: "Select module category" }

        this.#select = new Select(this.#baseId, this.#modal!.baseIdSelects, bsSelectOptions, this._getOptions())
    }

    _setupSelectListener(): void {
        this.#select.select$.on("change", () => {
            this._moduleSelected()
        })
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
        for (const type of this.#moduleData) {
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
                                        amount = formatSignPercentOldstyle(property.amount / 100)
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
            text += '<table class="table table-sm small table-striped table-hover text-table text-start"><thead>'
            text += "<tr><th>Module</th><th>Modifier</th></tr></thead><tbody>"
            text += splitRows[column].join("")
            text += "</tbody></table></div>"
        }

        return text
    }

    /**
     * Show modules for selected module type
     */
    _moduleSelected(): void {
        const moduleType = String(this.#select.getValues())
        const div = this.#modal!.outputSel

        // Remove old recipe list
        div.select("div").remove()

        // Add new recipe list
        div.append("div").classed("row mt-4", true).html(this._getText(moduleType))
    }
}
