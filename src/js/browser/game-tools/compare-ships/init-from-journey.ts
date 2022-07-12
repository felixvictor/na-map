import { CompareShips } from "./compare-ships"
import Select from "util/select"

export const initFromJourney = async (): Promise<{
    select: Select
    shipNameAndSpeed: Map<number, { name: string; speedDegrees: number[] }>
}> => {
    const baseId = "ship-journey"
    const shipCompare = new CompareShips(baseId)
    await shipCompare.loadAndSetupData()

    const select = new Select(baseId, baseId, { placeholder: "Ship" }, shipCompare.getShipOptions())
    const shipNameAndSpeed = shipCompare.getShipNameAndSpeed()

    return { select, shipNameAndSpeed }
}
