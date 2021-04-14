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
import { moduleAndWoodCaps } from "./module-modifier"

import CompareShipsModal from "./modal"
import SaveImage from "./save-image"
import Select from "util/select"
import SelectModule from "./select-module"
import SelectShip from "./select-ship"
import SelectWood from "./select-wood"
import { CompareWoods, woodType } from "../compare-woods"
import { ShipBase } from "./ship-base"
import { ShipComparison } from "./ship-comparison"
import ModulesAndWoodData from "./module-wood-data"

import { Module, ShipData, ShipRepairTime } from "common/gen-json"
import { HtmlString } from "common/interface"
import { ShipColumnTypeList, ModuleType, SelectedData } from "compare-ships"
import { ShipColumnType } from "./index"

type CompareShipsBaseId = "compare-ships" | "ship-journey"

export class CompareShips {
    #maxSpeed = 0
    #minSpeed = 0
    #modal: CompareShipsModal | undefined = undefined
    #moduleDataDefault = {} as Module[]
    #modulesAndWoodData = {} as ModulesAndWoodData
    #selectModule = {} as SelectModule
    #selectShip = {} as SelectShip
    #selectWood = {} as SelectWood
    #shipData = {} as ShipData[]
    #shipIds = new Map<ShipColumnType, number>()
    readonly #baseId: CompareShipsBaseId
    readonly #baseName: string
    readonly #columnIds: ShipColumnType[]
    readonly #menuId: HtmlString
    readonly #moduleAndWoodCaps = moduleAndWoodCaps

    colorScale!: ScaleLinear<string, string>
    innerRadius!: number
    outerRadius!: number
    radiusSpeedScale!: ScaleLinear<number, number>
    selectedShips = {} as ShipColumnTypeList<ShipBase | ShipComparison | undefined>
    shipMassScale!: ScaleLinear<number, number>
    singleShipData!: ShipData
    svgHeight!: number
    svgWidth!: number
    windProfileRotate = 0
    woodCompare = {} as CompareWoods
    readonly colourScaleSpeedDiff: ScaleLinear<string, string>
    readonly columnsCompare: ShipColumnType[]

    constructor(id: CompareShipsBaseId = "compare-ships") {
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
    }

    get columnIds(): ShipColumnType[] {
        return this.#columnIds
    }

    get menuId(): HtmlString {
        return this.#menuId
    }

    get modulesAndWoodData(): ModulesAndWoodData {
        return this.#modulesAndWoodData
    }

    get selectModule(): SelectModule {
        return this.#selectModule
    }

    get selectWood(): SelectWood {
        return this.#selectWood
    }

    hasShipId(id: number): boolean {
        return this.#shipData.some((ship) => ship.id === id)
    }

    _getShipId(columnId: ShipColumnType): number {
        return this.#shipIds.get(columnId) ?? 0
    }

