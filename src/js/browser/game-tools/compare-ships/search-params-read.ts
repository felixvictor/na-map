import { shipColumnType } from "./index"
import { SelectedId, ShipColumnTypeList } from "compare-ships"
import { ShipCompareSearchParams } from "./search-params"


/*

http://localhost:8080/?v=12.6.3&cmp=ovBudA4fv71fv9iLmF7mD&00=Lo2&11=0D0

 */
export class ShipCompareSearchParamsRead extends ShipCompareSearchParams {
    #selectedIds = {} as ShipColumnTypeList<SelectedId>

    constructor(urlParams: URLSearchParams) {
        super(urlParams)

        this.getShipsAndWoods()
        this.getModules()
        console.log("selectedIds", this.#selectedIds)
    }

    getSelectedIds(): ShipColumnTypeList<SelectedId> {
        return this.#selectedIds
    }

    getShipsAndWoods(): void {
        const ids = super.getShipsAndWoodIds()
        console.log("getShipsAndWoods", ids)
        let i = 0

        shipColumnType.some((columnId) => {
            this.#selectedIds[columnId] = {} as SelectedId
            this.#selectedIds[columnId].ship = ids[i]
            this.#selectedIds[columnId].wood = [ids[i + 1], ids[i + 2]]
            i += 3
            return i >= ids.length
        })

        /*
        shipColumnType.some((columnId) => {
            const shipId = ids[i]
            if (!shipCompare.hasShipId(shipId)) {
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

         */
    }

    getModules(): void {}
}
