import { registerEvent } from "../../analytics"
import { CompareShips } from "./compare-ships"
import { hashids } from "common/common-game-tools"
import { woodType } from "../compare-woods"

let shipCompare: CompareShips

export const initFromClipboard = async (urlParams: URLSearchParams): Promise<void> => {
    registerEvent("Menu", "Paste ship compare")

    shipCompare = new CompareShips()
    await shipCompare.loadAndSetupData()
    const shipAndWoodsIds = hashids.decode(urlParams.get("cmp") ?? "") as number[]
    if (shipAndWoodsIds.length > 0) {
        await shipCompare.menuClicked()
        setShipAndWoodsSelects(shipAndWoodsIds)
        setModuleSelects(urlParams)
    }
}

const setShipAndWoodsSelects = (ids: number[]): void => {
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

/**
 * Get selected modules, new searchParam per module
 */
const setModuleSelects = (urlParams: URLSearchParams): void => {
    for (const columnId of shipCompare.columnIds) {
        const columnIndex = shipCompare.columnIds.indexOf(columnId)
        let needRefresh = false
        for (const type of [...shipCompare.selectModule.moduleTypes]) {
            const typeIndex = [...shipCompare.selectModule.moduleTypes].indexOf(type)
            if (urlParams.has(`${columnIndex}${typeIndex}`)) {
                const moduleIds = hashids.decode(urlParams.get(`${columnIndex}${typeIndex}`)!) as number[]
                shipCompare.modulesAndWoodData.setModules(columnId, type, moduleIds)
                needRefresh = true
            }
        }

        if (needRefresh) {
            shipCompare.refreshShips(columnId)
        }
    }
}
