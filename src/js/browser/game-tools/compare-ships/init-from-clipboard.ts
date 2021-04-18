import { registerEvent } from "../../analytics"
import { CompareShips } from "./compare-ships"
import { hashids } from "common/common-game-tools"
import { ShipCompareSearchParamsRead } from "./search-params-read"

let shipCompare: CompareShips

/*

http://localhost:8080/?v=12.6.3&cmp=EL5h5bfQ5hkpiNofDNh4NuR2fbR&00=Lo2&11=0D0&23=BZOr

 */

export const initFromClipboard = async (searchParams: ShipCompareSearchParamsRead): Promise<void> => {
    registerEvent("Menu", "Paste ship compare")

    shipCompare = new CompareShips()
    await shipCompare.loadAndSetupData()
    await shipCompare.menuClicked()
    console.log("initFromClipboard moduleTypes", shipCompare.selectModule.moduleTypes)
    const selectedIds = searchParams.getSelectedIds(shipCompare.selectModule.moduleTypes)
    console.log("initFromClipboard", selectedIds, Object.keys(selectedIds))
        setShipAndWoodsSelects(selectedIds)
        setModuleSelects(selectedIds)
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
