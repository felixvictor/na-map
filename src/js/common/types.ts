const frontlinesType = ["attacking", "defending"] as const
export type FrontlinesType = typeof frontlinesType[number]

export const lootType = ["loot", "chests", "items"] as const
export type LootType = typeof lootType[number]

const woodColumnType = ["Base", "C1", "C2", "C3"] as const
export type WoodColumnType = typeof woodColumnType[number]

export const portBonusType = ["crew", "gunnery", "hull", "mast", "sailing"] as const
export type PortBonusType = typeof portBonusType[number]
export type PortBonusValue = 0 | 1 | 2 | 3 | 4
export type PortBonus = {
    [K in PortBonusType]: PortBonusValue
}

export interface PortBonusJson {
    [index: string]: number | string | PortBonus
    id: number
    name: string
    portBonus: PortBonus
}
