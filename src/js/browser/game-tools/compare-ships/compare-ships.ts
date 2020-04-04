/*!
 * This file is part of na-map.
 *
 * @file      Compare ships file.
 * @module    game-tools/compare-ships/compare-ships
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { InterpolatorFactory, ScaleLinear, scaleLinear as d3ScaleLinear } from "d3-scale"
import { interpolateCubehelixLong as d3InterpolateCubehelixLong } from "d3-interpolate"
import { ascending as d3Ascending, max as d3Max, min as d3Min } from "d3-array"
import { registerEvent } from "../../analytics"
import { copyToClipboard } from "../../util"
import { nest as d3Nest } from "d3-collection"
import { select as d3Select } from "d3-selection"
import { formatPP, formatSignInt, formatSignPercent } from "../../../common/common-format"
import { getOrdinal } from "../../../common/common-math"
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
import { isEmpty, putImportError } from "../../../common/common"
import { ShipBase } from "./ship-base"
import { ShipComparison } from "./ship-comparison"
import { sortBy } from "../../../common/common-node"

interface Property {
    properties: string[]
    isBaseValueAbsolute: boolean
}

interface Amount {
    amount: number
    isPercentage: boolean
}

interface PropertyWithCap {
    properties: string[]
    cap: Amount
}

export class CompareShips {
    private readonly _baseId: string
    private readonly _baseName: string
    private readonly _buttonId: HtmlString
    private readonly _modalId: HtmlString
    private readonly _moduleId: HtmlString
    private readonly _copyButtonId: HtmlString
    private readonly colourScaleSpeedDiff: ScaleLinear<string, string>
    private _shipIds: number[]
    private _selectedUpgradeIdsPerType: number[]
    private _selectedUpgradeIdsList: number[]
    private readonly _columnsCompare: string[]
    private readonly _columns: string[]
    private readonly _woodId: HtmlString
    private _moduleAndWoodChanges!: Map<string, Property>
    private _moduleAndWoodCaps!: Map<string, PropertyWithCap>
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

        this._shipIds = []
        this._selectedUpgradeIdsPerType = []
        this._selectedUpgradeIdsList = []
        this._selectShip$ = {}
        this._selectWood$ = {}
        this._selectModule$ = {}
        this._modal$ = null
        this._modifierAmount = new Map()

        if (this._baseId === "ship-compare") {
            this._columnsCompare = ["C1", "C2"]
        } else {
            this._columnsCompare = []
        }

        this._columns = this._columnsCompare.slice()
        this._columns.unshift("Base")

        this._selectedShips = { Base: {}, C1: {}, C2: {} }

        this._woodId = "wood-ship"

        this._setupArrow()
        if (this._baseId !== "ship-journey") {
            this._setupListener()
        }
    }

    _setupArrow() {
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

    async CompareShipsInit() {
        await this._loadAndSetupData()
        this._initData()
        this._initSelects()
    }

    _setupData() {
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

        const theoreticalMinSpeed = d3Min<number>(this._shipData, (ship):number => ship.speed.min) * 1.2
        const theoreticalMaxSpeed = this._moduleAndWoodCaps.get("Max speed")!.cap.amount

        this._minSpeed = theoreticalMinSpeed
        this._maxSpeed = theoreticalMaxSpeed
        this._colorScale = d3ScaleLinear()
            .domain([this._minSpeed, 0, this._maxSpeed])
            .range([colourRedDark, colourWhite, colourGreenDark])
            .interpolate(d3InterpolateCubehelixLong)

        const minShipMass = d3Min(this._shipData, (ship) => ship.shipMass)
        const maxShipMass = d3Max(this._shipData, (ship) => ship.shipMass)
        this.shipMassScale = d3ScaleLinear().domain([minShipMass, maxShipMass]).range([100, 150])
    }

    async _loadAndSetupData() {
        try {
            this._moduleDataDefault = (
                await import(/* webpackChunkName: "data-modules" */ "~Lib/gen-generic/modules.json")
            ).default
            this._shipData = (await import(/* webpackChunkName: "data-ships" */ "~Lib/gen-generic/ships.json")).default
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
     * @returns {void}
     */
    _setupListener() {
        let firstClick = true

        document.getElementById(this._buttonId).addEventListener("click", async (event) => {
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
     * @returns {void}
     */
    _setGraphicsParameters() {
        this.svgWidth = Number.parseInt($(`#${this._modalId} .column-base`).width(), 10)
        // noinspection JSSuspiciousNameCombination
        this.svgHeight = this.svgWidth
        this.outerRadius = Math.floor(Math.min(this.svgWidth, this.svgHeight) / 2)
        this.innerRadius = Math.floor(this.outerRadius * 0.3)
        this.radiusSpeedScale = d3ScaleLinear()
            .domain([this.minSpeed, 0, this.maxSpeed])
            .range([10, this.innerRadius, this.outerRadius])
    }

    /**
     * Action when selected
     * @returns {Promise}
     */
    _shipCompareSelected() {
        // If the modal has no content yet, insert it
        if (!this._modal$) {
            this._initModal()
            this._modal$ = $(`#${this._modalId}`)

            // Copy data to clipboard (ctrl-c key event)
            this._modal$.on("keydown", (event) => {
                if (event.code === "KeyC" && event.ctrlKey) {
                    this._copyDataClicked(event)
                }
            })
            // Copy data to clipboard (click event)
            document.getElementById(this._copyButtonId).addEventListener("click", (event) => {
                this._copyDataClicked(event)
            })
        }

        // Show modal
        this._modal$.modal("show")
        this._setGraphicsParameters()
    }

    _getShipAndWoodIds() {
        const data = []

        for (const columnId of this._columns) {
            if (this._shipIds[columnId] !== undefined) {
                data.push(this._shipIds[columnId])
                for (const type of ["frame", "trim"]) {
                    data.push(Number(this._selectWood$[columnId][type].val()))
                }
            }
        }

        return data
    }

    _copyDataClicked(event) {
        registerEvent("Menu", "Copy ship compare")
        event.preventDefault()

        const ShipAndWoodIds = this._getShipAndWoodIds()

        if (ShipAndWoodIds.length) {
            const ShipCompareUrl = new URL(window.location)

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
     * @returns {void}
     */
    _setupShipData() {
        this.shipSelectData = d3Nest()
            .key((ship) => ship.class)
            .sortKeys(d3Ascending)
            .entries(
                this._shipData
                    .map((ship) => ({
                        id: ship.id,
                        name: ship.name,
                        class: ship.class,
                        battleRating: ship.battleRating,
                        guns: ship.guns,
                    }))
                    .sort(sortBy(["name"]))
            )
    }

    /**
     * Setup module data
     * @returns {void}
     */
    _setupModuleData() {
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
        this._moduleTypes = new Set(
            [...this._moduleProperties].map((module) => module[1].type.replace(/\s\u2013\s[\s/A-Za-z\u25CB]+/, ""))
        )
    }

    /**
     * Inject modal
     * @returns {void}
     */
    _injectModal() {
        insertBaseModal(this._modalId, this._baseName)

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

    _initData() {
        this._setupShipData()
        this._setupModuleData()
    }

    _initSelectColumns() {
        for (const columnId of this._columns) {
            this._setupShipSelect(columnId)
            if (this._baseId !== "ship-journey") {
                this._selectWood$[columnId] = {}
                for (const type of ["frame", "trim"]) {
                    this._selectWood$[columnId][type] = $(`#${this._getWoodSelectId(type, columnId)}`)
                    this.woodCompare._setupWoodSelects(columnId, type, this._selectWood$[columnId][type])
                }
            }

            this._setupSelectListener(columnId)
        }
    }

    _initSelects() {
        this._initSelectColumns()
    }

    /**
     * Init modal
     * @returns {void}
     */
    _initModal() {
        this._initData()
        this._injectModal()
        this._initSelects()
    }

    /**
     * Get select options
     * @returns {string} HTML formatted option
     */
    _getShipOptions() {
        return this.shipSelectData
            .map(
                (key) =>
                    `<optgroup label="${getOrdinal(key.key, false)} rate">${key.values
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
     * @param {string} columnId - Column id
     * @returns {void}
     */
    _setupShipSelect(columnId) {
        this._selectShip$[columnId] = $(`#${this._getShipSelectId(columnId)}`)
        const options = this._getShipOptions()
        this._selectShip$[columnId].append(options)
        if (columnId !== "Base") {
            this._selectShip$[columnId].attr("disabled", "disabled")
        }
    }

    static _getModuleLevel(rate) {
        return rate <= 3 ? "L" : rate <= 5 ? "M" : "S"
    }

    /**
     * Get select options
     * @param {string} moduleType - Module type
     * @param {number} shipClass - Ship class
     * @returns {string} HTML formatted option
     */
    _getUpgradesOptions(moduleType, shipClass) {
        // Nest module data by sub type (e.g. "Gunnery")
        const modules = d3Nest()
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
                        }">${group.values
                            .map((module) => `<option value="${module[0]}">${module[1].name}`)
                            .join("</option>")}`
                )
                .join("</optgroup>")
        } else {
            // Get options without optgroups
            options = modules.map(
                (group) =>
                    `${group.values
                        .map((module) => `<option value="${module[0]}">${module[1].name}`)
                        .join("</option>")}`
            )
        }

        return options
    }

    _fillModuleSelect(columnId, type) {
        // eslint-disable-next-line unicorn/consistent-function-scoping
        const getShipClass = () => this._shipData.find((ship) => ship.id === this._shipIds[columnId]).class

        const options = this._getUpgradesOptions(type, getShipClass())

        this._selectModule$[columnId][type].find("option").remove()
        this._selectModule$[columnId][type].append(options)
    }

    _resetModuleSelects(columnId) {
        for (const type of this._moduleTypes) {
            this._fillModuleSelect(columnId, type)
            this._selectModule$[columnId][type].selectpicker("refresh")
        }
    }

    _getModuleFromName(moduleName) {
        let module = {}

        this._moduleDataDefault.some((type) => {
            module = type[1].find((module) => module.name === moduleName)
            return Boolean(module)
        })

        return module
    }

    static _getModifierFromModule(properties) {
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

    /**
     * Setup upgrades select
     * @param {string} columnId - Column id
     * @returns {void}
     */
    _setupModulesSelect(columnId) {
        if (!this._selectModule$[columnId]) {
            this._selectModule$[columnId] = {}

            for (const type of this._moduleTypes) {
                this._selectModule$[columnId][type] = $(`#${this._getModuleSelectId(type, columnId)}`)
                this._selectModule$[columnId][type]
                    .on("changed.bs.select", () => {
                        this._modulesSelected(columnId)
                        this._refreshShips(columnId)
                    })
                    .on("show.bs.select", (event) => {
                        const $el = $(event.currentTarget)

                        // Remove 'select all' button
                        $el.parent().find("button.bs-select-all").remove()
                    })
                    .on("show.bs.select", (event) => {
                        const $el = $(event.currentTarget)

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
                        countSelectedText(amount) {
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
     * @param {string} columnId - Column id
     * @returns {Object} Ship data
     */
    _getShipData(columnId) {
        const shipDataDefault = this._shipData.find((ship) => ship.id === this._shipIds[columnId])
        let shipDataUpdated = shipDataDefault

        shipDataUpdated.repairAmount = {
            armour: hullRepairsPercent,
            armourPerk: 0,
            sails: rigRepairsPercent,
            sailsPerk: 0,
        }
        shipDataUpdated.repairTime = { sides: repairTime, default: repairTime }
        shipDataUpdated.resistance = {
            fire: 0,
            leaks: 0,
            splinter: 0,
        }

        shipDataUpdated = this._addModulesAndWoodData(shipDataDefault, shipDataUpdated, columnId)

        return shipDataUpdated
    }

    static _adjustAbsolute(currentValue, additionalValue) {
        return currentValue ? currentValue + additionalValue : additionalValue
    }

    static _adjustPercentage(currentValue, additionalValue, isBaseValueAbsolute) {
        if (isBaseValueAbsolute) {
            return currentValue ? currentValue * (1 + additionalValue) : additionalValue
        }

        return currentValue ? currentValue + additionalValue : additionalValue
    }

    _adjustValue(value, key, isBaseValueAbsolute) {
        let adjustedValue = value

        if (this._modifierAmount.get(key).absolute) {
            const { absolute } = this._modifierAmount.get(key)
            adjustedValue = CompareShips._adjustAbsolute(adjustedValue, absolute)
        }

        if (this._modifierAmount.get(key).percentage) {
            const percentage = this._modifierAmount.get(key).percentage / 100
            adjustedValue = CompareShips._adjustPercentage(adjustedValue, percentage, isBaseValueAbsolute)
        }

        return Math.trunc(adjustedValue * 100) / 100
    }

    _setModifier(property) {
        let absolute = property.isPercentage ? 0 : property.amount
        let percentage = property.isPercentage ? property.amount : 0

        // If modifier has been in the Map add the amount
        if (this._modifierAmount.has(property.modifier)) {
            absolute += this._modifierAmount.get(property.modifier).absolute
            percentage += this._modifierAmount.get(property.modifier).percentage
        }

        this._modifierAmount.set(property.modifier, {
            absolute,
            percentage,
        })
    }

    _showCappingAdvice(compareId, modifiers) {
        const id = `${this._baseId}-${compareId}-capping`
        let div = document.getElementById(id)

        if (!div) {
            div = document.createElement("p")
            div.id = id
            div.className = "alert alert-warning"
            const element = document.getElementById(`${this._baseId}-${compareId}`)
            element.firstChild.after(div)
        }

        // noinspection InnerHTMLJS
        div.innerHTML = `${[...modifiers].join(", ")} capped`
    }

    _removeCappingAdvice(compareId) {
        const id = `${this._baseId}-${compareId}-capping`
        const div = document.getElementById(id)

        if (div) {
            div.remove()
        }
    }

    /**
     * Add upgrade changes to ship data
     * @param {*} shipDataBase - Base ship data
     * @param {*} shipDataUpdated - Updated ship data
     * @param {*} compareId - Column id
     * @returns {Object} - Updated ship data
     */
    _addModulesAndWoodData(shipDataBase, shipDataUpdated, compareId) {
        const data = JSON.parse(JSON.stringify(shipDataUpdated))

        const setModifierAmounts = () => {
            for (const id of this._selectedUpgradeIdsList[compareId]) {
                const module = this._moduleProperties.get(id)

                for (const property of module.properties) {
                    if (this._moduleAndWoodChanges.has(property.modifier)) {
                        this._setModifier(property)
                    }
                }
            }

            if (this.woodCompare._instances[compareId]) {
                let dataLink = "_woodData"
                if (compareId !== "Base") {
                    dataLink = "_compareData"
                }

                // Add modifier amount for both frame and trim
                for (const type of ["frame", "trim"]) {
                    for (const property of this.woodCompare._instances[compareId][dataLink][type].properties) {
                        if (this._moduleAndWoodChanges.has(property.modifier)) {
                            this._setModifier(property)
                        }
                    }
                }
            }
        }

        const adjustDataByModifiers = () => {
            for (const [key] of this._modifierAmount.entries()) {
                if (this._moduleAndWoodChanges.get(key).properties) {
                    for (const modifier of this._moduleAndWoodChanges.get(key).properties) {
                        const index = modifier.split(".")
                        if (index.length > 1) {
                            data[index[0]][index[1]] = this._adjustValue(
                                data[index[0]][index[1]],
                                key,
                                this._moduleAndWoodChanges.get(key).isBaseValueAbsolute
                            )
                        } else {
                            data[index[0]] = this._adjustValue(
                                data[index[0]],
                                key,
                                this._moduleAndWoodChanges.get(key).isBaseValueAbsolute
                            )
                        }
                    }
                }
            }
        }

        const adjustDataByCaps = () => {
            const valueCapped = { isCapped: false, modifiers: new Set() }

            const adjustValue = (modifier, uncappedValue, baseValue, { amount: capAmount, isPercentage }) => {
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

            for (const [, modifier] of this._modifierAmount.entries()) {
                if (this._moduleAndWoodCaps.has(modifier)) {
                    const { cap } = this._moduleAndWoodCaps.get(modifier)
                    for (const property of this._moduleAndWoodCaps.get(modifier).properties) {
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

        const setSpeedDegrees = () => {
            data.speedDegrees = data.speedDegrees.map((speed) => {
                const factor = 1 + this._modifierAmount.get("Max speed").percentage / 100
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

    _updateDifferenceProfileNeeded(id) {
        if (id !== "Base" && !isEmpty(this._selectedShips[id])) {
            this._selectedShips[id].updateDifferenceProfile()
        }
    }

    /**
     * Update sailing profile for compared ship
     * @param {*} compareId - Column id
     * @returns {void}
     */
    _updateSailingProfile(compareId) {
        // Update recent changes first
        this._updateDifferenceProfileNeeded(compareId)
        // Then update the rest of columns

        for (const otherCompareId of this._columnsCompare) {
            if (otherCompareId !== compareId) {
                this._updateDifferenceProfileNeeded(otherCompareId)
            }
        }
    }

    /**
     * Refresh ship data
     * @param {*} compareId - Column id
     * @returns {void}
     */
    _refreshShips(compareId) {
        if (this._baseId === "ship-journey") {
            this._singleShipData = this._shipData.find((ship) => ship.id === this._shipIds[compareId])
        } else {
            this._modulesSelected(compareId)
            const singleShipData = this._getShipData(compareId)
            if (compareId === "Base") {
                this._setSelectedShip(compareId, new ShipBase(compareId, singleShipData, this))
                for (const otherCompareId of this._columnsCompare) {
                    this._selectShip$[otherCompareId].removeAttr("disabled").selectpicker("refresh")
                    if (!isEmpty(this.selectedShips[otherCompareId])) {
                        this._setSelectedShip(
                            otherCompareId,
                            new ShipComparison(
                                otherCompareId,
                                singleShipData,
                                this.selectedShips[otherCompareId]._shipCompareData,
                                this
                            )
                        )
                    }
                }
            } else {
                this._setSelectedShip(
                    compareId,
                    new ShipComparison(compareId, this.selectedShips.Base._shipData, singleShipData, this)
                )
            }

            this._updateSailingProfile(compareId)
        }
    }

    /**
     * Enable compare selects
     * @returns {void}
     */
    _enableCompareSelects() {
        for (const compareId of this._columnsCompare) {
            this._selectShip$[compareId].removeAttr("disabled").selectpicker("refresh")
        }
    }

    _modulesSelected(compareId) {
        this._selectedUpgradeIdsList[compareId] = []
        this._selectedUpgradeIdsPerType[compareId] = {}

        for (const type of this._moduleTypes) {
            this._selectedUpgradeIdsPerType[compareId][type] = this._selectModule$[compareId][type].val()
            if (Array.isArray(this._selectedUpgradeIdsPerType[compareId][type])) {
                // Multiple selects
                this._selectedUpgradeIdsPerType[compareId][type] = this._selectedUpgradeIdsPerType[compareId][type].map(
                    Number
                )
            } else {
                // Single select
                this._selectedUpgradeIdsPerType[compareId][type] =
                    this._selectedUpgradeIdsPerType[compareId][type] === ""
                        ? []
                        : [Number(this._selectedUpgradeIdsPerType[compareId][type])]
            }

            if (this._selectedUpgradeIdsPerType[compareId][type].length) {
                this._selectedUpgradeIdsList[compareId] = this._selectedUpgradeIdsList[compareId].concat(
                    this._selectedUpgradeIdsPerType[compareId][type]
                )
            }
            // console.log("_modulesSelected", compareId, type, this._selectedUpgradeIdsPerType[compareId][type]);
        }
    }

    /**
     * Listener for the select
     * @param {string} compareId - Column id
     * @returns {void}
     */
    _setupSelectListener(compareId) {
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
                this.woodCompare.enableSelects(compareId)
            }
        })
        if (this._baseId !== "ship-journey") {
            for (const type of ["frame", "trim"]) {
                this._selectWood$[compareId][type]
                    .on("changed.bs.select", () => {
                        this.woodCompare._woodSelected(compareId, type, this._selectWood$[compareId][type])
                        this._refreshShips(compareId)
                    })
                    .selectpicker({ title: `Wood ${type}`, width: "150px" })
            }
        }
    }

    static _setSelect(select$, id) {
        if (id) {
            select$.val(id)
        }

        select$.selectpicker("render")
    }

    _setShipAndWoodsSelects(ids) {
        let i = 0

        this._columns.some((columnId) => {
            if (!this._shipData.find((ship) => ship.id === ids[i])) {
                return false
            }

            this._shipIds[columnId] = ids[i]
            i += 1
            CompareShips._setSelect(this._selectShip$[columnId], this._shipIds[columnId])
            if (columnId === "Base" && this._baseId !== "ship-journey") {
                this._enableCompareSelects()
            }

            this.woodCompare.enableSelects(columnId)
            this._setupModulesSelect(columnId)

            if (ids[i]) {
                for (const type of ["frame", "trim"]) {
                    CompareShips._setSelect(this._selectWood$[columnId][type], ids[i])
                    i += 1
                    this.woodCompare._woodSelected(columnId, type, this._selectWood$[columnId][type])
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
     * @return {void}
     */
    _setModuleSelects(urlParams) {
        for (const columnId of this._columns) {
            const columnIndex = this._columns.indexOf(columnId)
            let needRefresh = false
            for (const type of [...this._moduleTypes]) {
                const typeIndex = [...this._moduleTypes].indexOf(type)
                if (urlParams.has(`${columnIndex}${typeIndex}`)) {
                    const moduleIds = hashids.decode(urlParams.get(`${columnIndex}${typeIndex}`))
                    if (!this._selectedUpgradeIdsPerType[columnId]) {
                        this._selectedUpgradeIdsPerType[columnId] = {}
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
                    this._selectedUpgradeIdsList[columnId] = this._selectedUpgradeIdsList[columnId].concat(
                        this._selectedUpgradeIdsPerType[columnId][type]
                    )
                    needRefresh = true
                }
            }

            if (needRefresh) {
                this._refreshShips(columnId)
            }
        }
    }

    async initFromClipboard(urlParams) {
        await this._loadAndSetupData()
        const shipAndWoodsIds = hashids.decode(urlParams.get("cmp"))
        if (shipAndWoodsIds.length) {
            this._shipCompareSelected()
            this._setShipAndWoodsSelects(shipAndWoodsIds)
            this._setModuleSelects(urlParams)
        }
    }

    _getShipSelectId(columnId) {
        return `${this._baseId}-${columnId}-select`
    }

    _getWoodSelectId(type, columnId) {
        return `${this._woodId}-${type}-${columnId}-select`
    }

    _getModuleSelectId(type, columnId) {
        return `${this._moduleId}-${type.replace(/\s/, "")}-${columnId}-select`
    }

    _setSelectedShip(columnId, ship) {
        this._selectedShips[columnId] = ship
    }
}
