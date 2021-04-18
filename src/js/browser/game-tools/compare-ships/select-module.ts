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

import Select from "util/select"
import { HtmlString } from "common/interface"
import { Module, ModuleEntity, ModulePropertiesEntity } from "common/gen-json"
import { formatPP, formatSignFloat, formatSignPercent } from "common/common-format"
import { moduleAndWoodChanges } from "./module-modifier"
import { ModuleType, ModuleTypeList, ShipColumnTypeList } from "compare-ships"
import { ShipColumnType } from "./index"
import { group as d3Group } from "d3-array"
import { select as d3Select } from "d3-selection"
import { sortBy } from "common/common"
import { getBaseIdSelects } from "common/common-browser"

type ModuleOptionType = [number, ModuleEntity]

export default class SelectModule extends Select {
    #select$ = {} as ShipColumnTypeList<ModuleTypeList<JQuery<HTMLSelectElement>>>
    #moduleTypes!: Set<ModuleType>
    #moduleProperties = new Map<number, ModuleEntity>()
    #tooltips = new Map<number, BSTooltip | undefined>()

    readonly #moduleDataDefault: Module[]
    readonly #moduleAndWoodChanges = moduleAndWoodChanges

    constructor(id: HtmlString, moduleDataDefault: Module[]) {
        super(id)

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

    _setSelectedModules(columnId: ShipColumnType, type: ModuleType, ids: number[]): void {
        Select.setSelect(this.#select$[columnId][type], ids)
    }

    setSelectedIds(columnId: ShipColumnType, moduleIds: Map<string, number[]>): void {
        for (const type of [...this.#moduleTypes]) {
            this._setSelectedModules(columnId, type, moduleIds.get(type) ?? [])
        }
    }

    _getModuleFromName(moduleName: string | null): ModuleEntity | undefined {
        let module = {} as ModuleEntity | undefined

        this.#moduleDataDefault.some((type) => {
            module = type[1].find((module) => module.name === moduleName)
            return Boolean(module)
        })

        return module
    }

    _getSelectId(columnId: ShipColumnType, type: ModuleType): HtmlString {
        return `${super.baseId}-${columnId}-${type.replace(/\s/, "")}-select`
    }

    /**
     * Setup module data
     */
    _setupData(): void {
        // Get all modules where change modifier (moduleChanges) exists
        this.#moduleProperties = new Map(
            this.#moduleDataDefault.flatMap((type) =>
                type[1]
                    .filter((module) =>
                        module.properties.some((property) => {
                            return this.#moduleAndWoodChanges.has(property.modifier)
                        })
                    )
                    .map((module) => [module.id, module])
            )
        )

        // Get types from moduleProperties list
        this.#moduleTypes = new Set<ModuleType>(
            [...this.#moduleProperties].map((module) => module[1].type.replace(/\s\u2013\s[\s/A-Za-z\u25CB]+/, ""))
        )
    }

    _addTooltip(element: HTMLLIElement, module: ModuleEntity): void {
        // Add tooltip with module properties
        element.dataset.bsOriginalTitle = SelectModule._getModifierFromModule(module.properties)
        // const tooltip = new BSTooltip(element, { boundary: "viewport", html: true })
        const tooltip = new BSTooltip(element, { html: true })
        element.addEventListener("show.bs.tooltip", () => {
            // Remember shown tooltip
            this.#tooltips.set(module.id, tooltip)
        })
        element.addEventListener("hide.bs.tooltip", () => {
            this.#tooltips.set(module.id, undefined)
        })
    }

    _initTooltip(select$: JQuery<HTMLSelectElement>): void {
        for (const element of select$.data("selectpicker").selectpicker.current.elements as HTMLLIElement[]) {
            if (!(element.classList.contains("dropdown-divider") || element.classList.contains("dropdown-header"))) {
                const module = this._getModuleFromName(element.textContent)
                if (module) {
                    this._addTooltip(element, module)
                }
            }
        }
    }

    _getModuleDataForShipClass(moduleType: string, shipClass: number): ModuleOptionType[] {
        return [...this.#moduleProperties].filter(
            (module) =>
                module[1].type.replace(/\s–\s[\s/A-Za-z\u25CB]+/, "") === moduleType &&
                (module[1].moduleLevel === "U" || module[1].moduleLevel === SelectModule._getModuleLevel(shipClass))
        )
    }

    _getModulesGrouped(moduleType: string, shipClass: number): Array<{ key: string; values: ModuleOptionType[] }> {
        const moduleData = this._getModuleDataForShipClass(moduleType, shipClass)
        return [...d3Group(moduleData, (module) => module[1].type.replace(/[\sA-Za-z]+\s–\s/, ""))]
            .map(([key, value]) => ({
                key,
                values: value.sort((a, b) => a[1].name.localeCompare(b[1].name)),
            }))
            .sort(sortBy(["key"]))
    }

    _getMaxOptions(moduleTypeWithSingleOption: Set<string>, moduleType: string): number {
        return moduleTypeWithSingleOption.has(moduleType.replace(/[\sA-Za-z]+\s–\s/, "")) ? 1 : 5
    }

    _getOption(values: ModuleOptionType[]): HtmlString {
        return values.map((module) => `<option value="${module[0]}">${module[1].name}</option>`).join("")
    }

    /**
     * Get select options
     * @param moduleType - Module type
     * @param shipClass - Ship class
     * @returns HTML formatted option
     */
    _getUpgradesOptions(moduleType: string, shipClass: number): string {
        // Group module data by sub type (e.g. "Gunnery")
        const modulesGrouped = this._getModulesGrouped(moduleType, shipClass)
        let options: string
        const moduleTypeWithSingleOption = new Set(["Permanent", "Column trim"])

        // eslint-disable-next-line unicorn/prefer-ternary
        if (modulesGrouped.length > 1) {
            // Get options with sub types as optgroups
            options = modulesGrouped
                .map(
                    (group) =>
                        `<optgroup label="${group.key}" data-max-options="${this._getMaxOptions(
                            moduleTypeWithSingleOption,
                            moduleType
                        )}">${this._getOption(group.values)}</optgroup>`
                )
                .join("")
        } else {
            // Get options without optgroups
            options = modulesGrouped.map((group) => `${this._getOption(group.values)}`).join("")
        }

        return options
    }

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

    resetSelects(columnId: ShipColumnType, shipClass: number): void {
        for (const type of this.#moduleTypes) {
            this._fillSelect(columnId, type, shipClass)
            this._refreshSelect(columnId, type)
        }
    }

    _injectSelects(columnId: ShipColumnType): void {
        const mainDiv = d3Select(`#${getBaseIdSelects(super.baseId)}-${columnId}`)

        const div = mainDiv.append("div").attr("class", "input-group justify-content-between")
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

        this.resetSelects(columnId, shipClass)
    }

    getModuleProperties(id: number): ModuleEntity | undefined {
        return this.#moduleProperties.get(id)
    }

    getSelectedUpgradeIds(columnId: ShipColumnType, type: ModuleType): number[] {
        const value = this._getSelectValue(columnId, type)
        return Select.getSelectValueAsNumberArray(value)
    }
}
