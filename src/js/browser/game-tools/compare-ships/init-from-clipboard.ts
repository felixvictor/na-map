import { registerEvent } from "../../analytics"
import { CompareShips } from "./compare-ships"
import { ShipCompareSearchParamsRead } from "./search-params-read"

export const initFromClipboard = async (searchParams: ShipCompareSearchParamsRead): Promise<void> => {
    registerEvent("Menu", "Paste ship compare")

    const shipCompare = new CompareShips()
    await shipCompare.loadAndSetupData()
    await shipCompare.menuClicked()

    const selectedIds = searchParams.getSelectedIds(shipCompare.selectModule.moduleTypes)
    shipCompare.setSelectedIds(selectedIds)
}
