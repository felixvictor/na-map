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
import { colourGreenDark, colourRedDark, colourWhite, getBaseIdOutput, getElementWidth } from "common/common-browser"
import { hullRepairsPercent, repairTime, rigRepairsPercent } from "common/common-game-tools"
import { copyDataClicked } from "./copy-to-clipboard"

import { moduleAndWoodCaps } from "./module-modifier"
import CompareShipsModal from "./modal"
import SaveImage from "./save-image"
import Select from "util/select"
import SelectModule from "./select-module"
import SelectShip from "./select-ship"
import SelectWood from "./select-wood"
import { CompareWoods, woodType } from "../compare-woods"
import { ColumnBase } from "./column-base"
import { ColumnCompare } from "./column-compare"

import ModulesAndWoodData from "./module-wood-data"
import { Module, ShipData, ShipRepairTime } from "common/gen-json"
import { HtmlString } from "common/interface"
import { ShipColumnTypeList, ModuleType, SelectedData, SelectedId } from "compare-ships"
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
    activeColumns = {} as ShipColumnTypeList<ColumnBase | ColumnCompare | undefined>
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
            this.activeColumns[columnId] = undefined
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

    setShip(columnId: ShipColumnType, shipId: number): void {
        this.#shipIds.set(columnId, shipId)
        SelectShip.setSelect(this.#selectShip.getSelect$(columnId), shipId)
        if (columnId === "base" && this.#baseId !== "ship-journey") {
            this._enableCompareSelects()
        }
    }

    _cloneShipData(currentColumnId: ShipColumnType, newColumnId: ShipColumnType): boolean {
        const shipId = this._getSelectedShipId(currentColumnId)
        if (shipId) {
            this.setShip(newColumnId, shipId)
        }

        return shipId !== undefined
    }

    _getSelectedModuleIdsPerType(columnId: ShipColumnType, type: ModuleType): number[] {
        return this.#selectModule.getSelectedUpgradeIds(columnId, type)
    }

    _cloneModuleData(currentColumnId: ShipColumnType, newColumnId: ShipColumnType): void {
        const shipClass = this.getShipClass(newColumnId)

        this.#selectModule.setup(newColumnId, shipClass)
        this.#selectModule.resetSelects(newColumnId, shipClass)

        for (const type of [...this.#selectModule.moduleTypes]) {
            const moduleIds = this._getSelectedModuleIdsPerType(currentColumnId, type)
            if (moduleIds) {
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
            await import(/* webpackChunkName: "data-setModules" */ "../../../../../lib/gen-generic/modules.json")
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
            const shipId = Number(this.#selectShip.getSelectValue(columnId))
            console.log("ship changed.bs.select", shipSel$, shipId)
            this.#shipIds.set(columnId, shipId)
            if (this.#baseId !== "ship-journey") {
                const shipClass = this.getShipClass(columnId)
                this.#selectModule.setup(columnId, shipClass)
                this._setupModuleSelectListener(columnId)
                this.#selectModule.resetSelects(columnId, shipClass)
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
                    console.log("wood changed.bs.select", woodSel$, woodSel$.val())
                    this.woodCompare.woodSelected(columnId, type)
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

    _getSelectedModuleTexts(columnId: ShipColumnType): Map<string, string> {
        const modules = new Map<string, string>()

        for (const type of [...this.#selectModule.moduleTypes]) {
            const ids = this._getSelectedModuleIdsPerType(columnId, type)
            const text = [] as string[]
            for (const id of ids) {
                const property = this.#selectModule.getModuleProperties(id)
                text.push(property?.name.replace(" Bonus", "") ?? "")
            }

            modules.set(type, text.join(", "))
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
                    moduleData: this._getSelectedModuleTexts(columnId),
                    wood: this.#selectWood.getSelectedText(columnId),
                }
            }
        }

        return selectedData
    }

    _getSelectedShipId(columnId: ShipColumnType): number {
        return this.#shipIds.get(columnId) ?? 0
    }

    _getSelectedWoodIds(columnId: ShipColumnType): number[] {
        return this.#selectWood.getSelectedIds(columnId)
    }

    _getSelectedModuleIds(columnId: ShipColumnType): Map<string, number[]> {
        const moduleIds = new Map<string, number[]>()

        for (const type of [...this.#selectModule.moduleTypes]) {
            const ids = this._getSelectedModuleIdsPerType(columnId, type)
            moduleIds.set(type, ids)
        }

        return moduleIds
    }

    _getSelectedIds(): ShipColumnTypeList<SelectedId> {
        const selectedIds = {} as ShipColumnTypeList<SelectedId>

        for (const columnId of this.#columnIds) {
            const shipId = this._getSelectedShipId(columnId)
            if (shipId) {
                selectedIds[columnId] = {
                    ship: shipId,
                    wood: this._getSelectedWoodIds(columnId),
                    modules: this._getSelectedModuleIds(columnId),
                }
            }
        }

        return selectedIds
    }

    _setSelectedShipId(columnId: ShipColumnType, shipId: number): void {
        this.#shipIds.set(columnId, shipId)
    }

    _setSelectedWoodIds(columnId: ShipColumnType, woodIds: number[]): void {
        this.#selectWood.setSelectedIds(columnId, woodIds)
    }

    _setSelectedModuleIds(columnId: ShipColumnType, moduleIds: Map<string, number[]>): void {
        this.#selectModule.setSelectedIds(columnId, moduleIds)
    }

    setSelectedIds(selectedIds: ShipColumnTypeList<SelectedId>): void {
        for (const columnId of this.#columnIds) {
            this._setSelectedShipId(columnId, selectedIds[columnId].ship)
            this._setSelectedWoodIds(columnId, selectedIds[columnId].wood)
            this._setSelectedModuleIds(columnId, selectedIds[columnId].modules)

            this.refreshShips(columnId)
        }
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

    _getShipDefaultData(columnId: ShipColumnType): ShipData {
        return this.#shipData.find((ship) => ship.id === this.#shipIds.get(columnId)) ?? ({} as ShipData)
    }

    /**
     * Get ship data for ship with id <id>
     * @param columnId - Column id
     * @returns Ship data
     */
    _getShipData(columnId: ShipColumnType): ShipData {
        const shipDataDefault = this._getShipDefaultData(columnId)
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
        shipDataUpdated = this.#modulesAndWoodData.addModulesAndWoodData(
            shipDataDefault,
            shipDataUpdated,
            columnId,
            this.#selectWood,
            this.#selectModule
        )

        return shipDataUpdated
    }

    _updateDifferenceProfileNeeded(id: ShipColumnType): void {
        if (id !== "base" && this.activeColumns[id]) {
            ;(this.activeColumns[id] as ColumnCompare).updateDifferenceProfile()
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

    _enableCompareSelects(): void {
        for (const compareId of this.columnsCompare) {
            this.#selectShip.enableSelect(compareId)
        }
    }

    getShipClass(columnId: ShipColumnType): number {
        return this.#shipData.find((ship) => ship.id === this.#shipIds.get(columnId))?.class ?? 0
    }

    _setSelectedShip(columnId: ShipColumnType, columnData: ColumnBase | ColumnCompare): void {
        this.activeColumns[columnId] = columnData
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

            // Copy data to clipboard (ctrl-c key event)
            this.#modal.getModalNode().addEventListener("keydown", (event: Event): void => {
                if ((event as KeyboardEvent).key === "KeyC" && (event as KeyboardEvent).ctrlKey) {
                    event.preventDefault()
                    copyDataClicked(this._getSelectedIds(), this.#selectModule.moduleTypes, this.#modal!.getModalNode())
                }
            })
            // Copy data to clipboard (click event)
            document.querySelector(`#${this.#modal.copyButtonId}`)?.addEventListener("click", (event) => {
                event.preventDefault()
                copyDataClicked(this._getSelectedIds(), this.#selectModule.moduleTypes, this.#modal!.getModalNode())
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

    refreshShips(columnId: ShipColumnType): void {
        console.log("refreshShips", columnId)
        if (this.#baseId === "ship-journey") {
            this.singleShipData = this._getShipDefaultData(columnId)
        } else {
            const singleShipData = this._getShipData(columnId)
            if (columnId === "base") {
                this._setSelectedShip(
                    columnId,
                    new ColumnBase(`${getBaseIdOutput(this.#baseId)}-${columnId}`, singleShipData, this)
                )
                for (const otherCompareId of this.columnsCompare) {
                    this.#selectShip.enableSelect(otherCompareId)
                    if (this.activeColumns[otherCompareId]) {
                        this._setSelectedShip(
                            otherCompareId,
                            new ColumnCompare(
                                `${getBaseIdOutput(this.#baseId)}-${otherCompareId}`,
                                singleShipData,
                                (this.activeColumns[otherCompareId] as ColumnCompare).shipCompareData,
                                this
                            )
                        )
                    }
                }
            } else {
                this._setSelectedShip(
                    columnId,
                    new ColumnCompare(
                        `${getBaseIdOutput(this.#baseId)}-${columnId}`,
                        (this.activeColumns.base as ColumnBase).shipData,
                        singleShipData,
                        this
                    )
                )
            }

            this._updateSailingProfile(columnId)
        }
    }
}
