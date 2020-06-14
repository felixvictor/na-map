const frontlinesType = ["attacking", "defending"] as const
export type FrontlinesType = typeof frontlinesType[number]

export const lootType = ["loot", "chests", "items"] as const
export type LootType = typeof lootType[number]

const woodColumnType = ["Base", "C1", "C2", "C3"] as const
export type WoodColumnType = typeof woodColumnType[number]
