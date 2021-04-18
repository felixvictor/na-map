import { SelectedId, ShipColumnTypeList } from "compare-ships"
import { hashids } from "common/common-game-tools"
import { woodType } from "../compare-woods"
import { ShipCompareSearchParams } from "./search-params"

export class ShipCompareSearchParamsRead extends ShipCompareSearchParams {
    #selectedIds = {} as ShipColumnTypeList<SelectedId>
    #urlParams: URLSearchParams

    constructor(urlParams: URLSearchParams) {
        super()
        this.#urlParams = urlParams

        this._getVersion()
        this._getShipsAndWoods()
        this._getModules()
    }

    _getVersion(): void {}

    _getShipsAndWoods(): void {
        const shipAndWoodsIds = this._getShipsAndWoodIds()
        let i = 0

        shipCompare.columnIds.some((columnId) => {
            if (!shipCompare.hasShipId(ids[i])) {
                return false
            }

            shipCompare.setShip(columnId, ids[i])
            i += 1

            shipCompare.woodCompare.select.enableSelects(columnId)
            shipCompare.selectModule.setup(columnId)
            shipCompare.selectModule.resetSelects(columnId, shipCompare.getShipClass(columnId))

            if (ids[i]) {
                for (const type of woodType) {
                    shipCompare.selectWood.setWood(columnId, type, ids[i])
                    i += 1
                }
            } else {
                i += 2
            }

            shipCompare.refreshShips(columnId)
            return i >= ids.length
        })
    }

    _getShipsAndWoodIds(): number[] {
        return hashids.decode(this.#urlParams.get("cmp") ?? "") as number[]
    }

    _getModules(): void {}
}
