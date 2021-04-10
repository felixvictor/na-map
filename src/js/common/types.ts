const frontlinesType = ["attacking", "defending"]!
export type FrontlinesType = typeof frontlinesType[number]

export const lootType = ["loot", "chest", "item", "fish"]!
export type LootType = typeof lootType[number]

export const portBonusType = ["crew", "gunnery", "hull", "mast", "sailing"]!
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
