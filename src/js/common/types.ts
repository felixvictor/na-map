const frontlinesType = ["attacking", "defending"]!
export type FrontlinesType = typeof frontlinesType[number]

export const lootType = ["item", "loot", "chest", "fish"]!
export type LootType = typeof lootType[number]

export interface FlagEntity {
    [index: string]: number | string
    expire: string
    number: number
}
export interface FlagsPerNation {
    [index: string]: number | FlagEntity[]
    nation: number
    flags: FlagEntity[]
}

export const woodFamily = ["regular", "seasoned", "rare"]!
export type WoodFamily = typeof woodFamily[number]

export const woodType = ["frame", "trim"]!
export type WoodType = typeof woodType[number]
