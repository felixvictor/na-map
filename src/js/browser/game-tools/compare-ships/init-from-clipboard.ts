import { registerEvent } from "../../analytics"
import { CompareShips } from "./compare-ships"
import { hashids } from "common/common-game-tools"
import { woodType } from "../compare-woods"

let shipCompare: CompareShips

export const initFromClipboard = async (urlParams: URLSearchParams): Promise<void> => {
    registerEvent("Menu", "Paste ship compare")

    shipCompare = new CompareShips()
    await shipCompare.loadAndSetupData()

    if (shipAndWoodsIds.length > 0) {
        await shipCompare.menuClicked()
        setShipAndWoodsSelects(shipAndWoodsIds)
        setModuleSelects(urlParams)
    }
}

const setShipAndWoodsSelects = (ids: number[]): void => {

}

/**
 * Get selected modules, new searchParam per module
 */
const setModuleSelects = (urlParams: URLSearchParams): void => {
    for (const [columnIndex, columnId] of shipCompare.columnIds.entries()) {
        let needRefresh = false
        for (const [typeIndex, type] of [...shipCompare.selectModule.moduleTypes].entries()) {
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
