import { registerEvent } from "../../analytics"
import { CompareShips } from "./compare-ships"
import { hashids } from "common/common-game-tools"
import { ShipCompareSearchParamsRead } from "./search-params-read"

let shipCompare: CompareShips

export const initFromClipboard = async (searchParams: ShipCompareSearchParamsRead): Promise<void> => {
    registerEvent("Menu", "Paste ship compare")

    console.log("initFromClipboard", searchParams._getVersion())
    shipCompare = new CompareShips()
    await shipCompare.loadAndSetupData()

    const selectedIds = searchParams.getSelectedIds()
    if (selectedIds[0].ship) {
        await shipCompare.menuClicked()
        setShipAndWoodsSelects(selectedIds)
        setModuleSelects(selectedIds)
    }
}

/**
 * Get selected setModules, new searchParam per module
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
