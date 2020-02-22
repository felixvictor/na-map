/**
 * This file is part of na-map.
 *
 * @file      Types for generated json.
 * @module    types-gen-json
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

// https://jvilk.com/MakeTypes/

import { Point } from "./common"

/****************************
 * buildings.json
 */

export interface Building {
    id: number
    name: string
    result: BuildingResult[] | []
    batch: BuildingBatch | []
    levels: BuildingLevelsEntity[]
    byproduct?: []
}
export interface BuildingResult {
    name: string
    price: number
}
export interface BuildingBatch {
    price: number
    amount: number
    labour: number
}
export interface BuildingLevelsEntity {
    labourDiscount: number
    production: number
    maxStorage: number
    price: number
    materials: BuildingMaterialsEntity[]
}
export interface BuildingMaterialsEntity {
    item: string
    amount: number
}

/****************************
 * cannons.json
 */
export interface Cannon {
    medium: CannonEntity[]
    long: CannonEntity[]
    carronade: CannonEntity[]
    [key: string]: CannonEntity[]
}
export interface CannonEntity {
    name: string
    damage: CannonDamage
    traverse: CannonTraverse
    dispersion: CannonDispersion
    generic: CannonGeneric
    penetration: CannonPenetration
    [key: string]: string | CannonDamage | CannonTraverse | CannonDispersion | CannonGeneric | CannonPenetration
}
export interface CannonDamage {
    basic: CannonValue
    "reload time": CannonValue
    splinter: CannonValue
    "per second": CannonValue
    penetration?: CannonValue
}
export interface CannonValue {
    value: number
    digits: number
}
export interface CannonTraverse {
    up: CannonValue
    down: CannonValue
}
export interface CannonDispersion {
    horizontal: CannonValue
    vertical: CannonValue
}
export interface CannonGeneric {
    weight: CannonValue
    crew: CannonValue
}
export interface CannonPenetration {
    50: CannonValue
    100: CannonValue
    250: CannonValue
    500: CannonValue
    750: CannonValue
    1000: CannonValue
    [key: string]: CannonValue
}

/****************************
 * loot.json
 */

export interface Loot {
    loot: LootLootEntity[]
    chests: LootChestsEntity[]
}
interface LootLootEntity {
    id: number
    name: string
    items: LootItemsEntity[]
}
interface LootItemsEntity {
    id: number
    name: string
    chance: number
    amount: LootAmount
}
interface LootAmount {
    min: number
    max: number
}
interface LootChestsEntity {
    id: number
    name: string
    weight: number
    lifetime: number
    items: LootItemsEntity[]
}

/****************************
 * modules.json
 */

export interface ModuleEntity {
    id: number
    name: string
    usageType: string
    moduleLevel: string
    properties?: ModulePropertiesEntity
    type: string
}
interface ModulePropertiesEntity {
    modifier: string
    amount: number
    isPercentage: boolean
}
type Module = string | ModuleEntity[]

/****************************
 * nations.json
 */

export interface OwnershipPortsPerNation {
    date: string
    NT: number
    PR: number
    ES: number
    FR: number
    GB: number
    VP: number
    DK: number
    SE: number
    US: number
    RU: number
    DE: number
    PL: number
}

/****************************
 * ownership.json
 */

export interface Ownership {
    region: string
    data: OwnershipGroup[]
}
interface OwnershipGroup {
    group: string
    data: OwnershipLabel[]
}
interface OwnershipLabel {
    label: string
    data: OwnershipLabelRange[]
}
interface OwnershipLabelRange {
    timeRange: string[]
    val: string
    labelVal: string
}

/****************************
 * pb-zones.json
 */

export interface PbZone {
    id: number
    position: Point
    pbCircles: Point[]
    forts: Point[]
    towers: Point[]
    joinCircles: Point[]
    raidCircles: Point[]
    raidPoints: Point[]
}

/****************************
 * ports.json
 */

