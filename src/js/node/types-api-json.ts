/**
 * This file is part of na-map.
 *
 * @file      Types for api json.
 * @module    types-api-json
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

// https://jvilk.com/MakeTypes/

/****************************
 * Items
 */

export interface APIItem {
    __type: string
    Name: string
    Id: number
    NotUsed: boolean
    NotTradeable: boolean
    PreventTeleport: boolean
    DropChanceReductionPerItem: number
    MaxStack: number
    ItemWeight: number
    BasePrice: number
    SellPrice: PriceModifier
    BuyPrice: PriceModifier
    PriceReductionAmount: number
    ConsumedScale: number
    NonConsumedScale: number
    PriceTierQuantity: number
    MaxQuantity: number
    SortingOverrideTemplateType: string
    SortingGroup: string
    SellableInShop: boolean
    CanBeSoldToShop: boolean
    ResetStockOnServerStart: boolean
    SellPriceCoefficient: number
    ItemType: string
    MongoID: string
    ShowInContractsSelector: boolean
    DeliveryOrderOptions: DeliveryOrderOptions
    PortPrices: PortPrices
    InitialAmount?: number
    ProductionScale?: number
    ConsumptionScale?: number
    SpawnChance?: number
    AutoFillCoefficient?: number
    ProducedByNation?: number
    ConsumedByNation?: number
    ProducedInCapitals?: boolean
    ProducedInTowns?: boolean
    ConsumedInCapitals?: boolean
    ConsumedInTowns?: boolean
    Modifiers?: ModifiersEntity[]
    scoreValue?: number
    UsageType?: string
    MaxItems?: number
    MinResourcesAmount?: number
    MaxResourcesAmount?: number
    BreakUpItemsAmount?: number
    CanBeBreakedUp?: string
    bCanBeBreakedUp?: boolean
    PermanentType?: string
    BookType?: string
    ModuleType?: string
    ModuleLevel?: string
    Limitation1_Value?: number
    Limitation2_Value?: number
    Limitation3_Value?: number
    Type?: string
    Form?: string
    Material?: string
    Caliber?: number
    Weight?: number
    Template?: string
    Items?: ItemsEntity[]
    ItemsToGive?: MinMax
    lootProbability?: number[]
    itemProbability?: number[]
    quantityProbability?: number[]
    Nation?: number
    EventLootTable?: boolean
    Class?: number
    LaborPrice?: number
    BuildingRequirements?: BuildingRequirementsEntity[]
    FullRequirements?: TemplateEntity[]
    GoldRequirements?: number
    Results?: TemplateEntity[]
    ServerType?: string
    NationAvailability?: number[]
    CraftGroup?: string
    RequiresLevel?: number
    GivesXP?: number
    AccessibleByLevel?: boolean
    BreakUpRecipeSpawnChance?: number
    DisposeOnUse?: boolean
    CanBeUsedInPort?: boolean
    CanBeUsedInOpenWorld?: boolean
    Qualities?: QualitiesEntity[]
    WoodTypeDescs?: WoodTypeDescsEntity[]
    RefillClass?: number
    RepairPriceCoefficient?: number
    ShipTemplateName?: string
    Specs?: Specs
    VisualTemplateId?: number
    HiddenModuleTemplates?: number[]
    DefaultCannons?: number[]
    BotCannons?: number[]
    BotCannonsVariants?: BotCannonsVariantsEntity[]
    BaseDurability?: number
    QualityPrices?: number[]
    Premium?: boolean
    CaptureNPCType?: string
    CanBeUsedInFleet?: boolean
    FleetHirePriceCoefficient?: number
    CanBeSoldOnlyIn?: number
    RepairKits?: PriceModifier
    RepairKitPriceModifier?: PriceModifier
    RepairKitCooldownModifier?: PriceModifier
    RepairAmount?: number
    HealthInfo?: HealthInfo
    ShipMass?: number
    BattleRating?: number
    GunsPerDeck?: number[]
    ShipType?: number
    HiddenModulesCount?: number
    PortBonusModulesCount?: number
    PersistentModulesCount?: number
    PermanentModulesLimit?: Limit[]
    UpgradeModulesCount?: number
    MinUpgradeModulesCount?: number
    UpgradeModulesLimit?: Limit[]
    OfficerSlots?: number
    Decks?: number
    DeckClassLimit?: Limit[]
    FrontDecks?: number
    FrontDeckClassLimit?: Limit[]
    BackDecks?: number
    BackDeckClassLimit?: Limit[]
    MortarDecks?: number
    MortarDeckClassLimit?: Limit[]
    HoldSize?: number
    MaxWeight?: number
    MinCrewRequired?: number
    ShipClassType?: number
    Unlocks?: Unlocks
    OverrideTotalXpForUpgradeSlots?: number
    Skins?: SkinsEntity[]
    Limitations?: null[]
    HostilityScore?: number
    LifetimeSeconds?: number
    PlacementDistance?: number
    PortRequirements?: PortRequirementsEntity[]
    MaxFlagsPerPortPerNation?: number
    FlagDecreaseTime?: number
    StartConquestTime?: number
    MinPortSize?: number
    MaxPortSize?: number
    MinPortPrice?: number
    MaxPortPrice?: number
    PortBattleXpScale?: number
    PortBattleGoldScale?: number
    PortBattleWinnersLootTables?: number[]
    MinAvailabilityHours?: number
    UtcTimeUnavailableStart?: number
    UtcTimeUnavailableEnd?: number
    PurchaseBlockAfterConquestHours?: number
    RankToBuy?: number[]
    CanBeConverted?: string
    ConvertsTo?: ItemsEntityOrConvertsToEntity[]
    ExtraLootTable?: number
    LootTable?: number
    ProduceResource?: number
    RequiredPortResource?: number
    BaseProduction?: number
    Levels?: LevelsEntity[]
    Amount?: number
    ArmorAmount?: number
    SailsAmount?: number
    ShipTemplate?: number
    SkinIndex?: number
    GeneralChest?: boolean
    ExtendedLootTable?: number[]
    ShipQuality?: number
    WoodType?: number
    HiddenModule1?: number
    HiddenModule2?: number
    ShipPermanentSlots?: number
    Upgrade?: number
    Flags?: FlagsEntity[]
    NationId?: number
    FlagId?: number
    WoodTypes?: number[]
    Hidden1?: number[]
    Hidden2?: number[]
    PortBonuses?: PortBonusesEntity[]
    ShipPermanentSlotsCount?: MinMax
    ShipPersistentModuleSlotsCount?: MinMax
    PortBonusesCount?: MinMax
}
interface PriceModifier {
    x: number
    y: number
}
interface DeliveryOrderOptions {
    Valid: boolean
    StockSizeCraftExperience: number
    StockSize: number
}
interface PortPrices {
    Valid: boolean
    Produced: SellAndBuyPrices
    Consumed: SellAndBuyPrices
    Regular: SellAndBuyPrices
    FullStackAmount: number
    FullStack: SellAndBuyPrices
    RandomPct: number
    RangePct: number
}
interface SellAndBuyPrices {
    SellPrice: MinMax
    BuyPrice: MinMax
}
interface ModifiersEntity {
    Slot: string
    MappingIds?: string[]
    Absolute: number
    Percentage: number
}
interface ItemsEntity {
    Template?: number
    Chance?: number
    Stack?: MinMax
    StackIsPercOfAmount?: boolean
    Unique?: boolean
    ItemTypes?: number[]
}
interface MinMax {
    Min: number
    Max: number
}
interface BuildingRequirementsEntity {
    BuildingTemplate: number
    Level: number
}
export interface TemplateEntity {
    Template: number
    Amount: number
    Chance: number
    BreakUpDropChance: number
}
interface QualitiesEntity {
    RequiresLevel: number
    Requirements?: TemplateEntity[]
    Results?: TemplateEntity[]
    MaxPermanentModules?: number
    MaxUpgradeModules?: number
}
interface WoodTypeDescsEntity {
    WoodType: number
    Requirements?: TemplateEntity[]
}
interface Specs {
    MaxPassableHeight: number
    MaxSpeed: number
    MaxTurningSpeed: number
    Acceleration: number
    Deceleration: number
    SpeedToWind?: number[]
    TurnToSpeed?: number[]
    VisibilityDistanceScaleSelf: number
    VisibilityDistanceScaleOthers: number
    AttackDistanceScaleSelf: number
    AttackDistanceScaleOthers: number
    HailDistanceScaleSelf: number
    HailDistanceScaleOthers: number
    HailNationDisguiseSelf: number
    HailNationDisguiseOthers: number
    FullBattleRating: number
    PlayerBattleRating: number
    BattleRating: number
}
interface BotCannonsVariantsEntity {
    References?: number[]
}
interface HealthInfo {
    LeftArmor: number
    RightArmor: number
    FrontArmor: number
    BackArmor: number
    InternalStructure: number
    Crew: number
    Sails: number
    Hull: number
    Pump: number
    Rudder: number
    Deck1: number
    Deck2: number
    Deck3: number
    Deck4: number
}
interface Limit {
    Limitation1: MinMax
    Limitation2: MinMax
    Limitation3: MinMax
}
interface Unlocks {
    UpgradeSlot?: null[]
}
interface SkinsEntity {
    SkinName: string
}
interface PortRequirementsEntity {
    Min: number
    Max: number
    MinBR: number
    MaxBR: number
    PriceDiscount: number
}
interface ItemsEntityOrConvertsToEntity {
    Template: number
    Chance: number
    Stack: MinMax
    StackIsPercOfAmount: boolean
    Unique: boolean
}
export interface LevelsEntity {
    LaborDiscount: number
    ProductionLevel: number
    MaxStorage: number
    UpgradePriceGold: number
    UpgradePriceMaterials: TemplateEntity[]
}
interface FlagsEntity {
    NationId: number
    FlagId: number
}
interface PortBonusesEntity {
    Name: string
    PortBonuses?: number[]
}

