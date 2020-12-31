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

import "bootstrap-select"
import { group as d3Group, max as d3Max, min as d3Min } from "d3-array"
import { interpolateHcl as d3InterpolateHcl } from "d3-interpolate"
import { ScaleLinear, scaleLinear as d3ScaleLinear } from "d3-scale"
import { select as d3Select, Selection } from "d3-selection"
import dayjs from "dayjs"
import customParseFormat from "dayjs/plugin/customParseFormat.js"
import utc from "dayjs/plugin/utc.js"

import { registerEvent } from "../../analytics"
import {
    appVersion,
    colourGreenDark,
    colourRedDark,
    colourWhite,
    insertBaseModal,
} from "common/common-browser"
import { isEmpty, WoodType, woodType } from "common/common"
import { formatPP, formatSignFloat, formatSignPercent } from "common/common-format"
import {
    hashids,
    hullRepairsPercent,
    isImported,
    repairTime,
    rigRepairsPercent,
    stripShipName,
} from "common/common-game-tools"
import { getOrdinal } from "common/common-math"
import { sortBy } from "common/common-node"
import { copyToClipboard } from "../../util"

import JQuery from "jquery"
import { Module, ModuleEntity, ModulePropertiesEntity, ShipData, ShipRepairTime } from "common/gen-json"
import { ArrayIndex, HtmlString, Index, ModifierName, NestedIndex } from "common/interface"

import CompareWoods from "../compare-woods"
import { ShipBase } from "./ship-base"
import { ShipComparison } from "./ship-comparison"

dayjs.extend(customParseFormat)
dayjs.extend(utc)

interface SelectedData {
    moduleData: Map<string, string>
    ship: string
    wood: string[]
}

interface ShipSelectMap {
    key: number
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
type ModuleId = number

const shipColumnType = ["Base", "C1", "C2"]!
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
    #doNotRound!: Set<string>
    #buttonMakeImage!: Selection<HTMLButtonElement, unknown, HTMLElement, unknown>
    private _maxSpeed!: number
    private _minSpeed!: number
    private _modal$: JQuery = {} as JQuery
    private _modifierAmount: Map<ModifierName, AbsoluteAndPercentageAmount> = new Map()
    private _moduleAndWoodCaps!: Map<ModifierName, PropertyWithCap>
    private _moduleAndWoodChanges!: Map<ModifierName, Property>
    private _moduleDataDefault!: Module[]
    private _moduleProperties!: Map<ModuleId, ModuleEntity>
    private _moduleTypes!: Set<ModuleType>
    private _selectedUpgradeIdsList: ColumnArray<number> = {} as ColumnArray<number>
    private _selectedUpgradeIdsPerType: ColumnNestedArray<number> = {} as ColumnNestedArray<number>
    private _selectModule$: NestedIndex<JQuery<HTMLSelectElement>> = {}
    private _selectShip$: Index<JQuery<HTMLSelectElement>> = {}
    private _selectWood$: NestedIndex<JQuery<HTMLSelectElement>> = {}
    private _shipData!: ShipData[]
    private _shipIds: Index<number> = {}
    private _shipSelectData!: ShipSelectMap[]
    private readonly _baseId: string
    private readonly _baseName: string
    private readonly _buttonId: HtmlString
    private readonly _columns: ShipColumnType[]
    private readonly _copyButtonId: HtmlString
    private readonly _cloneLeftButtonId: HtmlString
    private readonly _cloneRightButtonId: HtmlString
    private readonly _imageButtonId: HtmlString
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
        this._cloneLeftButtonId = `button-clone-left-${this._baseId}`
        this._cloneRightButtonId = `button-clone-right-${this._baseId}`
        this._imageButtonId = `button-image-${this._baseId}`

