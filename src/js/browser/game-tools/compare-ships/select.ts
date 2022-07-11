import { isEmpty } from "common/common"
import { WoodType, woodType } from "common/types"
import { HtmlString } from "common/interface"
import { ShipColumnTypeList, ModuleType, ModuleTypeList } from "compare-ships"
import { ShipColumnType } from "./index"
import { WoodColumnTypeList, WoodTypeList } from "compare-woods"
import Select, { SelectOptions } from "util/select"
import CompareShipsModal from "./modal"
import { WoodData } from "../compare-woods/data"

export class CompareShipsSelect {
    #columnsCompare: ShipColumnType[]
    #selectModule = {} as ShipColumnTypeList<ModuleTypeList<Select>>
    #selectShip = {} as ShipColumnTypeList<Select>
    #selectWood = {} as ShipColumnTypeList<WoodTypeList<Select>>
    readonly #baseId: HtmlString
    readonly #columnIds: ShipColumnType[]
    readonly #modal: CompareShipsModal

    constructor(baseId: HtmlString, columnIds: ShipColumnType[], modal: CompareShipsModal) {
        this.#baseId = baseId
        this.#columnIds = columnIds
        this.#modal = modal

        this.#columnsCompare = this.#columnIds.slice(1)

        for (const columnId of this.#columnIds) {
            this.#selectModule[columnId] = {}
        }
    }

    getShip$ = (columnId: ShipColumnType): JQuery<HTMLSelectElement> => this.#selectShip[columnId].select$

    getWood$ = (columnId: ShipColumnType, woodType: WoodType): JQuery<HTMLSelectElement> =>
        this.#selectWood[columnId][woodType].select$

    getModule$ = (columnId: ShipColumnType, moduleType: ModuleType): JQuery<HTMLSelectElement> =>
        this.#selectModule[columnId][moduleType].select$

    hasModuleSelects = (columnId: ShipColumnType): boolean => !isEmpty(this.#selectModule[columnId])

    setShip(columnId: ShipColumnType, shipId: number): void {
        this.#selectShip[columnId].setSelectValues(shipId)
        if (columnId === "base") {
            this.enableShipCompareSelects()
        }
    }

    setWood(columnId: ShipColumnType, woodType: WoodType, woodId: number): void {
        this.#selectWood[columnId][woodType].setSelectValues(woodId)
    }

    setWoods(columnId: ShipColumnType, woodIds: Map<string, number>): void {
        for (const [woodType, woodId] of woodIds) {
            this.setWood(columnId, woodType, woodId)
            this.enableWoodSelects(columnId)
        }
    }

    setModulesPerType(columnId: ShipColumnType, moduleType: ModuleType, ids: number[]): void {
        this.#selectModule[columnId][moduleType].setSelectValues(ids)
    }

    setModules(columnId: ShipColumnType, moduleIds: Map<string, number[]>): void {
        for (const [moduleType, ids] of moduleIds) {
            this.setModulesPerType(columnId, moduleType, ids)
        }
    }

    getSelectedShipId = (columnId: ShipColumnType): number | undefined =>
        Number(this.#selectShip[columnId].getValues()) ?? undefined

    getSelectedWoodId = (columnId: ShipColumnType, woodType: WoodType): number =>
        Number(this.#selectWood[columnId][woodType].getValues()) ?? 0

    getSelectedWoodIds(columnId: ShipColumnType): Map<string, number> {
        const woodIds = new Map<string, number>()

        for (const type of woodType) {
            const id = this.getSelectedWoodId(columnId, type)
            woodIds.set(type, id)
        }

        return woodIds
    }

    getSelectedModuleIds(columnId: ShipColumnType, moduleTypes: Set<ModuleType>): Map<string, number[]> {
        const moduleIds = new Map<string, number[]>()

        for (const type of moduleTypes) {
            const ids = this.getSelectedModuleIdsPerType(columnId, type)
            moduleIds.set(type, ids)
        }

        return moduleIds
    }

    resetWoodSelect(columnId: ShipColumnType, woodType: WoodType, woodId: number): void {
        this.#selectWood[columnId][woodType].setSelectValues(woodId)
    }

    enableWoodSelects(columnId: ShipColumnType): void {
        for (const type of woodType) {
            this.#selectWood[columnId][type].enable()
        }
    }

    enableShipSelect(columnId: ShipColumnType): void {
        this.#selectShip[columnId].enable()
    }

    enableShipCompareSelects(): void {
        for (const compareId of this.#columnsCompare) {
            this.enableShipSelect(compareId)
        }
    }

    getSelectedModuleIdsPerType(columnId: ShipColumnType, type: ModuleType): number[] {
        return Select.getSelectValueAsNumberArray(this.#selectModule[columnId][type].getValues())
    }

    initModuleSelects(columnId: string, moduleType: ModuleType, options: HtmlString): void {
        const divBaseId = this.#modal.getBaseId(columnId)
        const selectOptions: Partial<SelectOptions> = {
            actionsBox: true,
            countSelectedText(amount: number) {
                return `${amount} ${moduleType.toLowerCase()}s selected`
            },
            deselectAllText: "Clear",
            liveSearch: true,
            maxOptions: moduleType.startsWith("Ship trim") ? 6 : 5,
            selectedTextFormat: "count > 1",
            placeholder: `${moduleType}`,
            width: "170px",
        }

        this.#selectModule[columnId][moduleType] = new Select(
            `${divBaseId}-${moduleType.replace(/\s/, "")}`,
            this.#modal.getBaseIdSelects(columnId),
            selectOptions,
            options,
            true
        )
    }

    _initShipSelect(columnId: string, divBaseId: string, shipOptions: HtmlString): void {
        const divSelectsShipId = this.#modal.getBaseIdSelectsShip(columnId)

        this.#selectShip[columnId] = new Select(
            `${divBaseId}-ship`,
            divSelectsShipId,
            { placeholder: "Ship" },
            shipOptions
        )
        if (columnId !== "base") {
            this.#selectShip[columnId].disable()
        }
    }

    _initWoodSelects(columnId: string, divBaseId: string, woodData: WoodData): void {
        const divSelectsWoodsId = this.#modal.getBaseIdSelects(columnId)
        this.#selectWood[columnId] = {} as WoodColumnTypeList<Select>

        for (const type of woodType) {
            this.#selectWood[columnId][type] = new Select(
                `${divBaseId}-${type}`,
                divSelectsWoodsId,
                { placeholder: `Wood ${type}`, width: "170px" },
                woodData.getOptions(type)
            )
            this.#selectWood[columnId][type].disable()
        }
    }

    initShipAndWoodSelects(shipOptions: HtmlString, woodData: WoodData): void {
        for (const columnId of this.#columnIds) {
            const divBaseId = this.#modal.getBaseId(columnId)
            this._initShipSelect(columnId, divBaseId, shipOptions)
            this._initWoodSelects(columnId, divBaseId, woodData)
        }
    }
}
