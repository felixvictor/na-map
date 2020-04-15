/*!
 * This file is part of na-map.
 *
 * @file      Compare ships file.
 * @module    game-tools/compare-ships/compare-ships
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

/// <reference types="bootstrap" />
import "bootstrap/js/dist/util"
import "bootstrap/js/dist/modal"

import { ascending as d3Ascending, max as d3Max, min as d3Min } from "d3-array"
import { nest as d3Nest } from "d3-collection"
import { interpolateCubehelixLong as d3InterpolateCubehelixLong } from "d3-interpolate"
import { ScaleLinear, scaleLinear as d3ScaleLinear } from "d3-scale"
import { select as d3Select } from "d3-selection"

import { registerEvent } from "../../analytics"
import {
    appVersion,
    colourGreenDark,
    colourRedDark,
    colourWhite,
    hashids,
    HtmlString,
    hullRepairsPercent,
    insertBaseModal,
    repairTime,
    rigRepairsPercent,
} from "../../../common/common-browser"
import { isEmpty, putImportError, WoodType } from "../../../common/common"
import { formatPP, formatSignInt, formatSignPercent } from "../../../common/common-format"
import { ArrayIndex, Index, NestedIndex } from "../../../common/interface"
import { getOrdinal } from "../../../common/common-math"
import { sortBy } from "../../../common/common-node"
import { copyToClipboard } from "../../util"

import { Module, ModuleEntity, ModulePropertiesEntity, ShipData, ShipRepairTime } from "../../../common/gen-json"

import { ShipBase, ShipComparison } from "."
import CompareWoods, { WoodColumnType } from "../compare-woods"

interface ShipSelectMap {
    key: string
    values: ShipSelectData[]
}

interface ShipSelectData {
    id: number
    name: string
    class: number
    battleRating: number
    guns: number
}

interface Property {
    properties: string[]
    isBaseValueAbsolute: boolean
}

interface Amount {
    amount: number
    isPercentage: boolean
}

interface AbsoluteAndPercentageAmount {
    absolute: number
    percentage: number
}

interface PropertyWithCap {
    properties: string[]
    cap: Amount
}

type ModuleType = string

const shipColumnType = ["Base", "C1", "C2"] as const
type ShipColumnType = typeof shipColumnType[number]
type ColumnArray<T> = {
    [K in ShipColumnType]: T[]
}
type ColumnNestedArray<T> = {
    [K in ShipColumnType]: ArrayIndex<T>
}

export class CompareShips {
    colorScale!: ScaleLinear<string, string>
    readonly colourScaleSpeedDiff: ScaleLinear<string, string>
    readonly columnsCompare: ShipColumnType[]
    innerRadius!: number
    outerRadius!: number
    radiusSpeedScale!: ScaleLinear<number, number>
    selectedShips!: Index<ShipBase | ShipComparison>
    singleShipData!: ShipData
    shipMassScale!: ScaleLinear<number, number>
    svgHeight!: number
    svgWidth!: number
    windProfileRotate = 0
    woodCompare!: CompareWoods
    private _maxSpeed!: number
    private _minSpeed!: number
    private _modal$: JQuery = {} as JQuery
    private _modifierAmount: Map<string, AbsoluteAndPercentageAmount>
    private _moduleAndWoodCaps!: Map<string, PropertyWithCap>
    private _moduleAndWoodChanges!: Map<string, Property>
    private _moduleDataDefault!: Module[]
    private _moduleProperties!: Map<number, ModuleEntity>
    private _moduleTypes!: Set<ModuleType>
    private _selectedUpgradeIdsList: ColumnArray<number> = {} as ColumnArray<number>
    private _selectedUpgradeIdsPerType: ColumnNestedArray<number> = {} as ColumnNestedArray<number>
    private _selectModule$: NestedIndex<JQuery<HTMLSelectElement>> = {}
    private _selectShip$: Index<JQuery<HTMLSelectElement>> = {}
    private _selectWood$: NestedIndex<JQuery<HTMLSelectElement>> = {}
    private _shipData!: ShipData[]
    private _shipIds: Index<number> | NestedIndex<number> = {}
    private _shipSelectData!: ShipSelectMap[]
    private readonly _baseId: string
    private readonly _baseName: string
    private readonly _buttonId: HtmlString
    private readonly _columns: ShipColumnType[]
    private readonly _copyButtonId: HtmlString
    private readonly _modalId: HtmlString
    private readonly _moduleId: HtmlString
    private readonly _woodId: HtmlString

    /**
     *
     * @param id - Base id (default "ship-compare")
     */
    constructor(id = "ship-compare") {
        this._baseId = id

        this._baseName = "Compare ships"
        this._buttonId = `button-${this._baseId}`
        this._modalId = `modal-${this._baseId}`
        this._moduleId = `${this._baseId}-module`
        this._copyButtonId = `button-copy-${this._baseId}`

        this.colourScaleSpeedDiff = d3ScaleLinear<string, string>()
            .range([colourRedDark, colourWhite, colourGreenDark])
            .interpolate(d3InterpolateCubehelixLong)

        this._modifierAmount = new Map()

        if (this._baseId === "ship-compare") {
            this.columnsCompare = ["C1", "C2"]
        } else {
            this.columnsCompare = []
        }

        this._columns = this.columnsCompare.slice()
        this._columns.unshift("Base")

        this.selectedShips = { Base: {} as ShipBase, C1: {} as ShipComparison, C2: {} as ShipComparison }

        this._woodId = "wood-ship"

        this._setupArrow()
        if (this._baseId !== "ship-journey") {
            this._setupListener()
        }
    }

    static _getModuleLevel(rate: number): string {
        return rate <= 3 ? "L" : rate <= 5 ? "M" : "S"
    }

    static _adjustAbsolute(currentValue: number, additionalValue: number): number {
        return currentValue ? currentValue + additionalValue : additionalValue
    }

    static _adjustPercentage(currentValue: number, additionalValue: number, isBaseValueAbsolute: boolean): number {
        if (isBaseValueAbsolute) {
            return currentValue ? currentValue * (1 + additionalValue) : additionalValue
        }

        return currentValue ? currentValue + additionalValue : additionalValue
    }

    static _getModifierFromModule(properties: ModulePropertiesEntity[]): string {
        return `<p class="mb-0">${properties
            .map((property) => {
                let amount
                if (property.isPercentage) {
                    amount = formatSignPercent(property.amount / 100)
                } else {
                    amount =
                        property.amount < 1 && property.amount > 0
                            ? formatPP(property.amount)
                            : formatSignInt(property.amount)
                }

                return `${property.modifier} ${amount}`
            })
            .join("<br>")}</p>`
    }

    static _setSelect(select$: JQuery, ids: number | number[]): void {
        if (ids) {
            select$.val(ids.toString)
        }

        select$.selectpicker("render")
    }

    async CompareShipsInit(): Promise<void> {
        await this._loadAndSetupData()
        this._initData()
        this._initSelects()
    }

    async initFromClipboard(urlParams: URLSearchParams): Promise<void> {
        await this._loadAndSetupData()
        const shipAndWoodsIds = hashids.decode(urlParams.get("cmp") ?? "") as number[]
        if (shipAndWoodsIds.length > 0) {
            this._shipCompareSelected()
            this._setShipAndWoodsSelects(shipAndWoodsIds)
            this._setModuleSelects(urlParams)
        }
    }

    _setupArrow(): void {
        // Get current arrow
        const arrow = document.querySelector("#journey-arrow") as SVGMarkerElement
        // Clone arrow and change properties
        const arrowNew = arrow.cloneNode(true) as SVGMarkerElement
        arrowNew.id = "wind-profile-arrow-head"
        if (arrowNew.hasChildNodes()) {
            for (const child of arrowNew.childNodes) {
                ;(child as SVGPathElement).classList.replace("journey-arrow-head", "wind-profile-arrow-head")
            }
        }

        // Insert new arrow
        const defs = document.querySelector("#na-map svg defs") as SVGDefsElement
        defs.append(arrowNew)
    }

    _setupData(): void {
        this._moduleAndWoodChanges = new Map<string, Property>([
            // ["Sail damage", [  ]],
            // ["Sail health", [  ]],
            ["Acceleration", { properties: ["ship.acceleration"], isBaseValueAbsolute: true }],
            [
                "Armor thickness",
                { properties: ["sides.thickness", "bow.thickness", "stern.thickness"], isBaseValueAbsolute: true },
            ],
            ["Armour repair amount (perk)", { properties: ["repairAmount.armourPerk"], isBaseValueAbsolute: true }],
            ["Armour repair amount", { properties: ["repairAmount.armour"], isBaseValueAbsolute: true }],
            [
                "Armour hit points",
                { properties: ["bow.armour", "sides.armour", "stern.armour"], isBaseValueAbsolute: true },
            ],
            ["Back armour thickness", { properties: ["stern.thickness"], isBaseValueAbsolute: true }],
            ["Splinter resistance", { properties: ["resistance.splinter"], isBaseValueAbsolute: false }],
            ["Crew", { properties: ["crew.max"], isBaseValueAbsolute: true }],
            ["Fire resistance", { properties: ["resistance.fire"], isBaseValueAbsolute: false }],
            ["Front armour thickness", { properties: ["bow.thickness"], isBaseValueAbsolute: true }],
            ["Hold weight", { properties: ["maxWeight"], isBaseValueAbsolute: true }],
            ["Hull hit points", { properties: ["structure.armour"], isBaseValueAbsolute: true }],
            ["Leak resistance", { properties: ["resistance.leaks"], isBaseValueAbsolute: false }],
            [
                "Mast health",
                { properties: ["mast.bottomArmour", "mast.middleArmour", "mast.topArmour"], isBaseValueAbsolute: true },
            ],
            [
                "Mast thickness",
                {
                    properties: ["mast.bottomThickness", "mast.middleThickness", "mast.topThickness"],
                    isBaseValueAbsolute: true,
                },
            ],
            ["Rudder health", { properties: ["rudder.armour"], isBaseValueAbsolute: true }],
            ["Rudder repair time", { properties: ["repairTime.rudder"], isBaseValueAbsolute: true }],
            ["Rudder speed", { properties: ["rudder.halfturnTime"], isBaseValueAbsolute: true }],
            ["Sail repair amount (perk)", { properties: ["repairAmount.sailsPerk"], isBaseValueAbsolute: true }],
            ["Sail repair amount", { properties: ["repairAmount.sails"], isBaseValueAbsolute: true }],
            ["Sail repair time", { properties: ["repairTime.sails"], isBaseValueAbsolute: true }],
            ["Sailing crew", { properties: ["crew.sailing"], isBaseValueAbsolute: true }],
            ["Max speed", { properties: ["speed.max"], isBaseValueAbsolute: true }],
            ["Side armour repair time", { properties: ["repairTime.sides"], isBaseValueAbsolute: true }],
            ["Speed decrease", { properties: ["ship.deceleration"], isBaseValueAbsolute: true }],
            ["Turn rate", { properties: ["rudder.turnSpeed"], isBaseValueAbsolute: true }],
            ["Water pump health", { properties: ["pump.armour"], isBaseValueAbsolute: true }],
            ["Water repair time", { properties: ["repairTime.pump"], isBaseValueAbsolute: true }],
        ])

        this._moduleAndWoodCaps = new Map<string, PropertyWithCap>([
            [
                "Armor thickness",
                {
                    properties: ["sides.thickness", "bow.thickness", "stern.thickness"],
                    cap: { amount: 0.4, isPercentage: true },
                },
            ],
            [
                "Armour hit points",
                {
                    properties: ["bow.armour", "sides.armour", "stern.armour"],
                    cap: { amount: 0.4, isPercentage: true },
                },
            ],
            ["Structure hit points", { properties: ["structure.armour"], cap: { amount: 0.4, isPercentage: true } }],
            [
                "Mast health",
                {
                    properties: ["mast.bottomArmour", "mast.middleArmour", "mast.topArmour"],
                    cap: { amount: 0.3, isPercentage: true },
                },
            ],
            [
                "Mast thickness",
                {
                    properties: ["mast.bottomThickness", "mast.middleThickness", "mast.topThickness"],
                    cap: { amount: 0.3, isPercentage: true },
                },
            ],
            ["Max speed", { properties: ["speed.max"], cap: { amount: 16, isPercentage: false } }],
            ["Turn rate", { properties: ["rudder.turnSpeed"], cap: { amount: 0.25, isPercentage: true } }],
        ])

        const theoreticalMinSpeed = (d3Min(this._shipData, (ship) => ship.speed.min) ?? 0) * 1.2
        const theoreticalMaxSpeed = this._moduleAndWoodCaps.get("Max speed")!.cap.amount

        this._minSpeed = theoreticalMinSpeed
        this._maxSpeed = theoreticalMaxSpeed
        this.colorScale = d3ScaleLinear<string, string>()
            .domain([this._minSpeed, 0, this._maxSpeed])
            .range([colourRedDark, colourWhite, colourGreenDark])
            .interpolate(d3InterpolateCubehelixLong)

        const minShipMass = d3Min(this._shipData, (ship) => ship.shipMass) ?? 0
        const maxShipMass = d3Max(this._shipData, (ship) => ship.shipMass) ?? 0
        this.shipMassScale = d3ScaleLinear<number, number>().domain([minShipMass, maxShipMass]).range([100, 150])
    }

    async _loadAndSetupData(): Promise<void> {
        try {
            this._moduleDataDefault = (
                await import(/* webpackChunkName: "data-modules" */ "Lib/gen-generic/modules.json")
            ).default as Module[]
            this._shipData = (await import(/* webpackChunkName: "data-ships" */ "Lib/gen-generic/ships.json"))
                .default as ShipData[]
            this._setupData()
            if (this._baseId !== "ship-journey") {
                this.woodCompare = new CompareWoods(this._woodId)
                await this.woodCompare.woodInit()
            }
        } catch (error) {
            putImportError(error)
        }
    }

    /**
     * Setup menu item listener
     */
    _setupListener(): void {
        let firstClick = true

        document.querySelector(`#${this._buttonId}`)?.addEventListener("click", async (event) => {
            if (firstClick) {
                firstClick = false
                await this._loadAndSetupData()
            }

            registerEvent("Tools", this._baseName)
            event.stopPropagation()
            this._shipCompareSelected()
        })
    }

    /**
     * Set graphics parameter
     */
    _setGraphicsParameters(): void {
        this.svgWidth = $(`#${this._modalId} .column-base`).width() ?? 0
        // noinspection JSSuspiciousNameCombination
        this.svgHeight = this.svgWidth
        this.outerRadius = Math.floor(Math.min(this.svgWidth, this.svgHeight) / 2)
        this.innerRadius = Math.floor(this.outerRadius * 0.3)
        this.radiusSpeedScale = d3ScaleLinear<number, number>()
            .domain([this._minSpeed, 0, this._maxSpeed])
            .range([10, this.innerRadius, this.outerRadius])
    }

    /**
     * Action when selected
     */
    _shipCompareSelected(): void {
        // If the modal has no content yet, insert it
        if (isEmpty(this._modal$)) {
            this._initModal()
            this._modal$ = $(`#${this._modalId}`)

            // Copy data to clipboard (ctrl-c key event)
            document.querySelector(`#${this._modalId}`)?.addEventListener("keydown", (event: Event): void => {
                if ((event as KeyboardEvent).key === "KeyC" && (event as KeyboardEvent).ctrlKey) {
                    this._copyDataClicked(event)
                }
            })
            // Copy data to clipboard (click event)
            document.querySelector(`#${this._copyButtonId}`)?.addEventListener("click", (event) => {
                this._copyDataClicked(event)
            })
        }

        // Show modal
        this._modal$.modal("show")
        this._setGraphicsParameters()
    }

    _getShipAndWoodIds(): number[] {
        const data: number[] = []

        for (const columnId of this._columns) {
            if (this._shipIds[columnId] !== undefined) {
                data.push(...((this._shipIds[columnId] as unknown) as number[]))
                for (const type of ["frame", "trim"]) {
                    data.push(Number(this._selectWood$[columnId][type].val()))
                }
            }
        }

        return data
    }

    _copyDataClicked(event: Event): void {
        registerEvent("Menu", "Copy ship compare")
        event.preventDefault()

        const ShipAndWoodIds = this._getShipAndWoodIds()

        if (ShipAndWoodIds.length > 0) {
            const ShipCompareUrl = new URL(window.location.href)

            // Add app version
            ShipCompareUrl.searchParams.set("v", encodeURIComponent(appVersion))
            // Add selected ships and woods, triple (shipId, frameId, trimId) per column, flat array
            ShipCompareUrl.searchParams.set("cmp", hashids.encode(ShipAndWoodIds))

            // Add selected modules, new searchParam per module
            for (const columnId of this._columns) {
                const columnIndex = this._columns.indexOf(columnId)
                if (this._selectedUpgradeIdsPerType[columnId]) {
                    for (const type of [...this._moduleTypes]) {
                        const typeIndex = [...this._moduleTypes].indexOf(type)
                        const moduleIds = this._selectedUpgradeIdsPerType[columnId][type]

                        if (moduleIds?.length) {
                            const param = `${columnIndex}${typeIndex}`

                            ShipCompareUrl.searchParams.set(param, hashids.encode(moduleIds))
                        }
                    }
                }
            }

            copyToClipboard(ShipCompareUrl.href, this._modal$)
        }
    }

    /**
     * Setup ship data (group by class)
     */
    _setupShipData(): void {
        this._shipSelectData = d3Nest<ShipSelectData>()
            .key((ship) => String(ship.class))
            .sortKeys(d3Ascending)
            .entries(
                this._shipData
                    .map(
                        (ship) =>
                            ({
                                id: ship.id,
                                name: ship.name,
                                class: ship.class,
                                battleRating: ship.battleRating,
                                guns: ship.guns,
                            } as ShipSelectData)
                    )
                    .sort(sortBy(["name"]))
            )
    }

    /**
     * Setup module data
     */
    _setupModuleData(): void {
        // Get all modules where change modifier (moduleChanges) exists
        this._moduleProperties = new Map(
            this._moduleDataDefault.flatMap((type) =>
                type[1]
                    .filter((module) =>
                        module.properties.some((property) => {
                            return this._moduleAndWoodChanges.has(property.modifier)
                        })
                    )
                    .map((module) => [module.id, module])
            )
        )

        // Get types from moduleProperties list
        this._moduleTypes = new Set<ModuleType>(
            [...this._moduleProperties].map((module) => module[1].type.replace(/\s\u2013\s[\s/A-Za-z\u25CB]+/, ""))
        )
    }

    /**
     * Inject modal
     */
    _injectModal(): void {
        insertBaseModal({ id: this._modalId, title: this._baseName })

        const row = d3Select(`#${this._modalId} .modal-body`)
            .append("div")
            .attr("class", "container-fluid")
            .append("div")
            .attr("class", "row")

        for (const columnId of this._columns) {
            const div = row
                .append("div")
                .attr("class", `col-md-4 ml-auto pt-2 ${columnId === "Base" ? "column-base" : "column-comp"}`)

            const shipSelectId = this._getShipSelectId(columnId)
            div.append("label")
                .append("select")
                .attr("name", shipSelectId)
                .attr("id", shipSelectId)
                .attr("class", "selectpicker")
            for (const type of ["frame", "trim"]) {
                const woodId = this._getWoodSelectId(type, columnId)
                div.append("label")
                    .append("select")
                    .attr("name", woodId)
                    .attr("id", woodId)
                    .attr("class", "selectpicker")
            }

            for (const type of this._moduleTypes) {
                const moduleId = this._getModuleSelectId(type, columnId)
                div.append("label")
                    .append("select")
                    .attr("name", moduleId)
                    .attr("id", moduleId)
                    .property("multiple", true)
                    .attr("class", "selectpicker")
            }

            div.append("div")
                .attr("id", `${this._baseId}-${columnId}`)
                .attr("class", `${columnId === "Base" ? "ship-base" : "ship-compare"}`)
        }

        const footer = d3Select(`#${this._modalId} .modal-footer`)
        footer
            .insert("button", "button")
            .classed("btn btn-outline-secondary icon-outline-button", true)
            .attr("id", this._copyButtonId)
            .attr("title", "Copy to clipboard (ctrl-c)")
            .attr("type", "button")
            .append("i")
            .classed("icon icon-copy", true)
    }

    _initData(): void {
        this._setupShipData()
        this._setupModuleData()
    }

    _initSelectColumns(): void {
        for (const columnId of this._columns) {
            this._setupShipSelect(columnId)
            if (this._baseId !== "ship-journey") {
                this._selectWood$[columnId] = {}
                for (const type of ["frame", "trim"]) {
                    this._selectWood$[columnId][type] = $(`#${this._getWoodSelectId(type, columnId)}`)
                    this.woodCompare._setupWoodSelects(
                        columnId as WoodColumnType,
                        type as WoodType,
                        this._selectWood$[columnId][type]
                    )
                }
            }

            this._setupSelectListener(columnId)
        }
    }

    _initSelects(): void {
        this._initSelectColumns()
    }

    /**
     * Init modal
     */
    _initModal(): void {
        this._initData()
        this._injectModal()
        this._initSelects()
    }

    /**
     * Get select options
     */
    _getShipOptions(): HtmlString {
        return this._shipSelectData
            .map(
                (key) =>
                    `<optgroup label="${getOrdinal(Number(key.key), false)} rate">${key.values
                        .map(
                            (ship) =>
                                `<option data-subtext="${ship.battleRating}" value="${ship.id}">${ship.name} (${ship.guns})`
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
        this._selectShip$[columnId] = $(`#${this._getShipSelectId(columnId)}`)
        const options = this._getShipOptions()
        this._selectShip$[columnId].append(options)
        if (columnId !== "Base") {
            this._selectShip$[columnId].attr("disabled", "disabled")
        }
    }

    /**
     * Get select options
     * @param moduleType - Module type
     * @param shipClass - Ship class
     * @returns HTML formatted option
     */
    _getUpgradesOptions(moduleType: string, shipClass: number): string {
        // Nest module data by sub type (e.g. "Gunnery")
        const modules = d3Nest<[number, ModuleEntity]>()
            .key((module) => module[1].type.replace(/[\sA-Za-z]+\s–\s/, ""))
            .sortKeys(d3Ascending)
            .sortValues((a, b) => a[1].name.localeCompare(b[1].name))
            .entries(
                [...this._moduleProperties].filter(
                    (module) =>
                        module[1].type.replace(/\s–\s[\s/A-Za-z\u25CB]+/, "") === moduleType &&
                        (module[1].moduleLevel === "U" ||
                            module[1].moduleLevel === CompareShips._getModuleLevel(shipClass))
                )
            )

        let options = ""
        const moduleTypeWithSingleOption = new Set(["Permanent", "Ship trim"])
        if (modules.length > 1) {
            // Get options with sub types as optgroups
            options = modules
                .map(
                    (group) =>
                        `<optgroup label="${group.key}" data-max-options="${
                            moduleTypeWithSingleOption.has(moduleType.replace(/[\sA-Za-z]+\s–\s/, "")) ? 1 : 5
                        }">${
                            group.values
                                .map(
                                    (module: [number, ModuleEntity]) => `<option value="${module[0]}">${module[1].name}`
                                )
                                .join("</option>") as string
                        }`
                )
                .join("</optgroup>")
        } else {
            // Get options without optgroups
            options = modules
                .map(
                    (group) =>
                        `${
                            group.values
                                .map(
                                    (module: [number, ModuleEntity]) => `<option value="${module[0]}">${module[1].name}`
                                )
                                .join("</option>") as string
                        }`
                )
                .join("")
        }

        return options
    }

    _fillModuleSelect(columnId: ShipColumnType, type: string): void {
        const getShipClass = (): number => this._shipData.find((ship) => ship.id === this._shipIds[columnId])!.class

        const options = this._getUpgradesOptions(type, getShipClass())

        this._selectModule$[columnId][type].find("option").remove()
        this._selectModule$[columnId][type].append(options)
    }

    _resetModuleSelects(columnId: ShipColumnType): void {
        for (const type of this._moduleTypes) {
            this._fillModuleSelect(columnId, type)
            this._selectModule$[columnId][type].selectpicker("refresh")
        }
    }

    _getModuleFromName(moduleName: string): ModuleEntity {
        let module = {} as ModuleEntity | undefined

        this._moduleDataDefault.some((type) => {
            module = type[1].find((module) => module.name === moduleName)
            return Boolean(module)
        })

        return module as ModuleEntity
    }

    /**
     * Setup upgrades select
     * @param columnId - Column id
     */
    _setupModulesSelect(columnId: ShipColumnType): void {
        if (!this._selectModule$[columnId]) {
            this._selectModule$[columnId] = {}

            for (const type of this._moduleTypes) {
                this._selectModule$[columnId][type] = $(`#${this._getModuleSelectId(type, columnId)}`)

                this._selectModule$[columnId][type]
                    .on("changed.bs.select", () => {
                        this._modulesSelected(columnId)
                        this._refreshShips(columnId)
                    })
                    .on("show.bs.select", (event: Event) => {
                        const $el = $(event.currentTarget as HTMLSelectElement)

                        // Remove 'select all' button
                        $el.parent().find("button.bs-select-all").remove()
                    })
                    .on("show.bs.select", (event: Event) => {
                        const $el = $(event.currentTarget as HTMLSelectElement)

                        // Add tooltip
                        for (const element of $el.data("selectpicker").selectpicker.current.elements) {
                            if (
                                !(
                                    element.classList.contains("dropdown-divider") ||
                                    element.classList.contains("dropdown-header")
                                )
                            ) {
                                const module = this._getModuleFromName(element.textContent)

                                // Add tooltip with module properties
                                $(element)
                                    .attr("data-original-title", CompareShips._getModifierFromModule(module.properties))
                                    .tooltip({ boundary: "viewport", html: true })
                            }
                        }
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
            }
        }

        this._resetModuleSelects(columnId)
    }

    /**
     * Get ship data for ship with id <id>
     * @param columnId - Column id
     * @returns Ship data
     */
    _getShipData(columnId: ShipColumnType): ShipData {
        const shipDataDefault = this._shipData.find((ship) => ship.id === this._shipIds[columnId])!
        let shipDataUpdated = shipDataDefault

        shipDataUpdated.repairAmount = {
            armour: hullRepairsPercent,
            armourPerk: 0,
            sails: rigRepairsPercent,
            sailsPerk: 0,
        }
        shipDataUpdated.repairTime = { sides: repairTime, default: repairTime } as ShipRepairTime
        shipDataUpdated.resistance = {
            fire: 0,
            leaks: 0,
            splinter: 0,
        }

        shipDataUpdated = this._addModulesAndWoodData(shipDataDefault, shipDataUpdated, columnId)

        return shipDataUpdated
    }

    _adjustValue(value: number, key: string, isBaseValueAbsolute: boolean): number {
        let adjustedValue = value

        if (this._modifierAmount.get(key)?.absolute) {
            const { absolute } = this._modifierAmount.get(key)!
            adjustedValue = CompareShips._adjustAbsolute(adjustedValue, absolute)
        }

        if (this._modifierAmount.get(key)?.percentage) {
            const percentage = this._modifierAmount.get(key)!.percentage / 100
            adjustedValue = CompareShips._adjustPercentage(adjustedValue, percentage, isBaseValueAbsolute)
        }

        return Math.trunc(adjustedValue * 100) / 100
    }

    _setModifier(property: ModulePropertiesEntity): void {
        let absolute = property.isPercentage ? 0 : property.amount
        let percentage = property.isPercentage ? property.amount : 0

        // If modifier has been in the Map add the amount
        if (this._modifierAmount.has(property.modifier)) {
            absolute += this._modifierAmount.get(property.modifier)?.absolute ?? 0
            percentage += this._modifierAmount.get(property.modifier)?.percentage ?? 0
        }

        this._modifierAmount.set(property.modifier, {
            absolute,
            percentage,
        })
    }

    _showCappingAdvice(compareId: ShipColumnType, modifiers: Set<string>): void {
        const id = `${this._baseId}-${compareId}-capping`
        let div = document.querySelector(`#${id}`)

        if (!div) {
            div = document.createElement("p")
            div.id = id
            div.className = "alert alert-warning"
            const element = document.querySelector(`#${this._baseId}-${compareId}`)
            element?.firstChild?.after(div)
        }

        // noinspection InnerHTMLJS
        div.innerHTML = `${[...modifiers].join(", ")} capped`
    }

    _removeCappingAdvice(compareId: ShipColumnType): void {
        const id = `${this._baseId}-${compareId}-capping`
        const div = document.querySelector(`#${id}`)

        if (div) {
            div.remove()
        }
    }

    /**
     * Add upgrade changes to ship data
     * @param shipDataBase - Base ship data
     * @param shipDataUpdated - Updated ship data
     * @param compareId - Column id
     * @returns Updated ship data
     */
    _addModulesAndWoodData(shipDataBase: ShipData, shipDataUpdated: ShipData, compareId: ShipColumnType): ShipData {
        const data = JSON.parse(JSON.stringify(shipDataUpdated)) as ShipData

        const setModifierAmounts = (): void => {
            for (const id of this._selectedUpgradeIdsList[compareId]) {
                const module = this._moduleProperties.get(id)!

                for (const property of module.properties) {
                    if (this._moduleAndWoodChanges.has(property.modifier)) {
                        this._setModifier(property)
                    }
                }
            }

            if (this.woodCompare.instances[compareId]) {
                let dataLink = "_woodData"
                if (compareId !== "Base") {
                    dataLink = "_compareData"
                }

                // Add modifier amount for both frame and trim
                for (const type of ["frame", "trim"]) {
                    // @ts-ignore
                    for (const property of this.woodCompare.instances[compareId][dataLink][type].properties) {
                        if (this._moduleAndWoodChanges.has(property.modifier)) {
                            this._setModifier(property)
                        }
                    }
                }
            }
        }

        const adjustDataByModifiers = (): void => {
            for (const [key] of this._modifierAmount.entries()) {
                if (this._moduleAndWoodChanges.get(key)?.properties) {
                    const { properties, isBaseValueAbsolute } = this._moduleAndWoodChanges.get(key)!
                    for (const modifier of properties) {
                        const index = modifier.split(".")
                        if (index.length > 1) {
                            data[index[0]][index[1]] = this._adjustValue(
                                data[index[0]][index[1]],
                                key,
                                isBaseValueAbsolute
                            )
                        } else {
                            data[index[0]] = this._adjustValue(data[index[0]], key, isBaseValueAbsolute)
                        }
                    }
                }
            }
        }

        const adjustDataByCaps = (): void => {
            const valueCapped = { isCapped: false, modifiers: new Set<string>() }

            const adjustValue = (
                modifier: string,
                uncappedValue: number,
                baseValue: number,
                { amount: capAmount, isPercentage }: Amount
            ): number => {
                const valueRespectingCap = Math.min(
                    uncappedValue,
                    isPercentage ? baseValue * (1 + capAmount) : capAmount
                )
                if (uncappedValue !== valueRespectingCap) {
                    valueCapped.isCapped = true
                    valueCapped.modifiers.add(modifier)
                }

                return valueRespectingCap
            }

            for (const [modifier] of this._modifierAmount.entries()) {
                if (this._moduleAndWoodCaps.has(modifier)) {
                    const { cap } = this._moduleAndWoodCaps.get(modifier)!
                    for (const property of this._moduleAndWoodCaps.get(modifier)!.properties) {
                        const index = property.split(".")
                        if (index.length > 1) {
                            // eslint-disable-next-line max-depth
                            if (data[index[0]][index[1]]) {
                                data[index[0]][index[1]] = adjustValue(
                                    modifier,
                                    data[index[0]][index[1]],
                                    shipDataBase[index[0]][index[1]],
                                    cap
                                )
                            }
                        } else if (data[index[0]]) {
                            data[index[0]] = adjustValue(modifier, data[index[0]], shipDataBase[index[0]], cap)
                        }
                    }
                }
            }

            if (valueCapped.isCapped) {
                this._showCappingAdvice(compareId, valueCapped.modifiers)
            } else {
                this._removeCappingAdvice(compareId)
            }
        }

        const setSpeedDegrees = (): void => {
            data.speedDegrees = data.speedDegrees.map((speed: number) => {
                const factor = 1 + this._modifierAmount.get("Max speed")!.percentage / 100
                const newSpeed = speed > 0 ? speed * factor : speed / factor
                // Correct speed by caps
                return Math.max(Math.min(newSpeed, this._maxSpeed), this._minSpeed)
            })
        }

        this._modifierAmount = new Map()
        setModifierAmounts()
        adjustDataByModifiers()
        adjustDataByCaps()
        if (this._modifierAmount.has("Max speed")) {
            setSpeedDegrees()
        }

        return data
    }

    _updateDifferenceProfileNeeded(id: ShipColumnType): void {
        if (id !== "Base" && !isEmpty(this.selectedShips[id])) {
            ;(this.selectedShips[id] as ShipComparison).updateDifferenceProfile()
        }
    }

    /**
     * Update sailing profile for compared ship
     * @param compareId - Column id
     */
    _updateSailingProfile(compareId: ShipColumnType): void {
        // Update recent changes first
        this._updateDifferenceProfileNeeded(compareId)
        // Then update the rest of columns

        for (const otherCompareId of this.columnsCompare) {
            if (otherCompareId !== compareId) {
                this._updateDifferenceProfileNeeded(otherCompareId)
            }
        }
    }

    /**
     * Refresh ship data
     * @param compareId - Column id
     */
    _refreshShips(compareId: ShipColumnType): void {
        if (this._baseId === "ship-journey") {
            this.singleShipData = this._shipData.find((ship) => ship.id === this._shipIds[compareId])!
        } else {
            this._modulesSelected(compareId)
            const singleShipData = this._getShipData(compareId)
            if (compareId === "Base") {
                this._setSelectedShip(compareId, new ShipBase(compareId, singleShipData, this))
                for (const otherCompareId of this.columnsCompare) {
                    this._selectShip$[otherCompareId].removeAttr("disabled").selectpicker("refresh")
                    if (!isEmpty(this.selectedShips[otherCompareId])) {
                        this._setSelectedShip(
                            otherCompareId,
                            new ShipComparison(
                                otherCompareId as string,
                                singleShipData,
                                (this.selectedShips[otherCompareId] as ShipComparison).shipCompareData,
                                this
                            )
                        )
                    }
                }
            } else {
                this._setSelectedShip(
                    compareId,
                    new ShipComparison(
                        compareId as string,
                        (this.selectedShips.Base as ShipBase).shipData,
                        singleShipData,
                        this
                    )
                )
            }

            this._updateSailingProfile(compareId)
        }
    }

    /**
     * Enable compare selects
     */
    _enableCompareSelects(): void {
        for (const compareId of this.columnsCompare) {
            this._selectShip$[compareId].removeAttr("disabled").selectpicker("refresh")
        }
    }

    _modulesSelected(compareId: ShipColumnType): void {
        this._selectedUpgradeIdsList[compareId] = []
        this._selectedUpgradeIdsPerType[compareId] = {} as ArrayIndex<number>

        for (const type of this._moduleTypes) {
            // @ts-ignore
            this._selectedUpgradeIdsPerType[compareId][type] = this._selectModule$[compareId][type].val()
            // @ts-ignore
            if (Array.isArray(this._selectedUpgradeIdsPerType[compareId][type])) {
                // Multiple selects
                this._selectedUpgradeIdsPerType[compareId][type] = this._selectedUpgradeIdsPerType[compareId][type].map(
                    Number
                )
            } else {
                // Single select
                this._selectedUpgradeIdsPerType[compareId][type] = this._selectedUpgradeIdsPerType[compareId][type]
                    ? [Number(this._selectedUpgradeIdsPerType[compareId][type])]
                    : []
            }

            if (this._selectedUpgradeIdsPerType[compareId][type].length > 0) {
                this._selectedUpgradeIdsList[compareId] = this._selectedUpgradeIdsList[compareId].concat(
                    this._selectedUpgradeIdsPerType[compareId][type]
                )
            }
            // console.log("_modulesSelected", compareId, type, this._selectedUpgradeIdsPerType[compareId][type]);
        }
    }

    /**
     * Listener for the select
     * @param compareId - Column id
     */
    _setupSelectListener(compareId: ShipColumnType): void {
        this._selectShip$[compareId].selectpicker({ title: "Ship" }).on("changed.bs.select", () => {
            this._shipIds[compareId] = Number(this._selectShip$[compareId].val())
            if (this._baseId !== "ship-journey") {
                this._setupModulesSelect(compareId)
            }

            this._refreshShips(compareId)
            if (compareId === "Base" && this._baseId !== "ship-journey") {
                this._enableCompareSelects()
            }

            if (this._baseId !== "ship-journey") {
                this.woodCompare.enableSelects(compareId as WoodColumnType)
            }
        })
        if (this._baseId !== "ship-journey") {
            for (const type of ["frame", "trim"]) {
                this._selectWood$[compareId][type]
                    .on("changed.bs.select", () => {
                        this.woodCompare._woodSelected(
                            compareId as WoodColumnType,
                            type as WoodType,
                            this._selectWood$[compareId][type]
                        )
                        this._refreshShips(compareId)
                    })
                    .selectpicker({ title: `Wood ${type}`, width: "150px" })
            }
        }
    }

    _setShipAndWoodsSelects(ids: number[]): void {
        let i = 0

        this._columns.some((columnId) => {
            if (!this._shipData.find((ship) => ship.id === ids[i])) {
                return false
            }

            this._shipIds[columnId] = ids[i]
            i += 1
            CompareShips._setSelect(this._selectShip$[columnId], (this._shipIds[columnId] as unknown) as number[])
            if (columnId === "Base" && this._baseId !== "ship-journey") {
                this._enableCompareSelects()
            }

            this.woodCompare.enableSelects(columnId as WoodColumnType)
            this._setupModulesSelect(columnId)

            if (ids[i]) {
                for (const type of ["frame", "trim"]) {
                    CompareShips._setSelect(this._selectWood$[columnId][type], ids[i])
                    i += 1

                    this.woodCompare._woodSelected(
                        columnId as WoodColumnType,
                        type as WoodType,
                        this._selectWood$[columnId][type]
                    )
                }
            } else {
                i += 2
            }

            this._refreshShips(columnId)
            return i >= ids.length
        })
    }

    /**
     * Get selected modules, new searchParam per module
     */
    _setModuleSelects(urlParams: URLSearchParams): void {
        for (const columnId of this._columns) {
            const columnIndex = this._columns.indexOf(columnId)
            let needRefresh = false
            for (const type of [...this._moduleTypes]) {
                const typeIndex = [...this._moduleTypes].indexOf(type)
                if (urlParams.has(`${columnIndex}${typeIndex}`)) {
                    const moduleIds = hashids.decode(urlParams.get(`${columnIndex}${typeIndex}`)!)
                    if (!this._selectedUpgradeIdsPerType[columnId]) {
                        this._selectedUpgradeIdsPerType[columnId] = {} as ArrayIndex<number>
                    }

                    if (!this._selectedUpgradeIdsList[columnId]) {
                        this._selectedUpgradeIdsList[columnId] = []
                    }

                    // console.log("moduleIds", { columnId }, { type }, { moduleIds });

                    this._selectedUpgradeIdsPerType[columnId][type] = moduleIds.map(Number)
                    CompareShips._setSelect(
                        this._selectModule$[columnId][type],
                        this._selectedUpgradeIdsPerType[columnId][type]
                    )
                    this._selectedUpgradeIdsList[columnId].push(...this._selectedUpgradeIdsPerType[columnId][type])
                    needRefresh = true
                }
            }

            if (needRefresh) {
                this._refreshShips(columnId)
            }
        }
    }

    _getShipSelectId(columnId: ShipColumnType): HtmlString {
        return `${this._baseId}-${columnId}-select`
    }

    _getWoodSelectId(type: string, columnId: ShipColumnType): HtmlString {
        return `${this._woodId}-${type}-${columnId}-select`
    }

    _getModuleSelectId(type: string, columnId: ShipColumnType): HtmlString {
        return `${this._moduleId}-${type.replace(/\s/, "")}-${columnId}-select`
    }

    _setSelectedShip(columnId: ShipColumnType, ship: ShipBase | ShipComparison): void {
        this.selectedShips[columnId] = ship
    }
}
