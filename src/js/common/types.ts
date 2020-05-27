const frontlinesType = ["attacking", "defending"] as const
export type FrontlinesType = typeof frontlinesType[number]

const lootType = ["loot", "chests", "items"] as const
export type LootType = typeof lootType[number]
