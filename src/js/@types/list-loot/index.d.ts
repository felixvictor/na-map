declare module "list-loot" {
    import { LootAmount, LootChestsEntity, LootLootEntity } from "common/gen-json"

    interface SourceDetail {
        id: number
        name: string
        chance: number
        amount: LootAmount
    }

    type LootData = {
        chest: LootChestsEntity[]
        fish: LootLootEntity[]
        loot: LootLootEntity[]
    }

    type LootItem = { name: string; sources: Map<number, SourceDetail> }
    type LootItemMap = Map<number, LootItem>
}
