import { registerEvent } from "../../analytics"
import { CompareShips } from "./compare-ships"
import { ShipCompareSearchParamsRead } from "./search-params-read"
import { SelectedId, ShipColumnTypeList } from "compare-ships"

let shipCompare: CompareShips

export const initFromClipboard = async (searchParams: ShipCompareSearchParamsRead): Promise<void> => {
    registerEvent("Menu", "Paste ship compare")

    shipCompare = new CompareShips()
    await shipCompare.loadAndSetupData()
    await shipCompare.menuClicked()

    const selectedIds = searchParams.getSelectedIds(shipCompare.moduleTypes)
    setSelectedIds(selectedIds)
}

/*
http://localhost:8080/?v=12.6.9&cmp=gZ5H2WGcm9Ri8jF11t9B&00=Lo2&01=0D0&02=kvL&03=vbb9&10=xZA&11=7lG&12=MlM&13=KBLJTnnA
 */

const setSelectedIds = (selectedIds: ShipColumnTypeList<SelectedId>): void => {
    for (const columnId of Object.keys(selectedIds)) {
        shipCompare.selects.setShip(columnId, selectedIds[columnId].ship)
        shipCompare.selects.setWoods(columnId, selectedIds[columnId].wood)
        shipCompare._initModuleSelects(columnId)
        shipCompare.selects.setModules(columnId, selectedIds[columnId].modules)

        shipCompare._refreshColumn(columnId)
    }
}