export interface Port {
    id: number
    name: string
    coordinates: Point
    angle: number
    textAnchor: string
    region: string
    countyCapitalName: string
    county: string
    countyCapital: boolean
    shallow: boolean
    availableForAll: boolean
    brLimit: number
    portPoints: number
    portBattleStartTime: number
    portBattleType: string
    nonCapturable: boolean
    conquestMarksPension: number
}

/****************************
 * prices.json
 */

export interface Price {
    standard: PriceStandardWood[]
    seasoned: PriceSeasonedWood[]
}
export interface PriceStandardWood {
    name: string
    real: number
    labour: number
}
export interface PriceSeasonedWood {
    name: string
    real: number
    labour: number
    doubloon: number
    tool: number
}

/****************************
 * recipes.json
 */

export interface Recipe {
    recipe: RecipeEntity[]
    ingredient: RecipeIngredientEntity[]
}
interface RecipeEntity {
    id: number
    name: string
    labourPrice: number
    goldPrice: number
    itemRequirements: RecipeItemRequirement[]
    result: RecipeResult
    craftGroup: string
    serverType: string
}
interface RecipeItemRequirement {
    name: string
    amount: number
}
interface RecipeResult {
    id: number
    name: string
    amount: number
}
interface RecipeIngredientEntity {
    id: number
    name: string
    recipeNames: string[]
}

/****************************
 * ship-blueprints.json
 */

export interface ShipBlueprint {
    id: number
    name: string
    wood: ShipBlueprintResource[]
    resources: ShipBlueprintResource[]
    provisions: number
    doubloons: number
    permit: number
    ship: ShipBlueprintShip
    shipyardLevel: number
    craftLevel: number
    craftXP: number
    labourHours: number
}
interface ShipBlueprintResource {
    name: string
    amount: number
}
interface ShipBlueprintShip {
    id: number
    name: string
    mass: number
}

/****************************
 * ships.json
 */

export interface Ship {
    id: number
    name: string
    class: number
    gunsPerDeck: number[]
    guns: number
    broadside: ShipBroadside
    deckClassLimit: number[]
    shipMass: number
    battleRating: number
    decks: number
    holdSize: number
    maxWeight: number
    crew: ShipCrew
    speedDegrees: number[]
    speed: ShipSpeed
    sides: ShipHealth
    bow: ShipHealth
    stern: ShipHealth
    structure: ShipStructureOrPump
    sails: ShipSails
    pump: ShipStructureOrPump
    rudder: ShipRudder
    upgradeXP: number
    repairTime: ShipRepairTime
    ship: ShipShip
    mast: ShipMast
    premium: boolean
    tradeShip: boolean
}
interface ShipBroadside {
    cannons: number
    carronades: number
}
interface ShipCrew {
    min: number
    max: number
    sailing: number
}
interface ShipSpeed {
    min: number
    max: number
}
interface ShipHealth {
    armour: number
    thickness: number
}
interface ShipStructureOrPump {
    armour: number
}
interface ShipSails {
    armour: number
    risingSpeed: number
}
interface ShipRudder {
    armour: number
    turnSpeed: number
    halfturnTime: number
    thickness: number
}
interface ShipRepairTime {
    stern: number
    bow: number
    sides: number
    rudder: number
    sails: number
    structure: number
}
interface ShipShip {
    waterlineHeight: number
    firezoneHorizontalWidth: number
    structureLeaksPerSecond: number
    deceleration: number
    acceleration: number
    turningAcceleration: number
    turningYardAcceleration: number
    maxSpeed: number
}
interface ShipMast {
    bottomArmour: number
    middleArmour: number
    topArmour: number
    bottomThickness: number
    middleThickness: number
    topThickness: number
}

/****************************
 * woods.json
 */

export interface Wood {
    trim: WoodTrimEntityOrFrameEntity[]
    frame: WoodTrimEntityOrFrameEntity[]
}
interface WoodTrimEntityOrFrameEntity {
    id: number
    properties: WoodProperty[]
    type: string
    name: string
}
interface WoodProperty {
    modifier: string
    amount: number
    isPercentage: boolean
}
