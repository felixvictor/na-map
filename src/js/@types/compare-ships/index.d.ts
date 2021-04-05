declare module "compare-ships" {
    import { Selection } from "d3-selection"
    import { ValuesType } from "utility-types"

    import { ArrayIndex } from "common/interface"
    import { ShipGunDeck } from "common/gen-json"
    import { ShipColumnType } from "js/browser/game-tools/compare-ships"

    interface ShipDisplayData {
        [index: string]: ValuesType<ShipDisplayData>

        acceleration: string
        additionalRow: string
        backArmor: string
        battleRating: string
        bowRepair?: string
        cannonBroadside: string
        cannonCrew: string
        cannonWeight: string
        cannonsPerDeck: [string, string]
        carroBroadside: string
        carroCrew: string
        carroWeight: string
        deceleration: string
        decks: string
        dispersionHorizontal: string
        dispersionVertical: string
        frontArmor: string
        guns: string
        gunsBack: number | string
        gunsFront: number | string
        holdSize: string
        hullRepairAmount: string
        hullRepairsNeeded: string
        leakResistance: string
        limitBack: ShipGunDeck
        limitFront: ShipGunDeck
        mastBottomArmor: string
        mastMiddleArmor: string
        mastTopArmor: string
        maxCrew: string
        maxSpeed: string
        maxWeight: string
        minCrew: string
        minSpeed?: string
        penetration: string
        reload: string
        repairTime: string
        rigRepairAmount: string
        rigRepairsNeeded: string
        rollAngle: string
        rumRepairsNeeded: string
        sailingCrew: string
        sails: string
        shipRating: string
        sideArmor: string
        splinterResistance: string
        sternRepair?: string
        structure: string
        traverseSide: string
        traverseUpDown: string
        turnAcceleration: string
        turnSpeed: string
        upgradeXP: string
        waterlineHeight: string
    }

    interface DragData {
        initX: number
        initY: number
        initRotate: number
        rotate: number
        compassText: Selection<SVGTextElement, DragData, HTMLElement, unknown>
        this: Selection<SVGGElement, DragData, HTMLElement, unknown>
        correctionValueDegrees: number
        compassTextX: number
        compassTextY: number
        speedTextX: number
        speedTextY: number
        type: "ship" | "windProfile"
    }

    interface SelectedData {
        moduleData: Map<string, string>
        ship: string
        wood: string[]
    }

    interface ShipSelectMap {
        key: number
        values: ShipSelectData[]
    }

    interface ShipSelectData {
        id: number
        name: string
        class: number
        battleRating: number
        guns: number
    }

    interface Property {
        properties: string[]
        isBaseValueAbsolute: boolean
    }

    interface Amount {
        amount: number
        isPercentage: boolean
    }

    interface AbsoluteAndPercentageAmount {
        absolute: number
        percentage: number
    }

    interface PropertyWithCap {
        properties: string[]
        cap: Amount
    }

    type ModuleType = string
    type ModuleId = number

    type ColumnArray<T> = {
        [K in ShipColumnType]: T[]
    }
    type ColumnNestedArray<T> = {
        [K in ShipColumnType]: ArrayIndex<T>
    }
    type ShipColumnTypeList<T> = {
        [K in ShipColumnType]: T
    }
    type ModuleTypeList<T> = {
        [K in ModuleType]: T
    }
}
