import { appVersion } from "common/common-browser"
import { hashids } from "common/common-game-tools"
import { shipColumnType } from "./index"
import { ModuleType, SelectedId, ShipColumnTypeList } from "compare-ships"
import { ShipCompareSearchParams } from "./search-params"

export class ShipCompareSearchParamsWrite extends ShipCompareSearchParams {
    #moduleTypes: Set<ModuleType>
    #selectedIds: ShipColumnTypeList<SelectedId>
    #shipCompareUrl = new URL(window.location.href)

    constructor(selectedIds: ShipColumnTypeList<SelectedId>, moduleTypes: Set<ModuleType>) {
        super()
        this.#selectedIds = selectedIds
        this.#moduleTypes = moduleTypes

        this._addVersion()
        this._addShipsAndWoods()
        this._addModules()
    }

    getSearchParam(): string {
        return this.#shipCompareUrl.href
    }

    _setVersion(version: string): void {
        this.#shipCompareUrl.searchParams.set("v", version)
    }

    _addVersion(): void {
        const version = encodeURIComponent(appVersion)

        this._setVersion(version)
    }

    _setShipsAndWoodIds(ids: number[]): void {
        this.#shipCompareUrl.searchParams.set("cmp", hashids.encode(ids))
    }

    // Add selected ships and woods, triple (shipId, frameId, trimId) per column, flat array
    _addShipsAndWoods(): void {
        let ids = [] as number[]

        for (const columnId of shipColumnType) {
            if (this.#selectedIds[columnId]) {
                ids = [...ids, this.#selectedIds[columnId].ship, ...this.#selectedIds[columnId].wood]
            }
        }

        console.log("addShipsAndWoods", ids)
        this._setShipsAndWoodIds(ids)
    }

    _setModules(param: string, value: number[]): void {
        this.#shipCompareUrl.searchParams.set(param, hashids.encode(value))
    }

    // Add selected modules, new searchParam per module
    _addModules(): void {
        for (const [columnIndex, columnId] of shipColumnType.entries()) {
            if (this.#selectedIds[columnId]) {
                console.log(columnId, columnIndex, this.#selectedIds[columnId].modules)
                for (const [moduleTypeIndex, moduleType] of [...this.#moduleTypes].entries()) {
                    const value = this.#selectedIds[columnId].modules.get(moduleType) ?? []
                    if (value.length > 0) {
                        const param = `${columnIndex}${moduleTypeIndex}`
                        console.log(moduleType, value, param, hashids.encode(value))
                        this._setModules(param, value)
                    }
                }
            }
        }
    }
}
