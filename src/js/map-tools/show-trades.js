/**
 * This file is part of na-map.
 *
 * @file      Show trades.
 * @module    map-tools/show-trades
 * @author    iB aka Felix Victor
 * @copyright 2019
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { extent as d3Extent } from "d3-array";
import { scaleLinear as d3ScaleLinear, scalePoint as d3ScalePoint } from "d3-scale";
import { select as d3Select } from "d3-selection";

import { defaultFontSize } from "../common";
import { formatInt, formatSiCurrency, formatSiInt, roundToThousands } from "../util";

/**
 * Show trades
 */
export default class ShowTrades {
    /**
     * @param {object} portData - Port data
     * @param {object} tradeData - Trade data
     * @param {number} minScale - Minimal scale
     */
    constructor(portData, tradeData, minScale) {
        this._portData = portData;
        this._linkData = tradeData;

        this._minScale = minScale;
        this._scale = this._minScale;
        this._fontSize = defaultFontSize;

        this._numTrades = 30;

        this._arrowX = 18;
        this._arrowY = 18;

        this._setupSvg();
        this._setupList();
        this._setupData();
    }

    _setupSvg() {
        this._g = d3Select("#na-svg")
            .insert("g", "g.pb")
            .attr("class", "trades");
        this._labelG = this._g.append("g");

        d3Select("#na-svg defs")
            .append("marker")
            .attr("id", "trade-arrow")
            .attr("refX", this._arrowX)
            .attr("refY", this._arrowY / 2)
            .attr("markerWidth", 20)
            .attr("markerHeight", 20)
            .attr("markerUnits", "userSpaceOnUse")
            .attr("orient", "auto-start-reverse")
            .append("path")
            .attr("d", `M0,0L0,${this._arrowY}L${this._arrowX},${this._arrowY / 2}z`)
            .attr("class", "trade-head");
    }

    _setupList() {
        this._list = d3Select("main #summary-column")
            .insert("div")
            .attr("class", "trade-list")
            .append("table")
            .attr("class", "table table-sm small mb-0")
            .append("tbody");
    }

    _setupData() {
        this._nodeData = new Map(
            this._portData.map(port => [
                port.id,
                {
                    name: port.name,
                    x: port.coordinates[0],
                    y: port.coordinates[1]
                }
            ])
        );

        /*
        const ids = [231, 234, 238];
        this._nodeData = new Map(
            this._portData
                .filter(port => ids.includes(+port.id))
                .map(port => [
                    +port.id,
                    {
                        x: port.coordinates[0],
                        y: port.coordinates[1]
                    }
                ])
        );

        this._linkData = [
            {
                good: "Live Oak Log",
                source: { id: 234, grossPrice: 10 },
                target: { id: 238, grossPrice: 105 },
                quantity: 1500,
                profit: 142500,
                profitPerItem: 95,
                totalWeight: 4650
            },
            {
                good: "Cuban Tobacco",
                source: { id: 234, grossPrice: 482 },
                target: { id: 238, grossPrice: 912 },
                quantity: 336,
                profit: 144480,
                profitPerItem: 430,
                totalWeight: 33600
            },
            {
                good: "Copper Ingots",
                source: { id: 234, grossPrice: 9 },
                target: { id: 238, grossPrice: 318 },
                quantity: 850,
                profit: 262650,
                profitPerItem: 309,
                totalWeight: 570
            },
            {
                good: "Spanish Almonds",
                source: { id: 234, grossPrice: 485 },
                target: { id: 238, grossPrice: 914 },
                quantity: 2578,
                profit: 1105962,
                profitPerItem: 429,
                totalWeight: 257800
            },
            {
                good: "Spanish Almonds",
                source: { id: 234, grossPrice: 485 },
                target: { id: 231, grossPrice: 914 },
                quantity: 2578,
                profit: 1105962,
                profitPerItem: 429,
                totalWeight: 257800
            },
            {
                good: "Spanish Almonds",
                source: { id: 238, grossPrice: 485 },
                target: { id: 234, grossPrice: 914 },
                quantity: 2578,
                profit: 1105962,
                profitPerItem: 429,
                totalWeight: 257800
            }
        ];
        */
    }

    _showDetails(d, i, nodes) {
        const tooltipData = trade => {
            const profitPerItem = trade.target.grossPrice - trade.source.grossPrice;
            const profitTotal = profitPerItem * trade.quantity;
            let h = `<p><span class="port-name">${formatInt(trade.quantity)} ${trade.good}</span><br>`;
            h += `Buy in ${this._nodeData.get(trade.source.id).name} for ${formatSiCurrency(
                trade.source.grossPrice
            )}<br>`;
            h += `Sell in ${this._nodeData.get(trade.target.id).name} for ${formatSiCurrency(
                trade.target.grossPrice
            )}<br>`;
            h += `Profit: ${formatSiCurrency(profitTotal)} total, ${formatSiCurrency(
                profitPerItem
            )} per item, ${formatSiCurrency(trade.profitPerTon)} per ton<br>`;
            h += `Weight: ${formatSiInt(trade.weightPerItem * trade.quantity)} tons total, ${formatSiInt(
                trade.weightPerItem
            )} tons per item</p>`;

            return h;
        };

        const trade = d3Select(nodes[i]);
        const title = tooltipData(d);
        // eslint-disable-next-line no-underscore-dangle
        $(trade.node())
            .tooltip({
                html: true,
                placement: "auto",
                title,
                trigger: "manual"
            })
            .tooltip("show");
    }

