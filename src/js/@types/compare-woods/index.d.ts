declare module "compare-woods" {
    import { WoodColumnType} from "js/browser/game-tools/compare-woods"
    import { WoodTrimOrFrame } from "common/gen-json"
    import { ArrayIndex } from "common/interface"
    import { WoodType } from "common/types"

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
        min: number
        max: number
    }

    type WoodColumnTypeList<T> = {
        [K in WoodColumnType]: T
    }

    type WoodDataMap = Map<number, WoodTrimOrFrame>
}
