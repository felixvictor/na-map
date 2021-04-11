/*!
 * This file is part of na-map.
 *
 * @file      Compare ships file.
 * @module    game-tools/compare-ships/compare-ships
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { max as d3Max, min as d3Min } from "d3-array"
import { interpolateHcl as d3InterpolateHcl } from "d3-interpolate"
import { ScaleLinear, scaleLinear as d3ScaleLinear } from "d3-scale"

import { registerEvent } from "../../analytics"
import { appVersion, colourGreenDark, colourRedDark, colourWhite, getElementWidth } from "common/common-browser"
import { hashids, hullRepairsPercent, repairTime, rigRepairsPercent } from "common/common-game-tools"
import { copyToClipboard } from "../../util"

import { moduleAndWoodCaps, moduleAndWoodChanges } from "./module-data"
import CompareShipsModal from "./modal"
import SaveImage from "./save-image"
import Select from "util/select"
import SelectModule from "./select-module"
import SelectShip from "./select-ship"
import SelectWood from "./select-wood"
import { CompareWoods, woodType } from "../compare-woods"
import { ShipBase } from "./ship-base"
import { ShipComparison } from "./ship-comparison"

import { Module, ModulePropertiesEntity, ShipData, ShipRepairTime } from "common/gen-json"
import { ArrayIndex, HtmlString, Index, ModifierName } from "common/interface"
import {
    AbsoluteAndPercentageAmount,
    Amount,
    ColumnArray,
    ColumnNestedArray,
    ShipColumnTypeList,
    ModuleType,
    SelectedData,
} from "compare-ships"
import { ShipColumnType } from "./index"

export class CompareShips {
    #modal: CompareShipsModal | undefined = undefined
    #moduleDataDefault = {} as Module[]
    #shipData = {} as ShipData[]
    #selectShip = {} as SelectShip
    #selectWood = {} as SelectWood
    #selectModule = {} as SelectModule

    readonly #baseName: string
    readonly #doNotRound = new Set(["Turn acceleration"]) // Integer values that should not be rounded when modifiers are applied
    readonly #baseId: HtmlString
    readonly #menuId: HtmlString
    readonly #columnIds: ShipColumnType[]

    selectedShips = {} as ShipColumnTypeList<ShipBase | ShipComparison | undefined>

    colorScale!: ScaleLinear<string, string>
    readonly colourScaleSpeedDiff: ScaleLinear<string, string>
    readonly columnsCompare: ShipColumnType[]
    innerRadius!: number
    outerRadius!: number
    radiusSpeedScale!: ScaleLinear<number, number>
    singleShipData!: ShipData
    shipMassScale!: ScaleLinear<number, number>
    svgHeight!: number
    svgWidth!: number
    windProfileRotate = 0
    woodCompare = {} as CompareWoods

    private _maxSpeed!: number
    private _minSpeed!: number
    private _modifierAmount: Map<ModifierName, AbsoluteAndPercentageAmount> = new Map()
    private readonly _moduleAndWoodCaps = moduleAndWoodCaps
    private readonly _moduleAndWoodChanges = moduleAndWoodChanges

    private _selectedUpgradeIdsList = {} as ColumnArray<number>
    private _selectedUpgradeIdsPerType = {} as ColumnNestedArray<number>

    private _shipIds: Index<number> = {}

    constructor(id = "compare-ships") {
        this.#baseId = id

        this.#baseName = this.#baseId === "compare-ships" ? "Compare ships" : this.#baseId
        this.#menuId = `menu-${this.#baseId}`

        this.colourScaleSpeedDiff = d3ScaleLinear<string, string>()
            .range([colourRedDark, colourWhite, colourGreenDark])
            .interpolate(d3InterpolateHcl)

        this.columnsCompare = this.#baseId === "compare-ships" ? ["c1", "c2"] : []
        this.#columnIds = [...this.columnsCompare]
        this.#columnIds.unshift("base")

        for (const columnId of this.#columnIds) {
            this.selectedShips[columnId] = undefined
        }

        this._setupArrow()
        if (this.#baseId !== "ship-journey") {
            this._setupMenuListener()
        }
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

    _getShipId(columnId: ShipColumnType): number {
        return this._shipIds[columnId]
    }

    _setShip(columnId: ShipColumnType, shipId: number): void {
        this._shipIds[columnId] = shipId
        SelectShip.setSelect(this.#selectShip.getSelect$(columnId), shipId)
        if (columnId === "base" && this.#baseId !== "ship-journey") {
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
        Select.setSelect(this.#selectModule.getSelect$(columnId, type), this._selectedUpgradeIdsPerType[columnId][type])
        this._selectedUpgradeIdsList[columnId].push(...this._selectedUpgradeIdsPerType[columnId][type])
    }

    _cloneModuleData(currentColumnId: ShipColumnType, newColumnId: ShipColumnType): void {
        this.#selectModule.setup(newColumnId)
        this.#selectModule.resetSelects(newColumnId, this._getShipClass(newColumnId))
        if (this._selectedUpgradeIdsPerType[currentColumnId]) {
            for (const type of [...this.#selectModule.moduleTypes]) {
                const moduleIds = this._getModuleIds(currentColumnId, type)
                this._setModules(newColumnId, type, moduleIds)
            }
        }
    }

    _cloneShipToLeft(currentColumnId: ShipColumnType): void {
        const newColumnIndex = this.#columnIds.indexOf(currentColumnId)
        const newColumnId = this.#columnIds[newColumnIndex - 1]

        const hasData = this._cloneShipData(currentColumnId, newColumnId)
        if (hasData) {
            this.#selectWood.cloneWoodData(currentColumnId, newColumnId)
            this._cloneModuleData(currentColumnId, newColumnId)

            this._refreshShips(newColumnId)
        }
    }

    _cloneShipToRight(currentColumnId: ShipColumnType): void {
        const newColumnIndex = this.#columnIds.indexOf(currentColumnId)
        const newColumnId = this.#columnIds[newColumnIndex + 1]

        const hasData = this._cloneShipData(currentColumnId, newColumnId)
        if (hasData) {
            this.#selectWood.cloneWoodData(currentColumnId, newColumnId)
            this._cloneModuleData(currentColumnId, newColumnId)

            this._refreshShips(newColumnId)
        }
    }

    async CompareShipsInit(): Promise<void> {
        await this._loadAndSetupData()
        this._initSelects()
    }

    async initFromClipboard(urlParams: URLSearchParams): Promise<void> {
        await this._loadAndSetupData()
        const shipAndWoodsIds = hashids.decode(urlParams.get("cmp") ?? "") as number[]
        if (shipAndWoodsIds.length > 0) {
            await this._menuClicked()
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
        const theoreticalMinSpeed = (d3Min(this.#shipData, (ship) => ship.speed.min) ?? 0) * 1.2
        const theoreticalMaxSpeed = this._moduleAndWoodCaps.get("Max speed")!.cap.amount

        this._minSpeed = theoreticalMinSpeed
        this._maxSpeed = theoreticalMaxSpeed
        this.colorScale = d3ScaleLinear<string, string>()
            .domain([this._minSpeed, 0, this._maxSpeed])
            .range([colourRedDark, colourWhite, colourGreenDark])
            .interpolate(d3InterpolateHcl)

        const minShipMass = d3Min(this.#shipData, (ship) => ship.shipMass) ?? 0
        const maxShipMass = d3Max(this.#shipData, (ship) => ship.shipMass) ?? 0
        this.shipMassScale = d3ScaleLinear<number, number>().domain([minShipMass, maxShipMass]).range([100, 150])
    }

    async _loadAndSetupData(): Promise<void> {
        this.#moduleDataDefault = (
            await import(/* webpackChunkName: "data-modules" */ "../../../../../lib/gen-generic/modules.json")
        ).default as Module[]
        this.#shipData = (
            await import(/* webpackChunkName: "data-ships" */ "../../../../../lib/gen-generic/ships.json")
        ).default as ShipData[]
        this._setupData()
        if (this.#baseId !== "ship-journey") {
            this.woodCompare = new CompareWoods(this.#baseId)
            await this.woodCompare.init()
        }
    }

    /**
     * Setup menu item listener
     */
    _setupMenuListener(): void {
        ;(document.querySelector(`#${this.#menuId}`) as HTMLElement).addEventListener("click", () => {
            void this._menuClicked()
        })
    }

    /**
     * Set graphics parameter
     */
    _setGraphicsParameters(): void {
        const column = this.#modal!.getModalNode().querySelector(".column-base") as HTMLElement
        console.log("_setGraphicsParameters", this.#modal!.getModalNode(), column)
        this.svgWidth = getElementWidth(column) ?? 0
        // noinspection JSSuspiciousNameCombination
        this.svgHeight = this.svgWidth
        this.outerRadius = Math.floor(Math.min(this.svgWidth, this.svgHeight) / 2)
        this.innerRadius = Math.floor(this.outerRadius * 0.3)
        this.radiusSpeedScale = d3ScaleLinear<number, number>()
            .domain([this._minSpeed, 0, this._maxSpeed])
            .range([10, this.innerRadius, this.outerRadius])
    }

    _initCloneListeners(): void {
        for (const columnId of this.#columnIds) {
            // Clone left
            if (columnId !== this.#columnIds[0]) {
                // Add listener except for first column
                ;(document.querySelector(
                    `#${this.#modal!.cloneLeftButtonId}-${columnId}`
                ) as HTMLButtonElement).addEventListener("click", () => {
                    this._cloneShipToLeft(columnId)
                })
            }

            // Clone right
            if (columnId !== this.columnsCompare[this.columnsCompare.length - 1]) {
                // Add listener except for last right column
                ;(document.querySelector(
                    `#${this.#modal!.cloneRightButtonId}-${columnId}`
                ) as HTMLButtonElement).addEventListener("click", () => {
                    this._cloneShipToRight(columnId)
                })
            }
        }
    }

    _setupModuleSelectListener(columnId: ShipColumnType): void {
        for (const type of this.#selectModule.moduleTypes) {
            this.#selectModule.getSelect$(columnId, type).on("changed.bs.select", () => {
                this._modulesSelected(columnId)
                this._refreshShips(columnId)
            })
        }
    }

    _setupShipAndWoodSelectListener(columnId: ShipColumnType): void {
        const shipSel$ = this.#selectShip.getSelect$(columnId)

        Select.construct(shipSel$, { title: "Ship" })
        Select.reset(shipSel$)
        shipSel$.on("changed.bs.select", () => {
            console.log("changed.bs.select", shipSel$, shipSel$.val())
            this._shipIds[columnId] = Number(shipSel$.val())
            if (this.#baseId !== "ship-journey") {
                this.#selectModule.setup(columnId)
                this._setupModuleSelectListener(columnId)
                this.#selectModule.resetSelects(columnId, this._getShipClass(columnId))
            }

            this._refreshShips(columnId)
            if (columnId === "base" && this.#baseId !== "ship-journey") {
                this._enableCompareSelects()
            }

            if (this.#baseId !== "ship-journey") {
                this.woodCompare.select.enableSelects(columnId)
            }
        })

        if (this.#baseId !== "ship-journey") {
            for (const type of woodType) {
                const woodSel$ = this.#selectWood.getSelect$(columnId, type)
                Select.construct(woodSel$, { title: `Wood ${type}`, width: "150px" })
                woodSel$.on("changed.bs.select", () => {
                    this.woodCompare.woodSelected(columnId, type, this.#selectWood.getSelect$(columnId, type))
                    this._refreshShips(columnId)
                })
            }
        }
    }

    _initSelectListeners(): void {
        for (const columnId of this.#columnIds) {
            this._setupShipAndWoodSelectListener(columnId)
        }
    }

    _getSelectedModules(columnId: ShipColumnType): Map<string, string> {
        const modules = new Map<string, string>()

        if (this._selectedUpgradeIdsPerType[columnId]) {
            for (const type of [...this.#selectModule.moduleTypes]) {
                const text = [] as string[]
                for (const id of this._selectedUpgradeIdsPerType[columnId][type]) {
                    const property = this.#selectModule.getModule(id)
                    text.push(property?.name.replace(" Bonus", "") ?? "")
                }

                modules.set(type, text.join(", "))
            }
        }

        return modules
    }

    _getShipName(id: number): string {
        return this.#shipData.find((ship) => ship.id === id)?.name ?? ""
    }

    _getSelectedData(): ShipColumnTypeList<SelectedData> {
        const selectedData = {} as ShipColumnTypeList<SelectedData>

        for (const columnId of this.#columnIds) {
            if (this._shipIds[columnId]) {
                selectedData[columnId] = {
                    ship: this._getShipName(this._shipIds[columnId]),
                    moduleData: this._getSelectedModules(columnId),
                    wood: this.#selectWood.getSelectedText(columnId),
                }
            }
        }

        return selectedData
    }

    _initSelects(): void {
        this.#selectShip = new SelectShip(this.#baseId, this.#shipData)
        this.#selectWood = new SelectWood(this.#baseId, this.woodCompare)
        this.#selectModule = new SelectModule(this.#baseId, this.#moduleDataDefault)

        for (const columnId of this.#columnIds) {
            this.#selectShip.setup(columnId)
            if (this.#baseId !== "ship-journey") {
                this.#selectWood.setup(columnId)
            }
        }
    }

    async _menuClicked(): Promise<void> {
        registerEvent("Menu", this.#baseName)

        if (this.#modal) {
            this.#modal.show()
        } else {
            await this._loadAndSetupData()
            this.#modal = new CompareShipsModal(
                this.#baseName,
                this.#columnIds,
                this.columnsCompare[this.columnsCompare.length - 1]
            )
            this._initSelects()
            this._initSelectListeners()
            this._initCloneListeners()

            console.log(this.#modal.copyButtonId, this.#modal.imageButtonId)
            // Copy data to clipboard (ctrl-c key event)
            this.#modal.getModalNode().addEventListener("keydown", (event: Event): void => {
                if ((event as KeyboardEvent).key === "KeyC" && (event as KeyboardEvent).ctrlKey) {
                    this._copyDataClicked(event)
                }
            })
            // Copy data to clipboard (click event)
            document.querySelector(`#${this.#modal.copyButtonId}`)?.addEventListener("click", (event) => {
                this._copyDataClicked(event)
            })
            // Make image
            document.querySelector(`#${this.#modal.imageButtonId}`)?.addEventListener("click", async (event) => {
                registerEvent("Menu", "Ship compare image")
                event.preventDefault()
                const saveImage = new SaveImage(this.#baseId, this._getSelectedData(), this.#modal!.getModalNode())
                await saveImage.init()
            })
        }

        this._setGraphicsParameters()
    }

    _getShipAndWoodIds(): number[] {
        const data: number[] = []

        for (const columnId of this.#columnIds) {
            const shipId = this._getShipId(columnId)
            if (shipId) {
                data.push(shipId)
                for (const type of woodType) {
                    const woodId = this.#selectWood.getId(columnId, type)
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
            for (const columnId of this.#columnIds) {
                const columnIndex = this.#columnIds.indexOf(columnId)
                if (this._selectedUpgradeIdsPerType[columnId]) {
                    for (const type of [...this.#selectModule.moduleTypes]) {
                        const moduleIds = this._getModuleIds(columnId, type)
                        const typeIndex = [...this.#selectModule.moduleTypes].indexOf(type)

                        if (moduleIds?.length) {
                            const param = `${columnIndex}${typeIndex}`

                            ShipCompareUrl.searchParams.set(param, hashids.encode(moduleIds))
                        }
                    }
                }
            }

            copyToClipboard(ShipCompareUrl.href, this.#modal!.getModalNode())
        }
    }

    /**
     * Get ship data for ship with id <id>
     * @param columnId - Column id
     * @returns Ship data
     */
    _getShipData(columnId: ShipColumnType): ShipData {
        const shipDataDefault = this.#shipData.find((ship) => ship.id === this._shipIds[columnId])!
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
        const id = `${this.#baseId}-${compareId}-capping`
        let div = document.querySelector<HTMLDivElement>(`#${id}`)

        if (!div) {
            div = document.createElement("p")
            div.id = id
            div.className = "alert alert-warning"
            const element = document.querySelector<HTMLDivElement>(`#${this.#baseId}-${compareId}`)
            element?.firstChild?.after(div)
        }

        // noinspection InnerHTMLJS
        div.innerHTML = `${[...modifiers].join(", ")} capped`
    }

    _removeCappingAdvice(compareId: ShipColumnType): void {
        const id = `${this.#baseId}-${compareId}-capping`
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
                const module = this.#selectModule.getModule(id)

                for (const property of module?.properties ?? []) {
                    if (this._moduleAndWoodChanges.has(property.modifier)) {
                        this._setModifier(property)
                    }
                }
            }

            if (this.woodCompare.instances[compareId]) {
                let dataLink = "_woodData"
                if (compareId !== "base") {
                    dataLink = "_compareData"
                }

                // Add modifier amount for both frame and trim
                for (const type of woodType) {
                    const t1 = this.woodCompare
                    console.log("_addModulesAndWoodData", t1)
                    const t2 = this.woodCompare.instances
                    console.log("_addModulesAndWoodData", t2)
                    const t3 = this.woodCompare.instances[compareId]
                    console.log("_addModulesAndWoodData", t3)
                    const t4 = this.woodCompare.instances[compareId][dataLink]
                    console.log("_addModulesAndWoodData", t4)
                    const t5 = this.woodCompare.instances[compareId][dataLink][type]
                    console.log("_addModulesAndWoodData", t5)
                    const t6 = this.woodCompare.instances[compareId][dataLink][type].properties
                    console.log("_addModulesAndWoodData", t6)
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
        if (id !== "base" && this.selectedShips[id]) {
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
        if (this.#baseId === "ship-journey") {
            this.singleShipData = this.#shipData.find((ship) => ship.id === this._shipIds[compareId])!
        } else {
            this._modulesSelected(compareId)
            const singleShipData = this._getShipData(compareId)
            if (compareId === "base") {
                this._setSelectedShip(compareId, new ShipBase(compareId, singleShipData, this))
                for (const otherCompareId of this.columnsCompare) {
                    this.#selectShip.enableSelect(otherCompareId)
                    if (this.selectedShips[otherCompareId]) {
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
            this.#selectShip.enableSelect(compareId)
        }
    }

    _modulesSelected(compareId: ShipColumnType): void {
        this._selectedUpgradeIdsList[compareId] = []
        this._selectedUpgradeIdsPerType[compareId] = {} as ArrayIndex<number>

        for (const type of this.#selectModule.moduleTypes) {
            const value = this.#selectModule.getSelectValue(compareId, type)

            if (Array.isArray(value)) {
                // Multiple selects
                this._selectedUpgradeIdsPerType[compareId][type] = this._selectedUpgradeIdsPerType[compareId][
                    type
                ].map((element) => Number(element))
            } else {
                // Single select
                this._selectedUpgradeIdsPerType[compareId][type] = value
                    ? [Number(this._selectedUpgradeIdsPerType[compareId][type])]
                    : []
            }

            if (this._selectedUpgradeIdsPerType[compareId][type].length > 0) {
                this._selectedUpgradeIdsList[compareId] = [
                    ...this._selectedUpgradeIdsList[compareId],
                    ...this._selectedUpgradeIdsPerType[compareId][type],
                ]
            }
            // console.log("_modulesSelected", compareId, type, this._selectedUpgradeIdsPerType[compareId][type]);
        }
    }

    _getShipClass(columnId: ShipColumnType): number {
        return this.#shipData.find((ship) => ship.id === this._shipIds[columnId])?.class ?? 0
    }

    _setShipAndWoodsSelects(ids: number[]): void {
        let i = 0

        this.#columnIds.some((columnId) => {
            // eslint-disable-next-line unicorn/prefer-array-some
            if (!this.#shipData.find((ship) => ship.id === ids[i])) {
                return false
            }

            this._setShip(columnId, ids[i])
            i += 1

            this.woodCompare.select.enableSelects(columnId)
            this.#selectModule.setup(columnId)
            this.#selectModule.resetSelects(columnId, this._getShipClass(columnId))

            if (ids[i]) {
                for (const type of woodType) {
                    this.#selectWood.setWood(columnId, type, ids[i])
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
        for (const columnId of this.#columnIds) {
            const columnIndex = this.#columnIds.indexOf(columnId)
            let needRefresh = false
            for (const type of [...this.#selectModule.moduleTypes]) {
                const typeIndex = [...this.#selectModule.moduleTypes].indexOf(type)
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

    _setSelectedShip(columnId: ShipColumnType, ship: ShipBase | ShipComparison): void {
        this.selectedShips[columnId] = ship
    }
}