    /**
     * @link https://bl.ocks.org/mattkohl/146d301c0fc20d89d85880df537de7b0
     * @return {void}
     * @private
     */
    _updateGraph() {
        const hideDetails = (d, i, nodes) => {
            $(d3Select(nodes[i]).node()).tooltip("dispose");
        };

        const linkWidthScale = d3ScaleLinear()
            .range([5 / this._scale, 15 / this._scale])
            .domain(d3Extent(this._linkDataFiltered, d => d.profitPerTon));
        const fontScale = 2 ** Math.log2(Math.abs(this._minScale) + this._scale);
        const fontSize = roundToThousands(this._fontSize / fontScale);

        const arcPath = (leftHand, d) => {
            const getSiblingLinks = (sourceId, targetId) =>
                this._linkDataFiltered
                    .filter(
                        link =>
                            (link.source.id === sourceId && link.target.id === targetId) ||
                            (link.source.id === targetId && link.target.id === sourceId)
                    )
                    .map(link => link.profitPerTon);

            const source = { x: this._nodeData.get(d.source.id).x, y: this._nodeData.get(d.source.id).y };
            const target = { x: this._nodeData.get(d.target.id).x, y: this._nodeData.get(d.target.id).y };
            const x1 = leftHand ? source.x : target.x;
            const y1 = leftHand ? source.y : target.y;
            const x2 = leftHand ? target.x : source.x;
            const y2 = leftHand ? target.y : source.y;

            let dr = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
            const xRotation = 0;
            const largeArc = 0;
            const sweep = leftHand ? 0 : 1;
            const siblings = getSiblingLinks(d.source.id, d.target.id);
            if (siblings.length > 1) {
                const arcScale = d3ScalePoint()
                    .domain(siblings)
                    .range([1, siblings.length]);
                dr /= 1 + (1 / siblings.length) * (arcScale(d.profitPerTon) - 1);
            }
            dr = Math.round(dr);

            return `M${x1},${y1}A${dr},${dr} ${xRotation},${largeArc},${sweep} ${x2},${y2}`;
        };

        const getId = link => `${link.source.id}-${link.good.replace(/ /g, "")}-${link.target.id}`;

        const linksUpdate = this._g.selectAll(".trade-link").data(this._linkDataFiltered, d => getId(d));
        linksUpdate.exit().remove();
        const linksEnter = linksUpdate
            .enter()
            .append("path")
            .attr("class", "trade-link")
            .attr("marker-end", "url(#trade-arrow)")
            .attr("id", d => getId(d));
        linksUpdate
            .merge(linksEnter)
            .attr("d", d => arcPath(this._nodeData.get(d.source.id).x < this._nodeData.get(d.target.id).x, d))
            .attr("stroke-width", d => `${linkWidthScale(d.profitPerTon)}px`)
            .on("click", (d, i, nodes) => this._showDetails(d, i, nodes))
            .on("mouseout", hideDetails);

        this._labelG.attr("font-size", `${fontSize}px`);

        const labelUpdate = this._labelG.selectAll(".trade-label").data(this._linkDataFiltered, d => getId(d));
        labelUpdate.exit().remove();
        const labelEnter = labelUpdate
            .enter()
            .append("text")
            .attr("class", "trade-label");
        labelEnter
            .append("textPath")
            .attr("startOffset", "50%")
            .attr("xlink:href", d => `#${getId(d)}`)
            .text(d => `${formatInt(d.quantity)} ${d.good}`);
        labelUpdate.merge(labelEnter).attr("dy", d => `-${linkWidthScale(d.profitPerTon) / 1.5}px`);
    }

    _updateList() {
        // Data join rows
        const rowsUpdate = this._list
            .selectAll("tr")
            .data(
                this._linkDataFiltered.map(link => [
                    `${formatInt(link.quantity)} ${link.good}`,
                    formatSiInt(link.profitPerTon)
                ])
            );

        // Remove old rows
        rowsUpdate.exit().remove();

        // Add new rows
        const rowsEnter = rowsUpdate.enter().append("tr");

        const rows = rowsEnter.merge(rowsUpdate);

        // Data join cells
        const cellsUpdate = rows.selectAll("td").data(d => d);

        cellsUpdate.exit().remove();

        // Add new cells
        const cellsEnter = cellsUpdate.enter().append("td");

        cellsEnter.merge(cellsUpdate).html(d => d);
    }

    _filterVisible() {
        const portDataFiltered = new Set(
            this._portData
                .filter(
                    port =>
                        port.coordinates[0] >= this._lowerBound[0] &&
                        port.coordinates[0] <= this._upperBound[0] &&
                        port.coordinates[1] >= this._lowerBound[1] &&
                        port.coordinates[1] <= this._upperBound[1]
                )
                .map(port => port.id)
        );

        this._linkDataFiltered = this._linkData
            .filter(trade => portDataFiltered.has(trade.source.id) || portDataFiltered.has(trade.target.id))
            .slice(0, this._numTrades);
        console.log(this._linkDataFiltered);
    }

    setBounds(lowerBound, upperBound) {
        this._lowerBound = lowerBound;
        this._upperBound = upperBound;
    }

    transform(transform) {
        this._g.attr("transform", transform);
        this._scale = transform.k;
        this._filterVisible();
        this._updateGraph();
        this._updateList();
    }

    clearMap() {
        this._g.selectAll("*").remove();
    }
}
