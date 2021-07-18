/*!
 * This file is part of na-map.
 *
 * @file      Compare ships file.
 * @module    game-tools/compare-ships/compare-ships
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { default as BSTooltip } from "bootstrap/js/dist/tooltip"

import { group as d3Group, max as d3Max, min as d3Min } from "d3-array"
import { interpolateHcl as d3InterpolateHcl } from "d3-interpolate"
import { ScaleLinear, scaleLinear as d3ScaleLinear } from "d3-scale"

import { registerEvent } from "../../analytics"
import { sortBy } from "common/common"
import { colourGreenDark, colourRedDark, colourWhite, getElementWidth } from "common/common-browser"
import { formatPP, formatSignFloat, formatSignPercentOldstyle } from "common/common-format"
import { hullRepairsPercent, isImported, repairTime, rigRepairsPercent, stripShipName } from "common/common-game-tools"
import { getOrdinal } from "common/common-math"
import { moduleAndWoodCaps, moduleAndWoodChanges } from "./module-modifier"

import { Module, ModuleEntity, ModulePropertiesEntity, ShipData, ShipRepairTime } from "common/gen-json"
import { HtmlString } from "common/interface"
import { WoodType, woodType } from "common/types"
import { ShipColumnTypeList, ModuleType, SelectedData, SelectedId, ShipSelectData } from "compare-ships"
import { ShipColumnType } from "./index"
import { WoodColumnType } from "../compare-woods"

import CompareShipsModal from "./modal"
import SaveImage from "./save-image"
import { copyDataClicked } from "./copy-to-clipboard"
import { WoodData } from "../compare-woods/data"
import { CompareShipsSelect } from "./select"
import { ColumnBase } from "./column-base"
import { ColumnCompare } from "./column-compare"
import ModulesAndWoodData from "./module-wood-data"

type CompareShipsBaseId = "compare-ship" | "ship-journey"
type ModuleOptionType = [number, ModuleEntity]

export class CompareShips {
    #maxSpeed = 0
    #minSpeed = 0
    #modal: CompareShipsModal | undefined = undefined
    #moduleDataDefault = {} as Module[]
    #modulesAndWoodData = {} as ModulesAndWoodData

    #shipData = {} as ShipData[]
    readonly #baseId: CompareShipsBaseId
    readonly #baseName: string
    readonly #columnIds: ShipColumnType[]
    readonly #menuId: HtmlString
    readonly #moduleAndWoodCaps = moduleAndWoodCaps
    readonly #moduleAndWoodChanges = moduleAndWoodChanges
    #moduleTypes!: Set<ModuleType>
    #moduleProperties = new Map<number, ModuleEntity>()
    #tooltips = new Map<number, BSTooltip | undefined>()

    activeColumns = {} as ShipColumnTypeList<ColumnBase | ColumnCompare | undefined>
    colorScale = {} as ScaleLinear<string, string>
    innerRadius = 0
    outerRadius = 0
    radiusSpeedScale = {} as ScaleLinear<number, number>
    shipMassScale = {} as ScaleLinear<number, number>
    singleShipData = {} as ShipData
    svgHeight = 0
    svgWidth = 0
    windProfileRotate = 0
    readonly colourScaleSpeedDiff: ScaleLinear<string, string>
    readonly columnsCompare: ShipColumnType[]

    #woodData = {} as WoodData
    #selects = {} as CompareShipsSelect

    constructor(id: CompareShipsBaseId = "compare-ship") {
        this.#baseId = id

        this.#baseName = this.#baseId === "compare-ship" ? "Compare ships" : this.#baseId
        this.#menuId = `menu-${this.#baseId}`

        this.colourScaleSpeedDiff = d3ScaleLinear<string, string>()
            .range([colourRedDark, colourWhite, colourGreenDark])
            .interpolate(d3InterpolateHcl)

        this.columnsCompare = this.#baseId === "compare-ship" ? ["c1", "c2"] : []
        this.#columnIds = [...this.columnsCompare]
        this.#columnIds.unshift("base")

        for (const columnId of this.#columnIds) {
            this.activeColumns[columnId] = undefined
        }
    }

    static _getModuleLevel(rate: number): string {
        return rate <= 3 ? "L" : rate <= 5 ? "M" : "S"
    }

    static _getModifierFromModule(properties: ModulePropertiesEntity[]): HtmlString {
        return `<p class="mb-0">${properties
            .map((property) => {
                let amount
                if (property.isPercentage) {
                    amount = formatSignPercentOldstyle(property.amount / 100)
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

    get columnIds(): ShipColumnType[] {
        return this.#columnIds
    }

    get menuId(): HtmlString {
        return this.#menuId
    }

    get modulesAndWoodData(): ModulesAndWoodData {
        return this.#modulesAndWoodData
    }

    get moduleTypes(): Set<ModuleType> {
        return this.#moduleTypes
    }

    get selects(): CompareShipsSelect {
        return this.#selects
    }

    hasShipId(id: number): boolean {
        return this.#shipData.some((ship) => ship.id === id)
    }

    _cloneShipData(currentColumnId: ShipColumnType, newColumnId: ShipColumnType): boolean {
        const shipId = this.#selects.getSelectedShipId(currentColumnId)

        if (shipId !== 0) {
            this.#selects.setShip(newColumnId, shipId)
            return true
        }

        return false
    }

    _addTooltip(element: HTMLLIElement, module: ModuleEntity): void {
        // Add tooltip with module properties
        element.dataset.bsOriginalTitle = CompareShips._getModifierFromModule(module.properties)
        const tooltip = new BSTooltip(element, { html: true })
        element.addEventListener("show.bs.tooltip", () => {
            // Remember shown tooltip
            this.#tooltips.set(module.id, tooltip)
        })
        element.addEventListener("hide.bs.tooltip", () => {
            this.#tooltips.set(module.id, undefined)
        })
    }

    _getModuleFromName(moduleName: string | null): ModuleEntity | undefined {
        let module: ModuleEntity | undefined

        this.#moduleDataDefault.some((type) => {
            module = type[1].find((module) => module.name === moduleName)
            return Boolean(module)
        })

        return module
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

    _initModuleSelects(columnId: ShipColumnType): void {
        const shipClass = this._getShipClass(columnId)
        for (const moduleType of this.#moduleTypes) {
            this.#selects.initModuleSelects(columnId, moduleType, this._getModuleOption(moduleType, shipClass))

            // console.log(moduleType, this.#selects.getModule$(columnId, moduleType))
            this.#selects
                .getModule$(columnId, moduleType)
                .on("show.bs.select", (event: Event) => {
                    const select$ = $(event.currentTarget as HTMLSelectElement)

                    // Remove 'select all' button
                    const parent = select$.parent()
                    parent.find("button.bs-select-all").remove()
                    // Change button colour
                    parent.find("button.bs-deselect-all").removeClass("btn-light")
                    parent.find("button.bs-deselect-all").addClass("btn-paper")

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

    _cloneWoodData(currentColumnId: ShipColumnType, newColumnId: ShipColumnType): void {
        this.#selects.enableWoodSelects(newColumnId)

        if (this.#selects.getSelectedWoodId(currentColumnId, "frame")) {
            for (const type of woodType) {
                const woodId = this.#selects.getSelectedWoodId(currentColumnId, type)
                this.#selects.setWood(newColumnId, type, woodId)
            }
        }
    }

    _cloneModuleData(currentColumnId: ShipColumnType, newColumnId: ShipColumnType): void {
        const moduleIds = this.#selects.getSelectedModuleIds(currentColumnId, this.#moduleTypes)

        if (!this.#selects.hasModuleSelects(newColumnId)) {
            this._initModuleSelects(newColumnId)
            this._setupModuleSelectListener(newColumnId)
        }

        this.#selects.setModules(newColumnId, moduleIds)
    }

    _clone(currentColumnId: ShipColumnType, newColumnId: ShipColumnType): void {
        const hasData = this._cloneShipData(currentColumnId, newColumnId)

        if (hasData) {
            this._cloneWoodData(currentColumnId, newColumnId)
            this._cloneModuleData(currentColumnId, newColumnId)

            this._refreshColumn(newColumnId)
        }
    }

    _cloneToLeft(currentColumnId: ShipColumnType): void {
        const newColumnIndex = this.#columnIds.indexOf(currentColumnId)
        const newColumnId = this.#columnIds[newColumnIndex - 1]

        this._clone(currentColumnId, newColumnId)
    }

    _cloneToRight(currentColumnId: ShipColumnType): void {
        const newColumnIndex = this.#columnIds.indexOf(currentColumnId)
        const newColumnId = this.#columnIds[newColumnIndex + 1]

        this._clone(currentColumnId, newColumnId)
    }

    _setupModuleSelectListener(columnId: ShipColumnType): void {
        for (const type of this.#moduleTypes) {
            const select$ = this.#selects.getModule$(columnId, type)
            select$.on("changed.bs.select", () => {
                this._refreshColumn(columnId)
            })
        }
    }

    _getShipClass = (columnId: ShipColumnType): number =>
        this.#shipData.find((ship) => ship.id === this.#selects.getSelectedShipId(columnId))?.class ?? 0

    _getModuleDataForShipClass(moduleType: string, shipClass: number): ModuleOptionType[] {
        return [...this.#moduleProperties].filter(
            (module) =>
                module[1].type.replace(/\s–\s[\s/A-Za-z\u25CB]+/, "") === moduleType &&
                (module[1].moduleLevel === "U" || module[1].moduleLevel === CompareShips._getModuleLevel(shipClass))
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

    _getModuleOption(moduleType: string, shipClass: number): HtmlString {
        // Group module data by sub type (e.g. "Gunnery")
        const modulesGrouped = this._getModulesGrouped(moduleType, shipClass)
        let options: string
        const moduleTypeWithSingleOption = new Set(["Permanent", "Ship trim"])

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

    _setOtherWoodSelect(columnId: WoodColumnType, type: WoodType): void {
        const otherType: WoodType = type === "frame" ? "trim" : "frame"
        const otherTypeValue = this.#selects.getSelectedWoodId(columnId, otherType)

        if (otherTypeValue === 0) {
            this.#selects.resetWoodSelect(columnId, otherType, this.#woodData.defaultWoodId[otherType])
        }
    }

    _setupShipAndWoodSelectListener(columnId: ShipColumnType): void {
        const shipSel$ = this.#selects.getShip$(columnId)

        shipSel$.on("changed.bs.select", () => {
            this._initModuleSelects(columnId)
            this._refreshColumn(columnId)

            if (columnId === "base") {
                this.#selects.enableShipCompareSelects()
            }

            this.#selects.enableWoodSelects(columnId)
        })

        for (const type of woodType) {
            const woodSel$ = this.#selects.getWood$(columnId, type)
            woodSel$.on("changed.bs.select", () => {
                this._setOtherWoodSelect(columnId, type)
                this._refreshColumn(columnId)
            })
        }
    }

    async _setupWoodData(): Promise<void> {
        this.#woodData = new WoodData(this.#baseId)
        await this.#woodData.init()
    }

    async _setupData(): Promise<void> {
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

        this._setupModuleData()
        await this._setupWoodData()
    }

    async loadAndSetupData(): Promise<void> {
        this.#moduleDataDefault = (
            await import(/* webpackChunkName: "data-setModules" */ "../../../../../lib/gen-generic/modules.json")
        ).default as Module[]
        this.#shipData = (
            await import(/* webpackChunkName: "data-ships" */ "../../../../../lib/gen-generic/ships.json")
        ).default as ShipData[]
        await this._setupData()
    }

    /**
     * Set graphics parameter
     */
    _setGraphicsParameters(): void {
        const column = this.#modal!.getModalNode().querySelector(".column-base") as HTMLElement

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
                ;(
                    document.querySelector(`#${this.#modal!.getCloneLeftButtonId(columnId)}`) as HTMLButtonElement
                ).addEventListener("click", () => {
                    this._cloneToLeft(columnId)
                })
            }

            // Clone right
            if (columnId !== this.columnsCompare[this.columnsCompare.length - 1]) {
                // Add listener except for last right column
                ;(
                    document.querySelector(`#${this.#modal!.getCloneRightButtonId(columnId)}`) as HTMLButtonElement
                ).addEventListener("click", () => {
                    this._cloneToRight(columnId)
                })
            }
        }
    }

    _setupModuleData(): void {
        // Get all setModules where change modifier (moduleChanges) exists
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

        this.#modulesAndWoodData = new ModulesAndWoodData(this.#baseId, this.#minSpeed, this.#maxSpeed)
    }

    _getShipDefaultData(columnId: ShipColumnType): ShipData {
        return this.#shipData.find((ship) => ship.id === this.#selects.getSelectedShipId(columnId)) ?? ({} as ShipData)
    }

    _getSelectedModuleData(columnId: ShipColumnType): ModuleEntity[] {
        const selectedModuleIds = this.#selects.getSelectedModuleIds(columnId, this.#moduleTypes)
        const moduleData = [] as ModuleEntity[]
        console.log("_getSelectedModuleData", selectedModuleIds)
        for (const [, moduleIds] of selectedModuleIds) {
            for (const moduleId of moduleIds) {
                moduleData.push(this.#moduleProperties.get(moduleId) ?? ({} as ModuleEntity))
            }
        }

        return moduleData
    }

    /**
     * Get ship data for ship with id <id>
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
            this.#woodData.getSelectedWoodData(this.#selects.getSelectedWoodIds(columnId)),
            this._getSelectedModuleData(columnId)
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

    _setSelectedShip(columnId: ShipColumnType, columnData: ColumnBase | ColumnCompare): void {
        this.activeColumns[columnId] = columnData
    }

    getShipOptions(): HtmlString {
        const selectData = [...d3Group(this.#shipData, (ship) => ship.class)]
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

        return selectData
            .map(
                (key) =>
                    `<optgroup label="${getOrdinal(Number(key.key), false)} rate">${key.values
                        .map(
                            (ship) =>
                                `<option data-subtext="${ship.battleRating}${
                                    isImported(ship.name) ? " Imported" : ""
                                }" value="${ship.id}">${stripShipName(ship.name)} (${ship.guns})</option>`
                        )
                        .join("")}</optgroup>`
            )
            .join("")
    }

    getShipNameAndSpeed = (): Map<number, { name: string; speedDegrees: number[] }> =>
        new Map(this.#shipData.map((ship) => [ship.id, { name: ship.name, speedDegrees: ship.speedDegrees }]))

    _initSelectListeners(): void {
        for (const columnId of this.#columnIds) {
            this._setupShipAndWoodSelectListener(columnId)
        }
    }

    _getShipName(id: number | undefined): string {
        return this.#shipData.find((ship) => ship.id === id)?.name ?? ""
    }

    _getSelectedModuleTexts(columnId: ShipColumnType): Map<string, string> {
        const modules = new Map<string, string>()

        for (const type of [...this.#moduleTypes]) {
            const ids = this.#selects.getSelectedModuleIdsPerType(columnId, type)
            const text = [] as string[]
            for (const id of ids) {
                const property = this.#moduleProperties.get(id)
                text.push(property?.name.replace(" Bonus", "") ?? "")
            }

            modules.set(type, text.join(", "))
        }

        return modules
    }

    _getSelectedWoodText(columnId: ShipColumnType): string[] {
        const woods = [] as string[]
        for (const type of woodType) {
            const woodId = this.#selects.getSelectedWoodId(columnId, type)
            woods.push(this.#woodData.getWoodName(woodId))
        }

        return woods
    }

    _getSelectedData(): ShipColumnTypeList<SelectedData> {
        const selectedData = {} as ShipColumnTypeList<SelectedData>

        for (const columnId of this.#columnIds) {
            const shipId = this.#selects.getSelectedShipId(columnId)

            if (shipId) {
                selectedData[columnId] = {
                    ship: this._getShipName(shipId),
                    moduleData: this._getSelectedModuleTexts(columnId),
                    wood: this._getSelectedWoodText(columnId),
                }
            }
        }

        return selectedData
    }

    _getSelectedIds(): ShipColumnTypeList<SelectedId> {
        const selectedIds = {} as ShipColumnTypeList<SelectedId>

        for (const columnId of this.#columnIds) {
            const shipId = this.#selects.getSelectedShipId(columnId)
            if (shipId) {
                selectedIds[columnId] = {
                    ship: shipId,
                    wood: this.#selects.getSelectedWoodIds(columnId),
                    modules: this.#selects.getSelectedModuleIds(columnId, this.#moduleTypes),
                }
            }
        }

        return selectedIds
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

            this.#selects = new CompareShipsSelect(this.#baseId, this.#columnIds, this.#modal)
            this.#selects.initShipAndWoodSelects(this.getShipOptions(), this.#woodData)
            this._initSelectListeners()
            this._initCloneListeners()

            // Copy data to clipboard (ctrl-c key event)
            this.#modal.getModalNode().addEventListener("keydown", (event: Event): void => {
                if ((event as KeyboardEvent).key === "KeyC" && (event as KeyboardEvent).ctrlKey) {
                    event.preventDefault()
                    copyDataClicked(this._getSelectedIds(), this.#moduleTypes, this.#modal!.getModalNode())
                }
            })
            // Copy data to clipboard (click event)
            document.querySelector(`#${this.#modal.copyButtonId}`)?.addEventListener("click", (event) => {
                event.preventDefault()
                copyDataClicked(this._getSelectedIds(), this.#moduleTypes, this.#modal!.getModalNode())
            })
            // Make image
            document.querySelector(`#${this.#modal.imageButtonId}`)?.addEventListener("click", async (event) => {
                registerEvent("Menu", "Ship compare image")
                event.preventDefault()
                const saveImage = new SaveImage(this.#baseId, this._getSelectedData(), this.#modal as CompareShipsModal)
                await saveImage.init()
            })
        }

        this._setGraphicsParameters()
    }

    _refreshColumn(columnId: ShipColumnType): void {
        if (this.#baseId === "ship-journey") {
            this.singleShipData = this._getShipDefaultData(columnId)
        } else {
            const singleShipData = this._getShipData(columnId)
            if (columnId === "base") {
                this._setSelectedShip(
                    columnId,
                    new ColumnBase(this.#modal!.getBaseIdOutput(columnId), singleShipData, this)
                )
                for (const otherCompareId of this.columnsCompare) {
                    this.#selects.enableShipSelect(otherCompareId)
                    if (this.activeColumns[otherCompareId]) {
                        this._setSelectedShip(
                            otherCompareId,
                            new ColumnCompare(
                                this.#modal!.getBaseIdOutput(otherCompareId),
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
                        this.#modal!.getBaseIdOutput(columnId),
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
