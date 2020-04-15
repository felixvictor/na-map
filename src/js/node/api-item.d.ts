/*!
 * This file is part of na-map.
 *
 * @file      Types for api item json.
 * @module    api-item.d
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

// https://jvilk.com/MakeTypes/

import { ValuesType } from "utility-types"

/****************************
 * Items
 */

export interface APIItemGeneric {
    [index: string]: ValuesType<APIItemGeneric>
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
    DeliveryOrderOptions: DeliveryOrderOptions<boolean, number>
    PortPrices: PortPrices<boolean, number>
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
    ItemsToGive?: MinMax<number>
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
    ShipPermanentSlotsCount?: MinMax<number>
    ShipPersistentModuleSlotsCount?: MinMax<number>
    PortBonusesCount?: MinMax<number>
}
interface PriceModifier {
    x: number
    y: number
}
interface DeliveryOrderOptions<valid, amount> {
    Valid: valid
    StockSizeCraftExperience: amount
    StockSize: amount
}
interface PortPrices<valid, price> {
    Valid: valid
    Produced: SellAndBuyPrices<price>
    Consumed: SellAndBuyPrices<price>
    Regular: SellAndBuyPrices<price>
    FullStackAmount: price
    FullStack: SellAndBuyPrices<price>
    RandomPct: price
    RangePct: price
}
interface SellAndBuyPrices<price> {
    SellPrice: MinMax<price>
    BuyPrice: MinMax<price>
}
export interface ModifiersEntity {
    Slot: string
    MappingIds: string[]
    Absolute: number
    Percentage: number
}
interface ItemsEntity {
    Template?: number
    Chance?: number
    Stack?: MinMax<number>
    StackIsPercOfAmount?: boolean
    Unique?: boolean
    ItemTypes?: number[]
}
interface MinMax<amount> {
    Min: amount
    Max: amount
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
    Results: TemplateEntity[]
    MaxPermanentModules?: number
    MaxUpgradeModules?: number
}
interface WoodTypeDescsEntity {
    WoodType: number
    Requirements: TemplateEntity[]
}
interface Specs {
    MaxPassableHeight: number
    MaxSpeed: number
    MaxTurningSpeed: number
    Acceleration: number
    Deceleration: number
    SpeedToWind: number[]
    TurnToSpeed: number[]
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
    Limitation1: MinMax<number>
    Limitation2: MinMax<number>
    Limitation3: MinMax<number>
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
    Stack: MinMax<number>
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
    [index: string]: ValuesType<APIItemGeneric>
    __type: "MegaChaka.Services.Items.BuildingTemplate, MegaChaka"
    Name: string
    Id: number
    NotUsed: boolean
    NotTradeable: false
    PreventTeleport: true
    DropChanceReductionPerItem: 0
    MaxStack: 0
    ItemWeight: 0
    BasePrice: 0
    SellPrice: PriceModifier
    BuyPrice: PriceModifier
    PriceReductionAmount: -1
    ConsumedScale: 1.5
    NonConsumedScale: 1
    PriceTierQuantity: 0
    MaxQuantity: 0
    SortingOverrideTemplateType: ""
    SortingGroup: ""
    SellableInShop: false
    CanBeSoldToShop: false
    ResetStockOnServerStart: false
    SellPriceCoefficient: 0
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
    DisposeOnUse: false
    CanBeUsedInPort: false
    CanBeUsedInOpenWorld: false
    ShowInContractsSelector: false
    DeliveryOrderOptions: DeliveryOrderOptions<false, 0>
    PortPrices: PortPrices<false, 0>
}

/****************************
 * RecipeResource
 */

export interface APIRecipe {
    [index: string]: ValuesType<APIItemGeneric>
    Name: string
    Id: number
    NotUsed: boolean
    NotTradeable: false
    PreventTeleport: false
    DropChanceReductionPerItem: 0
    MaxStack: 1
    ItemWeight: 0
    BasePrice: -1
    SellPrice: PriceModifier
    BuyPrice: PriceModifier
    PriceReductionAmount: -1
    ConsumedScale: 1.5
    NonConsumedScale: 1
    PriceTierQuantity: 100
    MaxQuantity: number
    SortingOverrideTemplateType: ""
    SortingGroup: ""
    SellableInShop: false
    CanBeSoldToShop: true
    ResetStockOnServerStart: false
    SellPriceCoefficient: 0.5
    ItemType: "Recipe" | "RecipeModule"
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
    DisposeOnUse: true
    CanBeUsedInPort: false
    CanBeUsedInOpenWorld: false
    ShowInContractsSelector: false
    DeliveryOrderOptions: DeliveryOrderOptions<false, 0>
    PortPrices: PortPrices<false, 0>
}

