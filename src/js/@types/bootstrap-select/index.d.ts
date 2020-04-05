/* eslint-disable @typescript-eslint/no-explicit-any */

/// <reference types="jquery"/>

type CountSelectedTextF = (numSelected: number, numTotal: number) => string
type MaxOptionsTextF = (numAll: number, numGroup: number) => string[]

interface BootstrapSelectOptions {
    actionsBox?: boolean
    container?: string | boolean
    countSelectedText?: string | CountSelectedTextF
    deselectAllText?: string
    dropdownAlignRight?: string | boolean
    dropupAuto?: boolean
    header?: string
    hideDisabled?: boolean
    iconBase?: string
    liveSearch?: boolean
    liveSearchNormalize?: boolean
    liveSearchPlaceholder?: string
    liveSearchStyle?: string
    maxOptions?: number | boolean
    maxOptionsText?: string | any[] | MaxOptionsTextF
    mobile?: boolean
    multipleSeparator?: string
    noneSelectedText?: string
    selectAllText?: string
    selectedTextFormat?: string
    selectOnTab?: boolean
    showContent?: boolean
    showIcon?: boolean
    showSubtext?: boolean
    showTick?: boolean
    size?: string | number | boolean
    style?: string
    tickIcon?: string
    title?: string
    width?: string | boolean
}

interface JQuery {
    selectpicker(opts?: BootstrapSelectOptions): this
    selectpicker(method: string, ...args: Array<string | string[]>): void
}
