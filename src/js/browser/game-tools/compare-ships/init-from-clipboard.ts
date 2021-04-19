import { registerEvent } from "../../analytics"
import { CompareShips } from "./compare-ships"
import { ShipCompareSearchParamsRead } from "./search-params-read"

/*

http://localhost:8080/?v=12.6.3&cmp=EL5h5bfQ5hkpiNofDNh4NuR2fbR&00=Lo2&11=0D0&23=BZOr

 */

export const initFromClipboard = async (searchParams: ShipCompareSearchParamsRead): Promise<void> => {
    registerEvent("Menu", "Paste ship compare")

    const shipCompare = new CompareShips()
    await shipCompare.loadAndSetupData()
    await shipCompare.menuClicked()

    const selectedIds = searchParams.getSelectedIds(shipCompare.selectModule.moduleTypes)
    shipCompare.setSelectedIds(selectedIds)
}