/****************************
 * Building
 */

export interface APIBuilding {
    __type: string
    Name: string
    Id: number
    NotUsed: boolean
    NotTradeable: boolean
    PreventTeleport: boolean
    DropChanceReductionPerItem: number
    MaxStack: number
    ItemWeight: number
    BasePrice: number
    SellPrice: PriceModifier
    BuyPrice: PriceModifier
    PriceReductionAmount: number
    ConsumedScale: number
    NonConsumedScale: number
    PriceTierQuantity: number
    MaxQuantity: number
    SortingOverrideTemplateType: string
    SortingGroup: string
    SellableInShop: boolean
    CanBeSoldToShop: boolean
    ResetStockOnServerStart: boolean
    SellPriceCoefficient: number
    ItemType: "Building"
    MongoID: string
    LootTable: number
    ProduceResource: number
    RequiredPortResource: number
    BaseProduction: number
    Levels: LevelsEntity[]
    LaborPrice: number
    BuildingRequirements: []
    FullRequirements: []
    GoldRequirements: number
    Results: []
    ServerType: string
    NationAvailability: []
    CraftGroup: string
    RequiresLevel: number
    GivesXP: number
    AccessibleByLevel: boolean
    BreakUpRecipeSpawnChance: number
    DisposeOnUse: boolean
    CanBeUsedInPort: boolean
    CanBeUsedInOpenWorld: boolean
    ShowInContractsSelector: boolean
    DeliveryOrderOptions: DeliveryOrderOptions
    PortPrices: PortPrices
}

