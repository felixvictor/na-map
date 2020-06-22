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

import { ModifiersEntity } from "../node/api-item"
import { Point } from "./common-math"
import { ValuesType } from "utility-types"

import { CannonType, NationFullName, NationShortName, NationShortNameAlternative } from "./common"
import { ArrayIndex } from "./interface"
import { FrontlinesType, LootType } from "./types"

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
    [index: string]: T
}
type Cannon = {
    [K in CannonType]: CannonEntity[]
}
export interface CannonEntity {
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
    digits?: number
}

/****************************
 * items.json
 */

export interface TradeItem {
    id: number
    name: string
    price: number
    distanceFactor?: number
}

/****************************
 * loot.json
 */

export type LootTypeList<T> = {
    [K in LootType]: T
}
export type Loot = LootTypeList<LootLootEntity[] | LootChestsEntity[]>
interface LootGenericEntity {
    id: number
    name: string
}
interface LootLootEntity extends LootGenericEntity {
    items: LootLootItemsEntity[]
}
interface LootChestsEntity extends LootGenericEntity {
    weight: number
    lifetime: number
    itemGroup: LootChestGroup[]
}
export interface LootChestGroup {
    chance: number
    items: LootChestItemsEntity[]
}
export interface LootChestItemsEntity {
    id: number
    name: string
    amount: LootAmount
}
export interface LootLootItemsEntity extends LootChestItemsEntity {
    chance: number
}
interface LootAmount {
    min: number
    max: number
}

/****************************
 * modules.json
 */

export type Module = [string, ModuleEntity[]]
export interface ModuleEntity {
    id: number
    name: string
    usageType: string
    moduleLevel: string
    properties: ModulePropertiesEntity[]
    type: string
    hasSamePropertiesAsPrevious?: boolean
}
export interface ModuleConvertEntity extends ModuleEntity {
    APImodifiers: ModifiersEntity[]
    sortingGroup: string
    permanentType: string
    moduleType: string
}
export interface ModulePropertiesEntity {
    modifier: string
    amount: number
    isPercentage: boolean
}

/****************************
 * nations.json
 */

export type NationListOptional<T> = {
    [K in NationShortName]?: ArrayIndex<T | undefined>
}
export type NationArrayList<T> = {
    [K in NationShortName]: ArrayIndex<T>
}
export type NationList<T> = T &
    {
        [K in NationShortName]: T
    }
export type NationListAlternative<T> = {
    [K in NationShortName | NationShortNameAlternative]: T
}

export type OwnershipNation<T> = NationList<T> & {
    date: string
    keys?: NationShortName[]
}

/****************************
 * ownership.json
 */

export interface Ownership {
    region: string
    data: Group[]
}

export interface Group {
    group: string
    data: Line[]
}

export interface Line {
    label: string
    data: Segment[]
}

export interface Segment {
    timeRange: [TS, TS]
    val: Val
}

type TS = Date | number | string
type Val = number | string // qualitative vs quantitative

/****************************
 * pb-zones.json
 */
export interface PbZoneDefence {
    id: number
    forts: Point[]
    towers: Point[]
}
export interface PbZoneBasic {
    id: number
    joinCircle: Point
    pbCircles: Point[]
    spawnPoints: Point[]
}

export interface PbZoneRaid {
    id: number
    joinCircle: Point
    raidCircles: Point[]
    raidPoints: Point[]
}

export interface PbZone extends PbZoneBasic, PbZoneDefence, PbZoneRaid {
    id: number
    position: Point
}

/****************************
 * ports.json
 */

export type PortBattleType = "Small" | "Medium" | "Large"
export interface PortBasic {
    id: number
    name: string
    coordinates: Point
    angle: number
    region: string
    countyCapitalName: string
    county: string
    countyCapital: boolean
    shallow: boolean
    brLimit: number
    capturable: boolean
    portPoints: number
    portBattleType: PortBattleType
}

type PortIntersection =
    | boolean
    | number
    | string
    | undefined
    | GoodList
    | Point
    | Array<string | InventoryEntity | TradeGoodProfit>
export interface Port extends PortBasic, PortPerServer, PortBattlePerServer {
    [index: string]: PortIntersection
}

export interface TradeProfit {
    profit: number
    profitPerDistance: number
}

