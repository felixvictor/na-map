/*!
 * This file is part of na-map.
 *
 * @file      Types for generated json.
 * @module    gen-json.d
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

// https://jvilk.com/MakeTypes/

import { ModifiersEntity } from "./node/api-item"
import { Point } from "./node/common-math";

/****************************
 * buildings.json
 */

export interface Building {
    id: number
    name: string
    result?: BuildingResult[]
    batch?: BuildingBatch
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
export interface BuildingWithResult {
    id: number
    name: string
    result: BuildingResult[]
    batch?: BuildingBatch
    levels: BuildingLevelsEntity[]
    byproduct?: []
}

/****************************
 * cannons.json
 */

// https://stackoverflow.com/a/54319112
export interface ObjectIndexer<T> {
    [key: string]: T
}

export interface Cannon extends ObjectIndexer<CannonEntity[]> {
    medium: CannonEntity[]
    long: CannonEntity[]
    carronade: CannonEntity[]
}
export type CannonGroupIndex =
    | string
    | CannonDamage
    | CannonTraverse
    | CannonDispersion
    | CannonGeneric
    | CannonPenetration
export interface CannonEntity extends ObjectIndexer<CannonGroupIndex> {
    name: string
    damage: CannonDamage
    traverse: CannonTraverse
    dispersion: CannonDispersion
    generic: CannonGeneric
    penetration: CannonPenetration
}
export type CannonElementIndex = CannonValue | undefined
export interface CannonDamage extends ObjectIndexer<CannonElementIndex> {
    basic: CannonValue
    "reload time": CannonValue
    splinter: CannonValue
    "per second": CannonValue
    penetration?: CannonValue
}
export interface CannonTraverse extends ObjectIndexer<CannonElementIndex> {
    up: CannonValue
    down: CannonValue
}
export interface CannonDispersion extends ObjectIndexer<CannonElementIndex> {
    horizontal: CannonValue
    vertical: CannonValue
}
export interface CannonGeneric extends ObjectIndexer<CannonElementIndex> {
    weight: CannonValue
    crew: CannonValue
}
export interface CannonPenetration extends ObjectIndexer<CannonElementIndex> {
    50: CannonValue
    100: CannonValue
    250: CannonValue
    500: CannonValue
    750: CannonValue
    1000: CannonValue
}
export interface CannonValue {
    value: number
    digits: number
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
export interface LootItemsEntity {
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
    properties?: ModulePropertiesEntity[]
    type: string
    APImodifiers: ModifiersEntity[]
    sortingGroup?: string
    permanentType?: string
    moduleType?: string
}
export interface ModulePropertiesEntity {
    modifier: string
    amount: number
    isPercentage: boolean
}

/****************************
 * nations.json
 */

export interface NationList extends ObjectIndexer<number | string> {
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
export interface OwnershipNation extends NationList {
    date: string
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
 * <servername>-pb.json
 */

export interface PortBattlePerServer {
    id: number
    name: string
    nation: string
    capturer: string
    lastPortBattle: string
    attackerNation: string
    attackerClan: string
    attackHostility: number
    portBattle: string
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

export interface PortGeneric {
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
 * <servername>-ports.json
 */

export interface PortPerServer
    extends ObjectIndexer<undefined | boolean | number | string | string[] | InventoryEntity[]> {
    id: number
    portBattleStartTime: number
    portBattleType: string
    nonCapturable: boolean
    conquestMarksPension: number
    portTax: number
    taxIncome: number
    netIncome: number
    tradingCompany: number
    laborHoursDiscount: number
    dropsTrading?: string[]
    consumesTrading?: string[]
    producesNonTrading?: string[]
    dropsNonTrading?: string[]
    inventory: InventoryEntity[]
}
export interface InventoryEntity {
    name: string
    buyQuantity: number
    buyPrice: number
    sellPrice: number
    sellQuantity: number
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
    module: string
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
 * <servername>-trades.json
 */

export interface Trade {
    good: string
    source: TradePrice
    target: TradePrice
    distance: number
    profitTotal: number
    quantity: number
    weightPerItem: number
}
interface TradePrice {
    id: number
    grossPrice: number
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

export interface Ship extends ObjectIndexer<any> {
    id: number
    name: string
    class: number
    gunsPerDeck: number[]
    guns: number
    broadside: ShipBroadside
    deckClassLimit: number[][]
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

export interface Wood extends ObjectIndexer<WoodTrimOrFrame[]> {
    trim: WoodTrimOrFrame[]
    frame: WoodTrimOrFrame[]
}
interface WoodTrimOrFrame {
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

/****************************
 * region-labels.json
 */

export interface GeoJson {
    type: "FeatureCollection"
    features: FeaturesEntity[]
}
export interface FeaturesEntity {
    type: "Feature"
    id: string
    geometry: Geometry
}
export interface Geometry {
    type: "Point" | "Polygon"
    coordinates: Point[]
}

/****************************
 * repairs.json
 */

export interface Repair extends ObjectIndexer<RepairAmount> {
    armorRepair: RepairAmount
    sailRepair: RepairAmount
    crewRepair: RepairAmount
}
export interface RepairAmount {
    percent: number
    time: number
    volume: number
}