    setShip(columnId: ShipColumnType, shipId: number): void {
        this.#shipIds.set(columnId, shipId)
        SelectShip.setSelect(this.#selectShip.getSelect$(columnId), shipId)
        if (columnId === "base" && this.#baseId !== "ship-journey") {
            this._enableCompareSelects()
        }
    }

    _cloneShipData(currentColumnId: ShipColumnType, newColumnId: ShipColumnType): boolean {
        const shipId = this._getShipId(currentColumnId)
        if (shipId) {
            this.setShip(newColumnId, shipId)
        }

        return shipId !== undefined
    }

    _getModuleIds(columnId: ShipColumnType, type: ModuleType): number[] {
        return this._selectedUpgradeIdsPerType[columnId][type]
    }

    _cloneModuleData(currentColumnId: ShipColumnType, newColumnId: ShipColumnType): void {
        this.#selectModule.setup(newColumnId)
        this.#selectModule.resetSelects(newColumnId, this.getShipClass(newColumnId))
        if (this._selectedUpgradeIdsPerType[currentColumnId]) {
            for (const type of [...this.#selectModule.moduleTypes]) {
                const moduleIds = this._getModuleIds(currentColumnId, type)
                this.#modulesAndWoodData.setModules(newColumnId, type, moduleIds)
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

            this.refreshShips(newColumnId)
        }
    }

    _cloneShipToRight(currentColumnId: ShipColumnType): void {
        const newColumnIndex = this.#columnIds.indexOf(currentColumnId)
        const newColumnId = this.#columnIds[newColumnIndex + 1]

        const hasData = this._cloneShipData(currentColumnId, newColumnId)
        if (hasData) {
            this.#selectWood.cloneWoodData(currentColumnId, newColumnId)
            this._cloneModuleData(currentColumnId, newColumnId)

            this.refreshShips(newColumnId)
        }
    }

    _setupData(): void {
        const theoreticalMinSpeed = (d3Min(this.#shipData, (ship) => ship.speed.min) ?? 0) * 1.2
        const theoreticalMaxSpeed = this.#moduleAndWoodCaps.get("Max speed")?.cap.amount ?? Number.POSITIVE_INFINITY

        this.#minSpeed = theoreticalMinSpeed
        this.#maxSpeed = theoreticalMaxSpeed
        this.colorScale = d3ScaleLinear<string, string>()
            .domain([this.#minSpeed, 0, this.#maxSpeed])
            .range([colourRedDark, colourWhite, colourGreenDark])
            .interpolate(d3InterpolateHcl)

        const minShipMass = d3Min(this.#shipData, (ship) => ship.shipMass) ?? 0
        const maxShipMass = d3Max(this.#shipData, (ship) => ship.shipMass) ?? 0
        this.shipMassScale = d3ScaleLinear<number, number>().domain([minShipMass, maxShipMass]).range([100, 150])
    }

    async loadAndSetupData(): Promise<void> {
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

        this.#modulesAndWoodData = new ModulesAndWoodData(this.#baseId, this.#minSpeed, this.#maxSpeed)
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
            .domain([this.#minSpeed, 0, this.#maxSpeed])
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
                this.refreshShips(columnId)
            })
        }
    }

    _setupShipAndWoodSelectListener(columnId: ShipColumnType): void {
        const shipSel$ = this.#selectShip.getSelect$(columnId)

        Select.construct(shipSel$, { title: "Ship" })
        Select.reset(shipSel$)
        shipSel$.on("changed.bs.select", () => {
            console.log("changed.bs.select", shipSel$, shipSel$.val())
            this.#shipIds.set(columnId, Number(shipSel$.val()))
            if (this.#baseId !== "ship-journey") {
                this.#selectModule.setup(columnId)
                this._setupModuleSelectListener(columnId)
                this.#selectModule.resetSelects(columnId, this.getShipClass(columnId))
            }

            this.refreshShips(columnId)
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
                    this.refreshShips(columnId)
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

    _getShipName(id: number | undefined): string {
        return this.#shipData.find((ship) => ship.id === id)?.name ?? ""
    }

    _getSelectedData(): ShipColumnTypeList<SelectedData> {
        const selectedData = {} as ShipColumnTypeList<SelectedData>

        for (const columnId of this.#columnIds) {
            if (this.#shipIds.get(columnId)) {
                selectedData[columnId] = {
                    ship: this._getShipName(this.#shipIds.get(columnId)),
                    moduleData: this._getSelectedModules(columnId),
                    wood: this.#selectWood.getSelectedText(columnId),
                }
            }
        }

        return selectedData
    }

    initSelects(): void {
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

    async menuClicked(): Promise<void> {
        registerEvent("Menu", this.#baseName)

        if (this.#modal) {
            this.#modal.show()
        } else {
            await this.loadAndSetupData()
            this.#modal = new CompareShipsModal(
                this.#baseName,
                this.#columnIds,
                this.columnsCompare[this.columnsCompare.length - 1]
            )
            this.initSelects()
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
                    const woodId = this.#selectWood.getSelectedId(columnId, type)
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
        const shipDataDefault = this.#shipData.find((ship) => ship.id === this.#shipIds.get(columnId))!
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
        shipDataUpdated = this.#modulesAndWoodData.addModulesAndWoodData(shipDataDefault, shipDataUpdated, columnId)

        return shipDataUpdated
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
    refreshShips(compareId: ShipColumnType): void {
        if (this.#baseId === "ship-journey") {
            this.singleShipData = this.#shipData.find((ship) => ship.id === this.#shipIds.get(compareId))!
        } else {
            this.#modulesAndWoodData.modulesSelected(compareId)
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

    getShipClass(columnId: ShipColumnType): number {
        return this.#shipData.find((ship) => ship.id === this.#shipIds.get(columnId))?.class ?? 0
    }

    _setSelectedShip(columnId: ShipColumnType, ship: ShipBase | ShipComparison): void {
        this.selectedShips[columnId] = ship
    }
}
