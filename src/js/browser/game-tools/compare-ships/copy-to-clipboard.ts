import { registerEvent } from "../../analytics"
import { copyToClipboard } from "../../util"
import { ModuleType, SelectedId, ShipColumnTypeList } from "compare-ships"
import { ShipCompareSearchParamsWrite } from "./search-params-write"

export const copyDataClicked = (
    selectedIds: ShipColumnTypeList<SelectedId>,
    moduleTypes: Set<ModuleType>,
    modalNode: HTMLDivElement
): void => {
    registerEvent("Menu", "Copy ship compare")

    console.log("copyDataClicked", selectedIds)

    const url = new ShipCompareSearchParamsWrite(selectedIds, moduleTypes)
    const searchParams = url.getSearchParam()

    copyToClipboard(searchParams, modalNode)
}