        this.colourScaleSpeedDiff = d3ScaleLinear<string, string>()
            .range([colourRedDark, colourWhite, colourGreenDark])
            .interpolate(d3InterpolateHcl)

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
                            ? formatPP(property.amount, 1)
                            : formatSignFloat(property.amount, 2)
                }

                return `${property.modifier} ${amount}`
            })
            .join("<br>")}</p>`
    }

    static _setSelect(select$: JQuery, ids: number | number[]): void {
        let value: string | string[]
        // eslint-disable-next-line unicorn/prefer-ternary
        if (Array.isArray(ids)) {
            value = ids.map<string>((id: number | string) => String(id))
        } else {
            value = String(ids)
        }

        if (value) {
            select$.val(value)
        }

        select$.selectpicker("render")
    }

    static _saveCanvasAsImage(uri: string): void {
        const date = dayjs.utc().format("YYYY-MM-DD HH-mm-ss")
        const fileName = `na-map ship compare ${date}.png`
        const link = document.createElement("a")

        link.href = uri
        link.download = fileName

        // Firefox requires the link to be in the body
        document.body.append(link)

        // simulate click
        link.click()

        // remove the link when done
        link.remove()
    }

    _getShipId(columnId: ShipColumnType): number {
        return this._shipIds[columnId]
    }

    _setShip(columnId: ShipColumnType, shipId: number): void {
        this._shipIds[columnId] = shipId
        CompareShips._setSelect(this._selectShip$[columnId], shipId)
        if (columnId === "Base" && this._baseId !== "ship-journey") {
            this._enableCompareSelects()
        }
    }

    _cloneShipData(currentColumnId: ShipColumnType, newColumnId: ShipColumnType): boolean {
        const shipId = this._getShipId(currentColumnId)
        if (shipId) {
            this._setShip(newColumnId, shipId)
        }

        return shipId !== undefined
    }

    _getWoodId(columnId: ShipColumnType, type: WoodType): number {
        return Number(this._selectWood$[columnId][type].val())
    }

    _setWood(columnId: ShipColumnType, type: WoodType, woodId: number): void {
        CompareShips._setSelect(this._selectWood$[columnId][type], woodId)
        this.woodCompare._woodSelected(columnId, type, this._selectWood$[columnId][type])
    }

    _cloneWoodData(currentColumnId: ShipColumnType, newColumnId: ShipColumnType): void {
        this.woodCompare.enableSelects(newColumnId)

        if (this._selectWood$[currentColumnId].frame.val() !== "") {
            for (const type of woodType) {
                const woodId = this._getWoodId(currentColumnId, type)
                this._setWood(newColumnId, type, woodId)
            }
        }
    }

    _getModuleIds(columnId: ShipColumnType, type: ModuleType): number[] {
        return this._selectedUpgradeIdsPerType[columnId][type]
    }

    _setModules(columnId: ShipColumnType, type: ModuleType, moduleIds: number[]): void {
        if (!this._selectedUpgradeIdsPerType[columnId]) {
            this._selectedUpgradeIdsPerType[columnId] = {} as ArrayIndex<number>
        }

        if (!this._selectedUpgradeIdsList[columnId]) {
            this._selectedUpgradeIdsList[columnId] = []
        }

        // console.log("moduleIds", { columnId }, { type }, { moduleIds });

        this._selectedUpgradeIdsPerType[columnId][type] = moduleIds.map((element) => Number(element))
        CompareShips._setSelect(this._selectModule$[columnId][type], this._selectedUpgradeIdsPerType[columnId][type])
        this._selectedUpgradeIdsList[columnId].push(...this._selectedUpgradeIdsPerType[columnId][type])
    }

    _cloneModuleData(currentColumnId: ShipColumnType, newColumnId: ShipColumnType): void {
        this._setupModulesSelect(newColumnId)
        if (this._selectedUpgradeIdsPerType[currentColumnId]) {
            for (const type of [...this._moduleTypes]) {
                const moduleIds = this._getModuleIds(currentColumnId, type)
                this._setModules(newColumnId, type, moduleIds)
            }
        }
    }

    _cloneShipToLeft(currentColumnId: ShipColumnType): void {
        const newColumnIndex = this._columns.findIndex((element) => element === currentColumnId)
        const newColumnId = this._columns[newColumnIndex - 1]

        const hasData = this._cloneShipData(currentColumnId, newColumnId)
        if (hasData) {
            this._cloneWoodData(currentColumnId, newColumnId)
            this._cloneModuleData(currentColumnId, newColumnId)

            this._refreshShips(newColumnId)
        }
    }

    _cloneShipToRight(currentColumnId: ShipColumnType): void {
        const newColumnIndex = this._columns.findIndex((element) => element === currentColumnId)
        const newColumnId = this._columns[newColumnIndex + 1]

        const hasData = this._cloneShipData(currentColumnId, newColumnId)
        if (hasData) {
            this._cloneWoodData(currentColumnId, newColumnId)
            this._cloneModuleData(currentColumnId, newColumnId)

            this._refreshShips(newColumnId)
        }
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
        const arrow = document.querySelector<SVGMarkerElement>("#journey-arrow")
        if (arrow) {
            // Clone arrow and change properties
            const arrowNew = arrow.cloneNode(true) as SVGMarkerElement
            arrowNew.id = "wind-profile-arrow-head"
            if (arrowNew.hasChildNodes()) {
                for (const child of arrowNew.childNodes) {
                    ;(child as SVGPathElement).classList.replace("journey-arrow-head", "wind-profile-arrow-head")
                }
            }

            // Insert new arrow
            const defs = document.querySelector<SVGDefsElement>("#na-map svg defs")
            if (defs) {
                defs.append(arrowNew)
            }
        }
    }

    _setupData(): void {
        this._moduleAndWoodChanges = new Map<ModifierName, Property>([
            [
                "Cannon horizontal dispersion",
                { properties: ["gunnery.dispersionHorizontal"], isBaseValueAbsolute: true },
            ],
            ["Cannon vertical dispersion", { properties: ["gunnery.dispersionVertical"], isBaseValueAbsolute: true }],
            ["Cannon reload time", { properties: ["gunnery.reload"], isBaseValueAbsolute: true }],
            ["Cannon ball penetration", { properties: ["gunnery.penetration"], isBaseValueAbsolute: true }],
            ["Cannon side traverse", { properties: ["gunnery.traverseSide"], isBaseValueAbsolute: true }],
            ["Cannon up/down traverse", { properties: ["gunnery.traverseUpDown"], isBaseValueAbsolute: true }],

            ["Morale", { properties: ["boarding.morale"], isBaseValueAbsolute: true }],
            ["Muskets accuracy", { properties: ["boarding.musketsAccuracy"], isBaseValueAbsolute: false }],
            ["Preparation", { properties: ["boarding.prepPerRound"], isBaseValueAbsolute: true }],
            ["Initial preparation", { properties: ["boarding.prepInitial"], isBaseValueAbsolute: true }],
            ["Melee attack", { properties: ["boarding.attack"], isBaseValueAbsolute: false }],
            ["Melee defense", { properties: ["boarding.defense"], isBaseValueAbsolute: false }],
            ["Disengage time", { properties: ["boarding.disengageTime"], isBaseValueAbsolute: true }],
            ["Crew with muskets", { properties: ["boarding.musketsCrew"], isBaseValueAbsolute: true }],
            ["Boarding cannons accuracy", { properties: ["boarding.cannonsAccuracy"], isBaseValueAbsolute: false }],

            ["Acceleration", { properties: ["ship.acceleration"], isBaseValueAbsolute: true }],
            [
                "Armor thickness",
                { properties: ["sides.thickness", "bow.thickness", "stern.thickness"], isBaseValueAbsolute: true },
            ],
            [
                "Armour hit points",
                { properties: ["bow.armour", "sides.armour", "stern.armour"], isBaseValueAbsolute: true },
            ],
            ["Armour repair amount (perk)", { properties: ["repairAmount.armourPerk"], isBaseValueAbsolute: true }],
            ["Back armour thickness", { properties: ["stern.thickness"], isBaseValueAbsolute: true }],
            ["Cannon crew", { properties: ["crew.cannons"], isBaseValueAbsolute: true }],
            ["Carronade crew", { properties: ["crew.carronades"], isBaseValueAbsolute: true }],
            ["Crew", { properties: ["crew.max"], isBaseValueAbsolute: true }],
            ["Deceleration", { properties: ["ship.deceleration"], isBaseValueAbsolute: true }],
            ["Front armour thickness", { properties: ["bow.thickness"], isBaseValueAbsolute: true }],
            ["Hold weight", { properties: ["maxWeight"], isBaseValueAbsolute: true }],
            ["Hull hit points", { properties: ["structure.armour"], isBaseValueAbsolute: true }],
            ["Sail hit points", { properties: ["sails.armour"], isBaseValueAbsolute: true }],
            [
                "Mast hit points",
                {
                    properties: ["mast.bottomArmour", "mast.middleArmour", "mast.topArmour"],
                    isBaseValueAbsolute: true,
                },
            ],
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
            ["Max speed", { properties: ["speed.max"], isBaseValueAbsolute: true }],
            ["Repair amount", { properties: ["repairAmount.armour"], isBaseValueAbsolute: true }],
            ["Repair time", { properties: ["repairTime.sides"], isBaseValueAbsolute: true }],
            ["Roll angle", { properties: ["ship.rollAngle"], isBaseValueAbsolute: true }],
            ["Rudder health", { properties: ["rudder.armour"], isBaseValueAbsolute: true }],
            ["Rudder speed", { properties: ["rudder.halfturnTime"], isBaseValueAbsolute: true }],
            ["Sail repair amount (perk)", { properties: ["repairAmount.sailsPerk"], isBaseValueAbsolute: true }],
            ["Sailing crew", { properties: ["crew.sailing"], isBaseValueAbsolute: true }],
            ["Splinter resistance", { properties: ["resistance.splinter"], isBaseValueAbsolute: false }],
            ["Turn acceleration", { properties: ["ship.turnAcceleration"], isBaseValueAbsolute: true }],
            ["Turn speed", { properties: ["ship.turnSpeed"], isBaseValueAbsolute: true }],
            ["Water pump health", { properties: ["pump.armour"], isBaseValueAbsolute: true }],
        ])

        // Integer values that should not be rounded when modifiers are applied
        this.#doNotRound = new Set(["Turn acceleration"])

        this._moduleAndWoodCaps = new Map<ModifierName, PropertyWithCap>([
            [
                "Armor thickness",
                {
                    properties: ["sides.thickness"],
                    cap: { amount: 1, isPercentage: true },
                },
            ],
            [
                "Armour hit points",
                {
                    properties: ["bow.armour", "sides.armour", "stern.armour"],
                    cap: { amount: 1, isPercentage: true },
                },
            ],
            ["Structure hit points", { properties: ["structure.armour"], cap: { amount: 1, isPercentage: true } }],
            [
                "Mast health",
                {
                    properties: ["mast.bottomArmour", "mast.middleArmour", "mast.topArmour"],
                    cap: { amount: 1, isPercentage: true },
                },
            ],
            [
                "Mast thickness",
                {
                    properties: ["mast.bottomThickness", "mast.middleThickness", "mast.topThickness"],
                    cap: { amount: 1, isPercentage: true },
                },
            ],
            ["Max speed", { properties: ["speed.max"], cap: { amount: 18, isPercentage: false } }],
            ["Turn rate", { properties: ["rudder.turnSpeed"], cap: { amount: 0.25, isPercentage: true } }],
        ])

        const theoreticalMinSpeed = (d3Min(this._shipData, (ship) => ship.speed.min) ?? 0) * 1.2
        const theoreticalMaxSpeed = this._moduleAndWoodCaps.get("Max speed")!.cap.amount

        this._minSpeed = theoreticalMinSpeed
        this._maxSpeed = theoreticalMaxSpeed
        this.colorScale = d3ScaleLinear<string, string>()
            .domain([this._minSpeed, 0, this._maxSpeed])
            .range([colourRedDark, colourWhite, colourGreenDark])
            .interpolate(d3InterpolateHcl)

        const minShipMass = d3Min(this._shipData, (ship) => ship.shipMass) ?? 0
        const maxShipMass = d3Max(this._shipData, (ship) => ship.shipMass) ?? 0
        this.shipMassScale = d3ScaleLinear<number, number>().domain([minShipMass, maxShipMass]).range([100, 150])
    }

    async _loadAndSetupData(): Promise<void> {
        this._moduleDataDefault = (
            await import(/* webpackChunkName: "data-modules" */ "../../../../lib/gen-generic/modules.json")
        ).default as Module[]
        this._shipData = (await import(/* webpackChunkName: "data-ships" */ "../../../../lib/gen-generic/ships.json"))
            .default as ShipData[]
        this._setupData()
        if (this._baseId !== "ship-journey") {
            this.woodCompare = new CompareWoods(this._woodId)
            await this.woodCompare.woodInit()
        }
    }

    /**
     * Setup menu item listener
     */
    _setupListener(): void {
        let firstClick = true

        document.querySelector(`#${this._buttonId}`)?.addEventListener("click", async () => {
            if (firstClick) {
                firstClick = false
                await this._loadAndSetupData()
            }

            registerEvent("Tools", this._baseName)

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

    _getShipName(id: number): string {
        return this._shipData.find((ship) => ship.id === id)?.name ?? ""
    }

    _getSelectedData(columnId: ShipColumnType): SelectedData {
        const selectedData = {
            moduleData: new Map<string, string>(),
            ship: "",
            wood: [] as string[],
        }
        if (this._shipIds[columnId]) {
            selectedData.ship = this._getShipName(this._shipIds[columnId])
            for (const type of woodType) {
                selectedData.wood.push(
                    this.woodCompare.getWoodName(type, Number(this._selectWood$[columnId][type].val()))
                )
            }

            if (this._selectedUpgradeIdsPerType[columnId]) {
                for (const type of [...this._moduleTypes]) {
                    const text = [] as string[]
                    for (const id of this._selectedUpgradeIdsPerType[columnId][type]) {
                        text.push(this._moduleProperties.get(id)?.name.replace(" Bonus", "") ?? "")
                    }

                    selectedData.moduleData.set(type, text.join(", "))
                }
            }
        }

        return selectedData
    }

    _printSelectedData(clonedDocument: Document, selectedData: SelectedData, columnId: ShipColumnType): void {
        const labels = clonedDocument.querySelectorAll<HTMLElement>(`#${this._baseId}-${columnId.toLowerCase()} label`)
        const parent = labels[0].parentNode as HTMLElement
        const labelHeight = labels[0].offsetHeight
        for (const label of labels) {
            label.remove()
        }

        const mainDiv = d3Select(parent)
            .insert("div", ":first-child")
            .style("height", `${labelHeight * 5}px`)

        if (selectedData.ship) {
            mainDiv.append("div").style("margin-bottom", "5px").style("line-height", "1.1").text(selectedData.ship)
        }

        if (selectedData.wood[0] !== "") {
            mainDiv
                .append("div")
                .style("font-size", "smaller")
                .style("margin-bottom", "5px")
                .style("line-height", "1.1")
                .text(selectedData.wood.join(" | "))
        }

        for (const [key, value] of selectedData.moduleData) {
            if (value !== "") {
                mainDiv
                    .append("div")
                    .style("font-size", "small")
                    .style("margin-bottom", "5px")
                    .style("line-height", "1.1")
                    .html(`<em>${key}</em>: ${value}`)
            }
        }
    }

    _replaceSelectsWithText(clonedDocument: Document): void {
        for (const columnId of this._columns) {
            const selectedData = this._getSelectedData(columnId)
            this._printSelectedData(clonedDocument, selectedData, columnId)
        }
    }

    _setMakeImageSpinner(): void {
        this.#buttonMakeImage.select("i").remove()
        this.#buttonMakeImage.attr("class", "btn btn-primary").property("disabled", true)
        this.#buttonMakeImage
            .append("span")
            .attr("class", "spinner-border spinner-border-sm")
            .attr("role", "status")
            .attr("aria-hidden", "true")
        this.#buttonMakeImage.append("span").attr("class", "sr-only").text("Loading...")
    }

    _unsetMakeImageSpinner(): void {
        this.#buttonMakeImage.selectAll("span").remove()
        this.#buttonMakeImage.attr("class", "btn btn-outline-secondary icon-outline-button").property("disabled", false)
        this.#buttonMakeImage.append("i").attr("class", "icon icon-image")
    }

    async _makeImage(event: Event): Promise<void> {
        event.preventDefault()

        this._setMakeImageSpinner()

        const html2canvas = await import(/* webpackChunkName: "html2canvas" */ "html2canvas")
        const element = document.querySelector<HTMLElement>(
            `#${this._modalId} .modal-dialog .modal-content .modal-body`
        )
        if (element) {
            const canvas = await html2canvas.default(element, {
                allowTaint: true,
                foreignObjectRendering: true,
                ignoreElements: (element) =>
                    element.classList.contains("central") ||
                    element.classList.contains("overlay") ||
                    element.classList.contains("navbar"),
                logging: true,
                onclone: (clonedDocument) => {
                    this._replaceSelectsWithText(clonedDocument)
                },
                x: 0,
                y: 0,
            })

            CompareShips._saveCanvasAsImage(canvas.toDataURL())
        }

        this._unsetMakeImageSpinner()
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
            // Make image
            document.querySelector(`#${this._imageButtonId}`)?.addEventListener("click", async (event) => {
                registerEvent("Menu", "Ship compare image")
                await this._makeImage(event)
            })
        }

        // Show modal
        this._modal$.modal("show")
        this._setGraphicsParameters()
    }

    _getShipAndWoodIds(): number[] {
        const data: number[] = []

        for (const columnId of this._columns) {
            const shipId = this._getShipId(columnId)
            if (shipId) {
                data.push(shipId)
                for (const type of woodType) {
                    const woodId = this._getWoodId(columnId, type)
                    data.push(woodId)
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
                        const moduleIds = this._getModuleIds(columnId, type)
                        const typeIndex = [...this._moduleTypes].indexOf(type)

                        // eslint-disable-next-line max-depth
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
        this._shipSelectData = [...d3Group(this._shipData, (ship) => ship.class)]
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
                .attr("id", `${this._baseId}-${columnId.toLowerCase()}`)
                .attr("class", `col-md-4 ml-auto pt-2 ${columnId === "Base" ? "column-base" : "column-comp"}`)

            const shipSelectId = this._getShipSelectId(columnId)

            const divShip = div.append("div").attr("class", "input-group justify-content-between mb-1")

            // Add clone icon except for first column
            if (columnId !== this._columns[0]) {
                divShip
                    .append("div")
                    .attr("class", "input-group-prepend")
                    .append("button")
                    .attr("class", "btn btn-default icon-outline-button")
                    .attr("id", `${this._cloneLeftButtonId}-${columnId}`)
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
            if (columnId !== this.columnsCompare[this.columnsCompare.length - 1]) {
                divShip
                    .append("div")
                    .attr("class", "input-group-append")
                    .append("button")
                    .attr("class", "btn btn-default icon-outline-button")
                    .attr("id", `${this._cloneRightButtonId}-${columnId}`)
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
            for (const type of this._moduleTypes) {
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
                .attr("id", `${this._baseId}-${columnId}`)
                .attr("class", `${columnId === "Base" ? "ship-base" : "ship-compare"} compress`)
        }

        const footer = d3Select(`#${this._modalId} .modal-footer`)
        footer
            .insert("button", "button")
            .attr("class", "btn btn-outline-secondary icon-outline-button")
            .attr("id", this._copyButtonId)
            .attr("title", "Copy to clipboard (ctrl-c)")
            .attr("type", "button")
            .append("i")
            .attr("class", "icon icon-copy")
        this.#buttonMakeImage = footer
            .insert("button", "button")
            .attr("class", "btn btn-outline-secondary icon-outline-button")
            .attr("id", this._imageButtonId)
            .attr("title", "Make image")
            .attr("type", "button")
        this.#buttonMakeImage.append("i").attr("class", "icon icon-image")
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
                for (const type of woodType) {
                    this._selectWood$[columnId][type] = $(`#${this._getWoodSelectId(type, columnId)}`)
                    this.woodCompare._setupWoodSelects(columnId, type, this._selectWood$[columnId][type])
                }
            }

            this._setupSelectListener(columnId)
        }
    }

    _initSelects(): void {
        this._initSelectColumns()
    }

    _initCloneListeners(): void {
        for (const columnId of this._columns) {
            // Clone left
            if (columnId !== this._columns[0]) {
                // Add listener except for first column
                document.querySelector(`#${this._cloneLeftButtonId}-${columnId}`)?.addEventListener("click", () => {
                    this._cloneShipToLeft(columnId)
                })
            }

            // Clone right
            if (columnId !== this.columnsCompare[this.columnsCompare.length - 1]) {
                // Add listener except for last right column
                document.querySelector(`#${this._cloneRightButtonId}-${columnId}`)?.addEventListener("click", () => {
                    this._cloneShipToRight(columnId)
                })
            }
        }
    }

    /**
     * Init modal
     */
    _initModal(): void {
        this._initData()
        this._injectModal()
        this._initSelects()
        this._initCloneListeners()
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
        const moduleDataForShipClass = [...this._moduleProperties].filter(
            (module) =>
                module[1].type.replace(/\s–\s[\s/A-Za-z\u25CB]+/, "") === moduleType &&
                (module[1].moduleLevel === "U" || module[1].moduleLevel === CompareShips._getModuleLevel(shipClass))
        )

        // Group module data by sub type (e.g. "Gunnery")
        const modules = [...d3Group(moduleDataForShipClass, (module) => module[1].type.replace(/[\sA-Za-z]+\s–\s/, ""))]
            .map(([key, value]) => ({
                key,
                values: value.sort((a, b) => a[1].name.localeCompare(b[1].name)),
            }))
            .sort(sortBy(["key"]))

        let options: string
        const moduleTypeWithSingleOption = new Set(["Permanent", "Ship trim"])
        // eslint-disable-next-line unicorn/prefer-ternary
        if (modules.length > 1) {
            // Get options with sub types as optgroups
            options = modules
                .map(
                    (group) =>
                        `<optgroup label="${group.key}" data-max-options="${
                            moduleTypeWithSingleOption.has(moduleType.replace(/[\sA-Za-z]+\s–\s/, "")) ? 1 : 5
                        }">${group.values
                            .map((module: [number, ModuleEntity]) => `<option value="${module[0]}">${module[1].name}`)
                            .join("</option>")}`
                )
                .join("</optgroup>")
        } else {
            // Get options without optgroups
            options = modules
                .map(
                    (group) =>
                        `${group.values
                            .map((module: [number, ModuleEntity]) => `<option value="${module[0]}">${module[1].name}`)
                            .join("</option>")}`
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

    _getModuleFromName(moduleName: string | null): ModuleEntity {
        let module = {} as ModuleEntity | undefined

        this._moduleDataDefault.some((type) => {
            module = type[1].find((module) => module.name === moduleName)
            return Boolean(module)
        })

        return module!
    }

    /**
     * Setup upgrades select
     * @param columnId - Column id
     */
    _setupModulesSelect(columnId: ShipColumnType): void {
        if (!this._selectModule$[columnId]) {
            this._selectModule$[columnId] = {}

            for (const type of this._moduleTypes) {
                const tooltips = new Map<number, JQuery<HTMLLIElement> | null>()
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

                        // Add tooltip
                        for (const element of $el.data("selectpicker").selectpicker.current
                            .elements as HTMLLIElement[]) {
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
                                    .on("show.bs.tooltip", () => {
                                        // Remember shown tooltip
                                        tooltips.set(module.id, $(element))
                                    })
                                    .on("hide.bs.tooltip", () => {
                                        // eslint-disable-next-line unicorn/no-null
                                        tooltips.set(module.id, null)
                                    })
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
                    .on("hide.bs.select", () => {
                        // Hide remaining tooltips
                        for (const [, value] of tooltips) {
                            if (value) {
                                value.tooltip("hide")
                            }
                        }

                        tooltips.clear()
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
        shipDataDefault.boarding = {
            attack: 0,
            cannonsAccuracy: 0,
            defense: 0,
            disengageTime: 4,
            morale: shipDataDefault.boarding.morale,
            musketsAccuracy: 0,
            musketsCrew: 30,
            prepInitial: shipDataDefault.boarding.prepInitial,
            prepPerRound: shipDataDefault.boarding.prepPerRound,
        }

        let shipDataUpdated = shipDataDefault
        shipDataUpdated.repairAmount = {
            armour: hullRepairsPercent,
            armourPerk: 0,
            sails: rigRepairsPercent,
            sailsPerk: 0,
        }
        shipDataUpdated.repairTime = { sides: repairTime, default: repairTime } as ShipRepairTime
        shipDataUpdated.resistance = {
            leaks: 0,
            splinter: 0,
        }
        shipDataUpdated.gunnery = {
            dispersionHorizontal: 0,
            dispersionVertical: 0,
            penetration: 0,
            reload: 0,
            traverseUpDown: 0,
            traverseSide: 0,
        }
        shipDataUpdated = this._addModulesAndWoodData(shipDataDefault, shipDataUpdated, columnId)

        return shipDataUpdated
    }

    _roundPropertyValue(baseValue: number, value: number, doNotRound = false): number {
        if (Number.isInteger(baseValue) && !doNotRound) {
            return Math.round(value)
        }

        return Math.trunc(value * 100) / 100
    }

    _adjustValue(value: number, key: string, isBaseValueAbsolute: boolean): number {
        let adjustedValue = value

        if (this._modifierAmount.get(key)?.percentage !== 0) {
            const percentage = this._modifierAmount.get(key)!.percentage / 100
            adjustedValue = CompareShips._adjustPercentage(adjustedValue, percentage, isBaseValueAbsolute)
        }

        if (this._modifierAmount.get(key)?.absolute !== 0) {
            const { absolute } = this._modifierAmount.get(key)!
            adjustedValue = CompareShips._adjustAbsolute(adjustedValue, absolute)
        }

        const doNotRound = this.#doNotRound.has(key) || isBaseValueAbsolute || value === 0

        return this._roundPropertyValue(value, adjustedValue, doNotRound)
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
        let div = document.querySelector<HTMLDivElement>(`#${id}`)

        if (!div) {
            div = document.createElement("p")
            div.id = id
            div.className = "alert alert-warning"
            const element = document.querySelector<HTMLDivElement>(`#${this._baseId}-${compareId}`)
            element?.firstChild?.after(div)
        }

        // noinspection InnerHTMLJS
        div.innerHTML = `${[...modifiers].join(", ")} capped`
    }

    _removeCappingAdvice(compareId: ShipColumnType): void {
        const id = `${this._baseId}-${compareId}-capping`
        const div = document.querySelector<HTMLDivElement>(`#${id}`)

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
                for (const type of woodType) {
                    // @ts-expect-error
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
                            /*
                            console.log(
                                key,
                                data[index[0]][index[1]],
                                this._modifierAmount.get(key),
                                isBaseValueAbsolute,
                                this._adjustValue(data[index[0]][index[1]], key, isBaseValueAbsolute)
                            )
                            */
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
            const valueCapped = { isCapped: false, modifiers: new Set<ModifierName>() }

            const adjustValue = (
                modifier: ModifierName,
                valueUncapped: number,
                valueBase: number,
                { amount: capAmount, isPercentage }: Amount
            ): number => {
                const valueRespectingCap = Math.min(
                    valueUncapped,
                    isPercentage ? this._roundPropertyValue(valueBase, valueBase * (1 + capAmount)) : capAmount
                )
                if (valueUncapped > valueRespectingCap) {
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
                                otherCompareId,
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
                    new ShipComparison(compareId, (this.selectedShips.Base as ShipBase).shipData, singleShipData, this)
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
            // @ts-expect-error
            this._selectedUpgradeIdsPerType[compareId][type] = this._selectModule$[compareId][type].val()
            if (Array.isArray(this._selectedUpgradeIdsPerType[compareId][type])) {
                // Multiple selects
                this._selectedUpgradeIdsPerType[compareId][type] = this._selectedUpgradeIdsPerType[compareId][
                    type
                ].map((element) => Number(element))
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
                this.woodCompare.enableSelects(compareId)
            }
        })
        if (this._baseId !== "ship-journey") {
            for (const type of woodType) {
                this._selectWood$[compareId][type]
                    .on("changed.bs.select", () => {
                        this.woodCompare._woodSelected(compareId, type, this._selectWood$[compareId][type])
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

            this._setShip(columnId, ids[i])
            i += 1

            this.woodCompare.enableSelects(columnId)
            this._setupModulesSelect(columnId)

            if (ids[i]) {
                for (const type of woodType) {
                    this._setWood(columnId, type, ids[i])
                    i += 1
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
                    const moduleIds = hashids.decode(urlParams.get(`${columnIndex}${typeIndex}`)!) as number[]
                    this._setModules(columnId, type, moduleIds)
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
