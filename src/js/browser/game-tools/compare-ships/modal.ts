/*!
 * This file is part of na-map.
 *
 * @file      Make journey modal.
 * @module    map-tools/make-journey/modal
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { default as BSTooltip } from "bootstrap/js/dist/tooltip"
import { group as d3Group } from "d3-array"
import { Selection } from "d3-selection"
import { sortBy } from "common/common-node"
import { getOrdinal } from "common/common-math"
import { isImported, stripShipName } from "common/common-game-tools"
import { moduleAndWoodChanges } from "./module-data"
import { woodType } from "common/common"
import { Module, ModuleEntity, ModulePropertiesEntity, ShipData } from "common/gen-json"
import { HtmlString, Index, NestedIndex } from "common/interface"
import { ModuleType, ShipSelectData, ShipSelectMap } from "compare-ships"
import { ShipColumnType } from "./index"

import Modal from "util/modal"
import { formatPP, formatSignFloat, formatSignPercent } from "common/common-format"

export default class CompareShipsModal extends Modal {
    #buttonMakeImage = {} as Selection<HTMLButtonElement, unknown, HTMLElement, unknown>
    #shipSelectData = {} as ShipSelectMap[]
    #moduleTypes!: Set<ModuleType>
    #moduleProperties = new Map<number, ModuleEntity>()
    #selectModule$ = {} as NestedIndex<JQuery<HTMLSelectElement>>
    #selectShip$ = {} as Index<JQuery<HTMLSelectElement>>
    readonly #selectWood$ = {} as NestedIndex<JQuery<HTMLSelectElement>>
    readonly #cloneLeftButtonId: HtmlString
    readonly #cloneRightButtonId: HtmlString
    readonly #columnIds: ShipColumnType[]
    readonly #copyButtonId: HtmlString
    readonly #imageButtonId: HtmlString
    readonly #lastColumnId: string
    readonly #shipData: ShipData[]
    readonly #woodId = "wood-ship"
    readonly #moduleDataDefault: Module[]
    readonly #moduleAndWoodChanges = moduleAndWoodChanges

    constructor(
        title: string,
        columnIds: ShipColumnType[],
        lastColumnId: string,
        shipData: ShipData[],
        moduleDataDefault: Module[]
    ) {
        super(title, "lg")

        this.#columnIds = columnIds
        this.#lastColumnId = lastColumnId
        this.#shipData = shipData
        this.#moduleDataDefault = moduleDataDefault

        this.#copyButtonId = `${super.baseId}-button-copy`
        this.#cloneLeftButtonId = `${super.baseId}-button-clone-left`
        this.#cloneRightButtonId = `${super.baseId}-button-clone-right`
        this.#imageButtonId = `${super.baseId}-button-image`

        this._init()
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

    _init(): void {
        this._initData()
        this._injectModal()
        this._initSelects()
    }

    _getModuleSelectId(type: string, columnId: ShipColumnType): HtmlString {
        return `${super.baseId}-${type.replace(/\s/, "")}-${columnId}-select`
    }

    _getShipSelectId(columnId: ShipColumnType): HtmlString {
        return `${super.baseId}-${columnId}-select`
    }

    _getWoodSelectId(type: string, columnId: ShipColumnType): HtmlString {
        return `${this.#woodId}-${type}-${columnId}-select`
    }

    _injectModal(): void {
        const body = super.getBodySel()

        const row = body.append("div").attr("class", "container-fluid").append("div").attr("class", "row")

        for (const columnId of this.#columnIds) {
            const div = row
                .append("div")
                .attr("id", `${super.baseId}-${columnId.toLowerCase()}`)
                .attr("class", `col-md-4 ms-auto pt-2 ${columnId === "Base" ? "column-base" : "column-comp"}`)

            const shipSelectId = this._getShipSelectId(columnId)

            const divShip = div.append("div").attr("class", "input-group justify-content-between mb-1")

            // Add clone icon except for first column
            if (columnId !== this.#columnIds[0]) {
                divShip
                    .append("div")
                    .attr("class", "input-group-prepend")
                    .append("button")
                    .attr("class", "btn btn-default icon-outline-button")
                    .attr("id", `${this.#cloneLeftButtonId}-${columnId}`)
                    .attr("title", "Clone ship to left")
                    .attr("type", "button")
                    .append("i")
                    .attr("class", "icon icon-clone-left")
            }

            divShip
                .append("label")
                .append("select")
                .attr("name", shipSelectId)
                .attr("id", shipSelectId)
                .attr("class", "selectpicker")

            // Add clone icon except for last right column
            if (columnId !== this.#lastColumnId) {
                divShip
                    .append("div")
                    .attr("class", "input-group-append")
                    .append("button")
                    .attr("class", "btn btn-default icon-outline-button")
                    .attr("id", `${this.#cloneRightButtonId}-${columnId}`)
                    .attr("title", "Clone ship to right")
                    .attr("type", "button")
                    .append("i")
                    .attr("class", "icon icon-clone-right")
            }

            const divWoods = div.append("div").attr("class", "input-group justify-content-between mb-1")
            for (const type of woodType) {
                const woodId = this._getWoodSelectId(type, columnId)
                divWoods
                    .append("label")
                    .append("select")
                    .attr("name", woodId)
                    .attr("id", woodId)
                    .attr("class", "selectpicker")
            }

            const divModules = div.append("div").attr("class", "input-group justify-content-between")
            for (const type of this.#moduleTypes) {
                const moduleId = this._getModuleSelectId(type, columnId)
                divModules
                    .append("label")
                    .attr("class", "mb-1")
                    .append("select")
                    .attr("name", moduleId)
                    .attr("id", moduleId)
                    .property("multiple", true)
                    .attr("class", "selectpicker")
            }

            div.append("div")
                .attr("id", `${super.baseId}-${columnId}`)
                .attr("class", `${columnId === "Base" ? "ship-base" : "ship-compare"} compress`)
        }

        const footer = super.getFooter()
        footer
            .insert("button", "button")
            .attr("class", "btn btn-outline-secondary icon-outline-button")
            .attr("id", this.#copyButtonId)
            .attr("title", "Copy to clipboard (ctrl-c)")
            .attr("type", "button")
            .append("i")
            .attr("class", "icon icon-copy")
        this.#buttonMakeImage = footer
            .insert("button", "button")
            .attr("class", "btn btn-outline-secondary icon-outline-button")
            .attr("id", this.#imageButtonId)
            .attr("title", "Make image")
            .attr("type", "button")
        this.#buttonMakeImage.append("i").attr("class", "icon icon-image")
    }

    /**
     * Setup ship data (group by class)
     */
    _setupShipData(): void {
        this.#shipSelectData = [...d3Group(this.#shipData, (ship) => ship.class)]
            .map(([key, value]) => ({
                key,
                values: value
                    .map(
                        (ship) =>
                            ({
                                id: ship.id,
                                name: ship.name,
                                class: ship.class,
                                battleRating: ship.battleRating,
                                guns: ship.guns.total,
                            } as ShipSelectData)
                    )
                    .sort(sortBy(["name"])),
            }))
            .sort(sortBy(["key"]))
    }

    /**
     * Setup module data
     */
    _setupModuleData(): void {
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

    _initData(): void {
        this._setupShipData()
        this._setupModuleData()
    }

    /**
     * Get select options
     */
    _getShipOptions(): HtmlString {
        return this.#shipSelectData
            .map(
                (key) =>
                    `<optgroup label="${getOrdinal(Number(key.key), false)} rate">${key.values
                        .map(
                            (ship) =>
                                `<option data-subtext="${ship.battleRating} ${
                                    isImported(ship.name) ? "Imported" : ""
                                }" value="${ship.id}">${stripShipName(ship.name)} (${ship.guns})`
                        )
                        .join("</option>")}`
            )
            .join("</optgroup>")
    }

    /**
     * Setup ship select
     * @param columnId - Column id
     */
    _setupShipSelect(columnId: ShipColumnType): void {
        this.#selectShip$[columnId] = $(`#${this._getShipSelectId(columnId)}`)
        const options = this._getShipOptions()
        this.#selectShip$[columnId].append(options)
        if (columnId !== "Base") {
            this.#selectShip$[columnId].attr("disabled", "disabled")
        }
    }

    _initSelectColumns(): void {
        for (const columnId of this.#columnIds) {
            this._setupShipSelect(columnId)
            if (super.baseId !== "ship-journey") {
                this.#selectWood$[columnId] = {}
                for (const type of woodType) {
                    this.#selectWood$[columnId][type] = $(`#${this._getWoodSelectId(type, columnId)}`)
                    this.woodCompare._setupWoodSelects(columnId, type, this.#selectWood$[columnId][type])
                }
            }
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

    _initTooltip(select$: JQuery<HTMLSelectElement>): void {
        const tooltips = new Map<number, BSTooltip | undefined>()

        const addTooltip = (element: HTMLLIElement, module: ModuleEntity): void => {
            // Add tooltip with module properties
            element.dataset.originalTitle = CompareShipsModal._getModifierFromModule(module.properties)
            const tooltip = new BSTooltip(element, { boundary: "viewport", html: true })
            element.addEventListener("show.bs.tooltip", () => {
                // Remember shown tooltip
                tooltips.set(module.id, tooltip)
            })
            element.addEventListener("hide.bs.tooltip", () => {
                tooltips.set(module.id, undefined)
            })
        }

        for (const element of select$.data("selectpicker").selectpicker.current.elements as HTMLLIElement[]) {
            if (!(element.classList.contains("dropdown-divider") || element.classList.contains("dropdown-header"))) {
                const module = this._getModuleFromName(element.textContent)
                if (module) {
                    addTooltip(element, module)
                }
            }
        }
    }

    /**
     * Setup upgrades select
     * @param columnId - Column id
     */
    setupModulesSelect(columnId: ShipColumnType): void {
        if (!this.#selectModule$[columnId]) {
            this.#selectModule$[columnId] = {}

            for (const type of this.#moduleTypes) {
                this.#selectModule$[columnId][type] = $(`#${this._getModuleSelectId(type, columnId)}`)

                this.#selectModule$[columnId][type]
                    .on("show.bs.select", (event: Event) => {
                        const select$ = $(event.currentTarget as HTMLSelectElement)

                        // Remove 'select all' button
                        select$.parent().find("button.bs-select-all").remove()
                        this._initTooltip(select$)
                    })
                    .selectpicker({
                        actionsBox: true,
                        countSelectedText(amount: number) {
                            return `${amount} ${type.toLowerCase()}s selected`
                        },
                        deselectAllText: "Clear",
                        liveSearch: true,
                        liveSearchNormalize: true,
                        liveSearchPlaceholder: "Search ...",
                        maxOptions: type.startsWith("Ship trim") ? 6 : 5,
                        selectedTextFormat: "count > 1",
                        title: `${type}`,
                        width: "150px",
                    })
                    .on("hide.bs.select", () => {
                        // Hide remaining tooltips
                        for (const [, tooltip] of tooltips) {
                            if (tooltip) {
                                tooltip.destroy()
                            }
                        }

                        tooltips.clear()
                    })
            }
        }
    }

    _initSelects(): void {
        this._initSelectColumns()
    }

    enableSelect(compareId: string): void {
        this.#selectShip$[compareId].removeAttr("disabled").selectpicker("refresh")
    }

    getSelectModule$(columnId: ShipColumnType, type: ModuleType): JQuery<HTMLSelectElement> {
        return this.#selectModule$[columnId][type]
    }

    getModuleProperty(id: number): ModuleEntity | undefined {
        return this.#moduleProperties.get(id)
    }

    getModuleSelectValue(columnId: ShipColumnType, type: ModuleType): string | number | string[] | undefined {
        return this.#selectModule$[columnId][type].val()
    }

    getSelectShip$(columnId: ShipColumnType): JQuery<HTMLSelectElement> {
        return this.#selectShip$[columnId]
    }

    refreshSelectModule$(columnId: ShipColumnType, type: ModuleType): void {
        this.#selectModule$[columnId][type].selectpicker("refresh")
    }

    get buttonMakeImage(): Selection<HTMLButtonElement, unknown, HTMLElement, unknown> {
        return this.#buttonMakeImage
    }

    get cloneLeftButtonId(): HtmlString {
        return this.#cloneLeftButtonId
    }

    get cloneRightButtonId(): HtmlString {
        return this.#cloneRightButtonId
    }

    get copyButtonId(): HtmlString {
        return this.#copyButtonId
    }

    get imageButtonId(): HtmlString {
        return this.#imageButtonId
    }

    get moduleProperties(): Map<number, ModuleEntity> {
        return this.#moduleProperties
    }

    get moduleTypes(): Set<ModuleType> {
        return this.#moduleTypes
    }
}