export interface APIRecipeResource extends APIRecipe {
    __type: "MegaChaka.Services.Items.RecipeTemplate, MegaChaka"
}

export interface APIRecipeModuleResource extends APIRecipe {
    __type: "MegaChaka.Services.Items.RecipeModuleTemplate, MegaChaka"
    Qualities: QualitiesEntity[]
}

/****************************
 * Loot
 */

export interface APIShipLootTableItem {
    __type: "MegaChaka.Services.Items.ShipLootTableItemTemplate, MegaChaka"
    Items?: ItemsEntity[]
    Name: string
    Id: number
    NotUsed: boolean
    NotTradeable: false
    PreventTeleport: true
    DropChanceReductionPerItem: 0
    MaxStack: 0
    ItemWeight: 0
    BasePrice: -1
    SellPrice: PriceModifier
    BuyPrice: PriceModifier
    PriceReductionAmount: -1
    ConsumedScale: 1.5
    NonConsumedScale: 1
    PriceTierQuantity: 100
    MaxQuantity: 1000
    SortingOverrideTemplateType: ""
    SortingGroup: ""
    SellableInShop: true
    CanBeSoldToShop: true
    ResetStockOnServerStart: false
    SellPriceCoefficient: 0.5
    ItemType: "ShipLootTableItem"
    MongoID: string
    EventLootTable: boolean
    Class: number
    ItemsToGive: MinMax<1>
    lootProbability: number[]
    itemProbability: number[]
    quantityProbability: number[]
    ShowInContractsSelector: true
    DeliveryOrderOptions: DeliveryOrderOptions<false, 0>
    PortPrices: PortPrices<false, 0>
}

export interface APITimeBasedConvertibleItem {
    __type: "MegaChaka.Services.Items.TimeBasedConvertibleItemTemplate, MegaChaka"
    Name: string
    Id: number
    NotUsed: boolean
    NotTradeable: false
    PreventTeleport: true
    DropChanceReductionPerItem: 0
    MaxStack: 1
    ItemWeight: number
    BasePrice: 5000
    SellPrice: PriceModifier
    BuyPrice: PriceModifier
    PriceReductionAmount: -1
    ConsumedScale: 1.5
    NonConsumedScale: 1
    PriceTierQuantity: 5000
    MaxQuantity: 5000
    SortingOverrideTemplateType: ""
    SortingGroup: ""
    SellableInShop: false
    CanBeSoldToShop: false
    ResetStockOnServerStart: false
    SellPriceCoefficient: 0.5
    ItemType: "TimeBasedConvertibleItem"
    MongoID: string
    GeneralChest: boolean
    LifetimeSeconds: 10800
    ExtendedLootTable: number[]
    CanBeConverted: "Port"
    ConvertsTo: []
    ExtraLootTable: 0
    InitialAmount: 0
    ProductionScale: 0.6
    ConsumptionScale: 1
    SpawnChance: 1
    AutoFillCoefficient: 5
    ProducedByNation: 9
    ConsumedByNation: -1
    ProducedInCapitals: false
    ProducedInTowns: false
    ConsumedInCapitals: false
    ConsumedInTowns: false
    ShowInContractsSelector: false
    DeliveryOrderOptions: DeliveryOrderOptions<false, 0>
    PortPrices: PortPrices<false, 0>
}

/****************************
 * Module
 */

export interface APIModule {
    __type: "MegaChaka.Services.Items.ModuleTemplate, MegaChaka"
    Modifiers?: ModifiersEntity[]
    scoreValue: number
    UsageType: string
    MaxItems: 1
    Name: string
    Id: number
    NotUsed: boolean
    NotTradeable: false
    PreventTeleport: boolean
    DropChanceReductionPerItem: 0
    MaxStack: 1
    ItemWeight: 0
    BasePrice: number
    SellPrice: PriceModifier
    BuyPrice: PriceModifier
    PriceReductionAmount: -1
    ConsumedScale: 1.5
    NonConsumedScale: 1
    PriceTierQuantity: 2
    MaxQuantity: 20
    SortingOverrideTemplateType: ""
    SortingGroup: string
    SellableInShop: false
    CanBeSoldToShop: true
    ResetStockOnServerStart: false
    SellPriceCoefficient: 0.5
    ItemType: "Module"
    MongoID: string
    MinResourcesAmount: number
    MaxResourcesAmount: number
    BreakUpItemsAmount: number
    CanBeBreakedUp: string
    bCanBeBreakedUp: false
    PermanentType: string
    BookType: "Default"
    ModuleType: string
    ModuleLevel: string
    Limitation1_Value: 0
    Limitation2_Value: 0
    Limitation3_Value: 0
    ShowInContractsSelector: false
    DeliveryOrderOptions: DeliveryOrderOptions<false, 0>
    PortPrices: PortPrices<false, 0>
}