export interface APIRecipeResource {
    __type: string
    Name: string
    Id: number
    NotUsed: boolean
    NotTradeable: boolean
    PreventTeleport: boolean
    DropChanceReductionPerItem: number
    MaxStack: number
    ItemWeight: number
    BasePrice: number
    SellPrice: PriceModifier
    BuyPrice: PriceModifier
    PriceReductionAmount: number
    ConsumedScale: number
    NonConsumedScale: number
    PriceTierQuantity: number
    MaxQuantity: number
    SortingOverrideTemplateType: string
    SortingGroup: string
    SellableInShop: boolean
    CanBeSoldToShop: boolean
    ResetStockOnServerStart: boolean
    SellPriceCoefficient: number
    ItemType: string
    MongoID: string
    LaborPrice: number
    BuildingRequirements: BuildingRequirementsEntity[]
    FullRequirements: TemplateEntity[]
    GoldRequirements: number
    Results: TemplateEntity[]
    ServerType: string
    NationAvailability: []
    CraftGroup: string
    RequiresLevel: number
    GivesXP: number
    AccessibleByLevel: boolean
    BreakUpRecipeSpawnChance: number
    DisposeOnUse: boolean
    CanBeUsedInPort: boolean
    CanBeUsedInOpenWorld: boolean
    ShowInContractsSelector: boolean
    DeliveryOrderOptions: DeliveryOrderOptions
    PortPrices: PortPrices
}
