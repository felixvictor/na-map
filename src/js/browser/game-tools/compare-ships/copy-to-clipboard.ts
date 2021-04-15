import { registerEvent } from "../../analytics"
import { appVersion } from "common/common-browser"
import { hashids } from "common/common-game-tools"
import { copyToClipboard } from "../../util"
import { ModuleType, SelectedId, ShipColumnTypeList } from "compare-ships"
import { shipColumnType } from "./index"

// Add selected ships and woods, triple (shipId, frameId, trimId) per column, flat array
const addShipsAndWoods = (selectedIds: ShipColumnTypeList<SelectedId>, ShipCompareUrl: URL): void => {
    let ids = [] as number[]

    for (const columnId of shipColumnType) {
        if (selectedIds[columnId]) {
            ids = [...ids, selectedIds[columnId].ship, ...selectedIds[columnId].wood]
        }
    }

    console.log("addShipsAndWoods", ids)
    ShipCompareUrl.searchParams.set("cmp", hashids.encode(ids))
}

export const copyDataClicked = (
    selectedIds: ShipColumnTypeList<SelectedId>,
    moduleTypes: Set<ModuleType>,
    modalNode: HTMLDivElement
): void => {
    registerEvent("Menu", "Copy ship compare")

    console.log("copyDataClicked", selectedIds)

    const ShipCompareUrl = new URL(window.location.href)

    // Add app version
    ShipCompareUrl.searchParams.set("v", encodeURIComponent(appVersion))
    addShipsAndWoods(selectedIds, ShipCompareUrl)
    //

    // Add selected modules, new searchParam per module
    for (const columnId of shipColumnType) {
        if (selectedIds[columnId]) {
            const columnIndex = shipColumnType.indexOf(columnId)
            console.log(columnId, columnIndex, selectedIds[columnId].modules)
            for (const moduleType of [...moduleTypes]) {
                const moduleTypeIndex = [...moduleTypes].indexOf(moduleType)
                const value = selectedIds[columnId].modules.get(moduleType) ?? []
                if (value.length > 0 ) {
                    const param = `${columnIndex}${moduleTypeIndex}`
                    console.log(moduleType, value, param, hashids.encode(value))
                    ShipCompareUrl.searchParams.set(param, hashids.encode(value))
                }
            }
        }
    }

    copyToClipboard(ShipCompareUrl.href, modalNode)
}
