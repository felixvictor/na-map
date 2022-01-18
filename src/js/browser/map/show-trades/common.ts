import { Selection } from "d3-selection"
import { HtmlString } from "common/interface"
import { Trade } from "common/gen-json"
import { NationShortName } from "common/common"

export interface NodeData {
    name: string
    nation: NationShortName
    isShallow: boolean
    x: number
    y: number
}

export const numTrades = 30
export const baseId = "trade-details"
export const headId = `${baseId}-head`

export const showElem = (elem: Selection<HTMLDivElement, unknown, HTMLElement, unknown>): void => {
    elem.classed("d-none", false)
}

export const hideElem = (elem: Selection<HTMLDivElement, unknown, HTMLElement, unknown>): void => {
    elem.classed("d-none", true)
}

export const addInfo = (text: string): HtmlString => `<div><div>${text}</div>`

export const addDes = (text: string): HtmlString => `<div class="des">${text}</div></div>`

export const startBlock = (text: string): HtmlString => `<div class="block-block"><span>${text}</span>`

export const endBlock = (): HtmlString => "</div>"

export const getId = (link: Trade): HtmlString => `trade-${link.source.id}-${link.good}-${link.target.id}`

export const getProfitPerDistance = (trade: Trade): number => trade.profitTotal / trade.distance

export const getProfitPerWeight = (trade: Trade): number =>
    trade.weightPerItem === 0
        ? trade.profitTotal
        : Math.round(trade.profitTotal / (trade.weightPerItem * trade.quantity))
