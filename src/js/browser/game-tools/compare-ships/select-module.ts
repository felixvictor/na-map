/*!
 * This file is part of na-map.
 *
 * @file      Compare ships file - select module.
 * @module    game-tools/compare-ships/compare-ships/select-module
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { default as BSTooltip } from "bootstrap/js/dist/tooltip"

import { group as d3Group } from "d3-array"
import { sortBy } from "common/common"
import { formatPP, formatSignFloat, formatSignPercent } from "common/common-format"
import { moduleAndWoodChanges } from "./module-modifier"

import { Selection } from "d3-selection"
import { HtmlString } from "common/interface"
import { Module, ModuleEntity, ModulePropertiesEntity } from "common/gen-json"
import { ModuleType, ModuleTypeList, ShipColumnTypeList } from "compare-ships"
import { ShipColumnType } from "./index"

import Select from "util/select"



export default class SelectModule extends Select {
    #select$ = {} as ShipColumnTypeList<ModuleTypeList<JQuery<HTMLSelectElement>>>
    #moduleTypes!: Set<ModuleType>
    #moduleProperties = new Map<number, ModuleEntity>()
    #tooltips = new Map<number, BSTooltip | undefined>()

    readonly #moduleDataDefault: Module[]
    readonly #moduleAndWoodChanges = moduleAndWoodChanges

    constructor(
        id: HtmlString,
        selectsDiv: Selection<HTMLDivElement, unknown, HTMLElement, unknown>,
        moduleDataDefault: Module[]
    ) {
        super(id, selectsDiv)

        this.#moduleDataDefault = moduleDataDefault

        this._setupData()
    }

    get moduleProperties(): Map<number, ModuleEntity> {
        return this.#moduleProperties
    }

    get moduleTypes(): Set<ModuleType> {
        return this.#moduleTypes
    }

    static _getModifierFromModule(properties: ModulePropertiesEntity[]): HtmlString {
        return `<p class="mb-0">${properties
            .map((property) => {
                let amount
                if (property.isPercentage) {
                    amount = formatSignPercent(property.amount / 100)
                } else {
                    amount =
                        property.amount < 1 && property.amount > 0
                            ? formatPP(property.amount, 1)
                            : formatSignFloat(property.amount, 2)
                }

                return `${property.modifier} ${amount}`
            })
            .join("<br>")}</p>`
    }

    static _getModuleLevel(rate: number): string {
        return rate <= 3 ? "L" : rate <= 5 ? "M" : "S"
    }

    _setModuleTypeValues(columnId: ShipColumnType, type: ModuleType, ids: number[]): void {
        Select.setSelectValues(this.#select$[columnId][type], ids)
    }

    setValues(columnId: ShipColumnType, moduleIds: Map<string, number[]>): void {
        for (const type of [...this.#moduleTypes]) {
            this._setModuleTypeValues(columnId, type, moduleIds.get(type) ?? [])
        }
    }



    _getSelectId(columnId: ShipColumnType, type: ModuleType): HtmlString {
        return `${super.baseId}-${columnId}-${type.replace(/\s/, "")}-select`
    }

    /**
     * Setup module data
     */
    _setupData(): void {

    }



    /**
     * Get select options
     */

    _fillSelect(columnId: ShipColumnType, type: string, shipClass: number): void {
        const options = this._getUpgradesOptions(type, shipClass)

        this.#select$[columnId][type].empty()
        this.#select$[columnId][type].append(options)
    }

    _refreshSelect(columnId: ShipColumnType, type: ModuleType): void {
        Select.refresh(this.#select$[columnId][type])
    }

    getSelect$(columnId: ShipColumnType, type: ModuleType): JQuery<HTMLSelectElement> {
        return this.#select$[columnId][type]
    }

    _getSelectValue(columnId: ShipColumnType, type: ModuleType): string | number | string[] | undefined {
        return this.#select$[columnId][type].val()
    }

    updateSelects(columnId: ShipColumnType, shipClass: number): void {
        for (const type of this.#moduleTypes) {
            this._fillSelect(columnId, type, shipClass)
            this._refreshSelect(columnId, type)
        }
    }

    _injectSelects(columnId: ShipColumnType): void {
        const div = super.selectsDiv.append("div").attr("class", "input-group justify-content-between")
        for (const type of this.#moduleTypes) {
            const id = this._getSelectId(columnId, type)
            div.append("label")
                .attr("class", "mb-1")
                .append("select")
                .attr("name", id)
                .attr("id", id)
                .property("multiple", true)
                .attr("class", "selectpicker")
        }
    }

    setup(columnId: ShipColumnType, shipClass: number): void {
        this._injectSelects(columnId)

        if (!this.#select$[columnId]) {
            this.#select$[columnId] = {}

            for (const type of this.#moduleTypes) {
                this.#select$[columnId][type] = $(`#${this._getSelectId(columnId, type)}`)
                Select.construct(this.#select$[columnId][type], {
                    actionsBox: true,
                    countSelectedText(amount: number) {
                        return `${amount} ${type.toLowerCase()}s selected`
                    },
                    deselectAllText: "Clear",
                    liveSearch: true,
                    liveSearchNormalize: true,
                    liveSearchPlaceholder: "Search ...",
                    maxOptions: type.startsWith("Column trim") ? 6 : 5,
                    selectedTextFormat: "count > 1",
                    title: `${type}`,
                    width: "150px",
                })
                this.#select$[columnId][type]
                    .on("show.bs.select", (event: Event) => {
                        const select$ = $(event.currentTarget as HTMLSelectElement)

                        // Remove 'select all' button
                        select$.parent().find("button.bs-select-all").remove()
                        this._initTooltip(select$)
                    })
                    .on("hide.bs.select", () => {
                        // Hide remaining tooltips
                        for (const [, tooltip] of this.#tooltips) {
                            if (tooltip) {
                                tooltip.hide()
                            }
                        }

                        this.#tooltips.clear()
                    })
            }
        }

        this.updateSelects(columnId, shipClass)
    }

    getModuleProperties(id: number): ModuleEntity | undefined {
        return this.#moduleProperties.get(id)
    }

    getSelectedUpgradeIds(columnId: ShipColumnType, type: ModuleType): number[] {
        const value = this._getSelectValue(columnId, type)

        return Select.getSelectValueAsNumberArray(value)
    }
}
