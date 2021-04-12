declare module "compare-woods" {
    import { WoodColumnType, WoodType } from "js/browser/game-tools/compare-woods"
    import { WoodTrimOrFrame } from "common/gen-json"
    import { ArrayIndex } from "common/interface"

    type WoodTypeList<T> = {
        [K in WoodType]: T
    }
    type WoodTypeArray<T> = {
        [K in WoodType]: T[]
    }
    type WoodTypeNestedArray<T> = {
        [K1 in WoodType]: ArrayIndex<T>
    }

    interface MinMax {
        min: number
        max: number
    }

    interface Amount {
        amount: number
        isPercentage: boolean
    }

    type SelectedWood = WoodTypeList<WoodTrimOrFrame>

    interface WoodDisplayBaseData {
        frame: string
        trim: string
        properties: Map<string, WoodBaseAmount>
    }

    interface WoodDisplayCompareData {
        frame: string
        trim: string
        properties: Map<string, WoodCompareAmount>
    }

    interface WoodBaseAmount {
        amount: number
        isPercentage: boolean
        min: number
        max: number
    }

    interface WoodCompareAmount {
        base: number
        compare: number
        isPercentage: boolean
    }

    type WoodColumnTypeList<T> = {
        [K in WoodColumnType]: T
    }

    type WoodDataMap = Map<number, WoodTrimOrFrame>
}