export interface TradeGoodProfit {
    name: string
    profit: TradeProfit
}
export interface PortWithTrades extends Port {
    tradePortId: number
    sailingDistanceToTradePort: number
    goodsToBuyInTradePort: TradeGoodProfit[]
    buyInTradePort: boolean
    goodsToSellInTradePort: TradeGoodProfit[]
    sellInTradePort: boolean
    distance: number
    isSource: boolean
    ownPort: boolean
    enemyPort: boolean
}

/****************************
 * <servername>-ports.json
 */

export type ConquestMarksPension = 1 | 3
export type TradingCompany = 0 | 1 | 2
export type LaborHoursDiscount = 0 | 1 | 2
export type GoodList = number[]
export interface PortPerServer {
    [index: string]: PortIntersection
    id: number
    portBattleStartTime: number
    availableForAll: boolean
    conquestMarksPension: ConquestMarksPension
    portTax: number
    taxIncome: number
    netIncome: number
    tradingCompany: TradingCompany
    laborHoursDiscount: LaborHoursDiscount
    dropsTrading?: GoodList
    consumesTrading?: GoodList
    producesNonTrading?: GoodList
    dropsNonTrading?: GoodList
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
 * <servername>-pb.json
 */

type AttackerNationName = NationFullName | "n/a" | ""
export interface PortBattlePerServer {
    id: number
    name: string
    nation: NationShortName
    capturer: string
    lastPortBattle: string
    attackerNation: AttackerNationName
    attackerClan: string
    attackHostility: number
    portBattle: string
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
    recipe: RecipeGroup[]
    ingredient: RecipeIngredientEntity[]
}
interface RecipeGroup {
    group: string
    recipes: RecipeEntity[]
}
interface RecipeEntity {
    id: number
    name: string
    module: string
    labourPrice: number
    goldPrice: number
    itemRequirements: RecipeItemRequirement[]
    result: RecipeResult
    craftGroup?: string
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
    profit?: number
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
    price: number
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ShipData extends ObjectIndexer<any> {
    battleRating: number
    bow: ShipHealth
    class: number
    crew: ShipCrew
    guns: ShipGuns
    holdSize: number
    id: number
    mast: ShipMast
    maxWeight: number
    name: string
    premium: boolean
    pump: ShipStructureOrPump
    repairTime: ShipRepairTime
    repairAmount?: ShipRepairAmount
    resistance?: ShipResistance
    rudder: ShipRudder
    sails: ShipSails
    ship: ShipShip
    shipMass: number
    sides: ShipHealth
    speed: ShipSpeed
    speedDegrees: number[]
    stern: ShipHealth
    structure: ShipStructureOrPump
    tradeShip: boolean
    upgradeXP: number
}
interface ShipGuns {
    total: number
    decks: number
    broadside: ShipBroadside
    gunsPerDeck: ShipGunDeck[]
    weight: ShipGunWeight
}
interface ShipGunDeck {
    amount: number
    maxCannonLb: number
    maxCarroLb: number
}
interface ShipBroadside {
    cannons: number
    carronades: number
}
interface ShipGunWeight {
    cannons: number
    carronades: number
}
interface ShipCrew {
    min: number
    max: number
    sailing: number
    cannons: number
    carronades: number
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
interface ShipRepairAmount {
    armour: number
    armourPerk: number
    sails: number
    sailsPerk: number
}
interface ShipRepairTime {
    stern: number
    bow: number
    sides: number
    rudder: number
    sails: number
    structure: number
    default?: number
}
interface ShipResistance {
    fire: number
    leaks: number
    splinter: number
}
interface ShipShip {
    acceleration: number
    deceleration: number
    firezoneHorizontalWidth: number
    maxSpeed: number
    rollAngle: number
    turnAcceleration: number
    waterlineHeight: number
    yardTurningAcceleration: number
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

export interface WoodData {
    [index: string]: ValuesType<WoodData>
    trim: WoodTrimOrFrame[]
    frame: WoodTrimOrFrame[]
}
interface WoodTrimOrFrame {
    id: number
    properties: WoodProperty[]
    type: string
    name: string
}
interface WoodProperty extends ObjectIndexer<boolean | number | string> {
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

/****************************
 * <servername>-frontlines.json
 */

export type FrontlinesPerServer = {
    [K in FrontlinesType]: NationArrayList<FrontLineValue>
}

export interface FrontLineValue {
    [index: string]: ValuesType<FrontLineValue>
    key: string
    value: number[]
}
