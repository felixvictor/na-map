import { sum as d3Sum } from "d3-array"
import { select as d3Select, Selection } from "d3-selection"

import { formatSiInt } from "common/common-format"

import { DivDatum } from "common/interface"
import { PortWithTrades } from "common/gen-json"

export default class Summary {
    #divPortSummary = {} as Selection<HTMLDivElement, DivDatum, HTMLElement, unknown>
    #portSummaryNetIncome = {} as Selection<HTMLDivElement, DivDatum, HTMLElement, unknown>
    #portSummaryNumPorts = {} as Selection<HTMLDivElement, DivDatum, HTMLElement, unknown>
    #portSummaryTaxIncome = {} as Selection<HTMLDivElement, DivDatum, HTMLElement, unknown>
    #portSummaryTextNetIncome = {} as Selection<HTMLDivElement, DivDatum, HTMLElement, unknown>
    #portSummaryTextNumPorts = {} as Selection<HTMLDivElement, DivDatum, HTMLElement, unknown>
    #portSummaryTextTaxIncome = {} as Selection<HTMLDivElement, DivDatum, HTMLElement, unknown>

    constructor() {
        this.#setup()
    }

    #setup() {
        // Main box
        this.#divPortSummary = d3Select<HTMLDivElement, DivDatum>("main #summary-column")
            .append<HTMLDivElement>("div")
            .attr("id", "port-summary")
            .attr("class", "port-summary shadow port-summary-no-wind")

        // Number of selected ports
        this.#portSummaryNumPorts = this.#divPortSummary.append<HTMLDivElement>("div").attr("class", "block")
        this.#portSummaryTextNumPorts = this.#portSummaryNumPorts.append<HTMLDivElement>("div")
        this.#portSummaryNumPorts.append<HTMLDivElement>("div").attr("class", "overlay-des").html("selected<br>ports")

        // Total tax income
        this.#portSummaryTaxIncome = this.#divPortSummary.append<HTMLDivElement>("div").attr("class", "block")
        this.#portSummaryTextTaxIncome = this.#portSummaryTaxIncome.append<HTMLDivElement>("div")
        this.#portSummaryTaxIncome.append<HTMLDivElement>("div").attr("class", "overlay-des").html("tax<br>income")

        // Total net income
        this.#portSummaryNetIncome = this.#divPortSummary.append<HTMLDivElement>("div").attr("class", "block")
        this.#portSummaryTextNetIncome = this.#portSummaryNetIncome.append<HTMLDivElement>("div")
        this.#portSummaryNetIncome.append<HTMLDivElement>("div").attr("class", "overlay-des").html("net<br>income")
    }

    update(portData: PortWithTrades[]): void {
        const numberPorts = Object.keys(portData).length
        let taxTotal = 0
        let netTotal = 0

        if (numberPorts) {
            taxTotal = d3Sum(portData, (d) => d.taxIncome)
            netTotal = d3Sum(portData, (d) => d.netIncome)
        }

        this.#portSummaryTextNumPorts.text(`${numberPorts}`)
        this.#portSummaryTextTaxIncome.html(`${formatSiInt(taxTotal)}`)
        this.#portSummaryTextNetIncome.html(`${formatSiInt(netTotal)}`)
    }

    show(): void {
        this.#divPortSummary.classed("hidden", false)
    }
}
