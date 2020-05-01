import * as d3Selection from "d3-selection"
import { ValuesType } from "utility-types"

export interface ShipDisplayData {
    [index: string]: ValuesType<ShipDisplayData>

    acceleration: string
    additionalRow: string
    backArmor: string
    battleRating: string
    bowRepair?: string
    cannonBroadside: string
    cannonsPerDeck: [string, string]
    carroBroadside: string
    deceleration: string
    decks: string
    fireResistance: string
    firezoneHorizontalWidth: string
    frontArmor: string
    guns: string
    gunsBack: number | string
    gunsFront: number | string
    halfturnTime: string
    holdSize: string
    hullRepairAmount: string
    hullRepairsNeeded: string
    leakResistance: string
    limitBack: number[]
    limitFront: number[]
    mastBottomArmor: string
    mastMiddleArmor: string
    mastTopArmor: string
    maxCrew: string
    maxSpeed: string
    maxTurningSpeed: string
    maxWeight: string
    minSpeed?: string
    minCrew: string
    pump: string
    repairTime: string
    rigRepairAmount: string
    rigRepairsNeeded: string
    rudder: string
    rumRepairsNeeded: string
    sailingCrew: string
    sails: string
    shipRating: string
    sideArmor: string
    splinterResistance: string
    sternRepair?: string
    structure: string
    upgradeXP: string
    waterlineHeight: string
}

export interface DragData {
    initX: number
    initY: number
    initRotate: number
    rotate: number
    compassText: d3Selection.Selection<SVGTextElement, DragData, HTMLElement, any>
    this: d3Selection.Selection<SVGGElement, DragData, HTMLElement, any>
    correctionValueDegrees: number
    compassTextX: number
    compassTextY: number
    speedTextX: number
    speedTextY: number
    type: "ship" | "windProfile"
}
