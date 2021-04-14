import { CompareShips } from "./compare-ships"

export const initFromJourney = async (): Promise<CompareShips> => {
    const shipCompare = new CompareShips("ship-journey")

    await shipCompare.loadAndSetupData()
    shipCompare.initSelects()

    return shipCompare
}