export interface APIShipUpgradeBookItem {
    __type: "MegaChaka.Services.Items.ShipUpgradeBookItemTemplate, MegaChaka"
    Name: string
    Id: number
    NotUsed: boolean
    NotTradeable: false
    PreventTeleport: false
    DropChanceReductionPerItem: 0
    MaxStack: 100
    ItemWeight: 0
    BasePrice: 800
    SellPrice: PriceModifier
    BuyPrice: PriceModifier
    PriceReductionAmount: -1
    ConsumedScale: 1.5
    NonConsumedScale: 1
    PriceTierQuantity: 100
    MaxQuantity: 1000
    SortingOverrideTemplateType: "ShipUpgradeBookItemTemplate"
    SortingGroup: ""
    SellableInShop: false
    CanBeSoldToShop: true
    ResetStockOnServerStart: true
    SellPriceCoefficient: 0.5
    ItemType: "ShipUpgradeBookItem"
    MongoID: string
    Upgrade: number
    DisposeOnUse: false
    CanBeUsedInPort: false
    CanBeUsedInOpenWorld: false
    ShowInContractsSelector: true
    DeliveryOrderOptions: DeliveryOrderOptions<false, 0>
    PortPrices: PortPrices<false, 0>
}

export interface APIShip {
    __type: "MegaChaka.Services.Items.ShipTemplate, MegaChaka"
    RepairPriceCoefficient: number
    Class: number
    ShipTemplateName: string
    Specs: Specs
    VisualTemplateId: number
    HiddenModuleTemplates: number[]
    DefaultCannons: null[]
    BotCannons: number[]
    BotCannonsVariants: BotCannonsVariantsEntity[]
    MaxItems: number
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
    ItemType: "Ship"
    MongoID: string
    BaseDurability: number
    QualityPrices: number[]
    Premium: boolean
    CaptureNPCType: string
    CanBeUsedInFleet: boolean
    FleetHirePriceCoefficient: number
    CanBeSoldOnlyIn: number
    RepairKits: PriceModifier
    RepairKitPriceModifier: PriceModifier
    RepairKitCooldownModifier: PriceModifier
    RepairAmount: number
    HealthInfo: HealthInfo
    ShipMass: number
    BattleRating: number
    GunsPerDeck: number[]
    ShipType: number
    HiddenModulesCount: number
    PortBonusModulesCount: number
    PersistentModulesCount: number
    PermanentModulesLimit: Limit[]
    UpgradeModulesCount: number
    MinUpgradeModulesCount: number
    UpgradeModulesLimit: Limit[]
    OfficerSlots: number
    Decks: number
    DeckClassLimit: Limit[]
    FrontDecks: number
    FrontDeckClassLimit: Limit[]
    BackDecks: number
    BackDeckClassLimit: Limit[]
    MortarDecks: number
    MortarDeckClassLimit: Limit[]
    HoldSize: number
    MaxWeight: number
    MinCrewRequired: number
    ShipClassType: number
    Unlocks: Unlocks
    OverrideTotalXpForUpgradeSlots: number
    Skins?: SkinsEntity[]
    Limitations: []
    HostilityScore: number
    Limitation1_Value: number
    Limitation2_Value: number
    Limitation3_Value: number
    ShowInContractsSelector: boolean
    DeliveryOrderOptions: DeliveryOrderOptions<false, 0>
    PortPrices: PortPrices<false, 0>
}

export interface APIShipBlueprint {
    __type: "MegaChaka.Services.Items.RecipeShipTemplate, MegaChaka"
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
    WoodTypeDescs: WoodTypeDescsEntity[]
    Qualities: QualitiesEntity[]
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
    DeliveryOrderOptions: DeliveryOrderOptions<false, 0>
    PortPrices: PortPrices<false, 0>
}
