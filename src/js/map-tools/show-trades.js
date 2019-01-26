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

import { defaultFontSize, nations } from "../common";
import { formatInt, formatSiCurrency, formatSiInt, getRadioButton, setRadioButton, roundToThousands } from "../util";
import Cookie from "../util/cookie";

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

        this._baseId = "show-trades";
        this._nationSelectId = `${this._baseId}-nation-select`;

        /**
         * Possible values for profit radio buttons (first is default value)
         * @type {string[]}
         * @private
         */
        this._radioButtonValues = ["weight", "distance", "total"];

        /**
         * Server name cookie
         * @type {Cookie}
         */
        this._cookie = new Cookie(this._baseId, this._radioButtonValues);

        this._setupSvg();
        this._setupSelects();
        this._setupRadios();
        this._setupListener();
        this._setupList();
        this._setupData();

        /**
         * Get profit value from cookie or use default value
         * @type {string}
         */
        this._profitValue = this._getProfitValue();
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

        this._mainDiv = d3Select("main #summary-column")
            .append("div")
            .attr("class", "trade-block");
    }

    _setupSelects() {
        const options = `${nations
                       .map(nation => `<option value="${nation.short}" selected>${nation.name}</option>`)
            .join("")}`;

        const select = this._mainDiv
            .append("label")
            .append("select")
            .attr("name", this._nationSelectId)
            .attr("id", this._nationSelectId)
            .property("multiple", true)
            .attr("class", "selectpicker");

        this._nationSelector = select.node();
        this._nationSelector.insertAdjacentHTML("beforeend", options);
        $(this._nationSelector).selectpicker({
            actionsBox: true,
            selectedTextFormat: "count > 1",
            title: "Select nations"
        });
    }

    _setupRadios() {
        this._radioGroup = this._mainDiv
            .append("div")
            .attr("id", this._baseId)
            .attr("class", "col-auto align-self-center radio-group");
        this._radioGroup
            .append("legend")
            .attr("class", "col-form-label")
            .text("Profit");

        this._radioButtonValues.forEach(button => {
            const id = `${this._baseId}-${button.replace(/ /g, "")}`;

            const div = this._radioGroup
                .append("div")
                .attr("class", "custom-control custom-radio custom-control-inline");
            div.append("input")
                .attr("id", id)
                .attr("name", this._baseId)
                .attr("type", "radio")
                .attr("class", "custom-control-input")
                .attr("value", button);

            div.append("label")
                .attr("for", id)
                .attr("class", "custom-control-label")
                .text(button);
        });
    }

    _setupListener() {
        this._radioGroup.node().addEventListener("change", () => this._profitValueSelected());
        this._nationSelector.addEventListener("change", event => {
            this._filterBySelectedNations();
            event.preventDefault();
        });
    }

    _setupList() {
        this._list = this._mainDiv.append("div").attr("class", "trade-list small");
    }

    _setupData() {
        this._nodeData = new Map(
            this._portData.map(port => [
                port.id,
                {
                    name: port.name,
                    nation: port.nation,
                    x: port.coordinates[0],
                    y: port.coordinates[1]
                }
            ])
        );
    }

    _profitValueSelected() {
        this._profitValue = getRadioButton(this._baseId);

        // If data is invalid
        if (!this._radioButtonValues.includes(this._profitValue)) {
            [this._profitValue] = this._radioButtonValues;
            setRadioButton(`${this._baseId}-${this._profitValue.replace(/ /g, "")}`);
        }
        this._storeProfitValue();
        this._update();
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

    _getId(link) {
        return `${link.source.id}-${link.good.replace(/ /g, "")}-${link.target.id}`;
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

        const linkWidthScale = d3ScaleLinear()
            .range([5 / this._scale, 15 / this._scale])
            .domain(d3Extent(this._linkDataFiltered, d => d.profitPerTon));
        const fontScale = 2 ** Math.log2(Math.abs(this._minScale) + this._scale);
        const fontSize = roundToThousands(this._fontSize / fontScale);
        const transition = this._g.transition().duration(500);

        this._g
            .selectAll(".trade-link")
            .data(this._linkDataFiltered, d => this._getId(d))
            .join(
                enter =>
                    enter
                        .append("path")
                        .attr("class", "trade-link")
                        .attr("marker-start", d =>
                            this._nodeData.get(d.source.id).x < this._nodeData.get(d.target.id).x
                                ? ""
                                : "url(#trade-arrow)"
                        )
                        .attr("marker-end", d =>
                            this._nodeData.get(d.source.id).x < this._nodeData.get(d.target.id).x
                                ? "url(#trade-arrow)"
                                : ""
                        )
                        .attr("id", d => this._getId(d))
                        .attr("opacity", 0)
                        .on("click", (d, i, nodes) => this._showDetails(d, i, nodes))
                        .on("mouseout", hideDetails)
                        .call(enterCall => enterCall.transition(transition).attr("opacity", 1)),
                update => update.attr("opacity", 1),
                exit =>
                    exit.call(exitCall =>
                        exitCall
                            .transition(transition)
                            .attr("opacity", 0)
                            .remove()
                    )
            )
            .attr("d", d => arcPath(this._nodeData.get(d.source.id).x < this._nodeData.get(d.target.id).x, d))
            .attr("stroke-width", d => `${linkWidthScale(d.profitPerTon)}px`);

        this._labelG.attr("font-size", `${fontSize}px`);

        this._labelG
            .selectAll(".trade-label")
            .data(this._linkDataFiltered, d => this._getId(d))
            .join(
                enter =>
                    enter
                        .append("text")
                        .attr("class", "trade-label")
                        .append("textPath")
                        .attr("startOffset", "50%")
                        .attr("xlink:href", d => `#${this._getId(d)}`)
                        .text(d => `${formatInt(d.quantity)} ${d.good}`)
                        .attr("opacity", 0)
                        .call(enterCall => enterCall.transition(transition).attr("opacity", 1)),
                update => update.attr("opacity", 1),
                exit =>
                    exit.call(exitCall =>
                        exitCall
                            .transition(transition)
                            .attr("opacity", 0)
                            .remove()
                    )
            )
            .attr("dy", d => `-${linkWidthScale(d.profitPerTon) / 1.5}px`);
    }

    _updateList() {
        const getTrade = trade => {
            const addInfo = text => `<div>${text}</div>`;
            const addDes = text => `<div class="des">${text}</div>`;

            let h = addInfo(`${formatInt(trade.quantity)} ${trade.good}`) + addDes("trade");
            h += addInfo(`${formatSiCurrency(trade.profitPerTon)}`) + addDes("profit/ton");
            h +=
                addInfo(
                    `${this._nodeData.get(trade.source.id).name} <span class="caps">${
                        this._nodeData.get(trade.source.id).nation
                    }</span>`
                ) + addDes("from");
            h +=
                addInfo(
                    `${this._nodeData.get(trade.target.id).name} <span class="caps">${
                        this._nodeData.get(trade.target.id).nation
                    }</span>`
                ) + addDes("to");

            return h;
        };

        this._list
            .selectAll("div.block")
            .data(this._linkDataFiltered, d => this._getId(d))
            .join(enter =>
                enter
                    .append("div")
                    .attr("class", "block")
                    .html(d => getTrade(d))
            );
    }

    _filterByVisiblePorts(linkData) {
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
        this._linkDataFiltered = linkData
            .filter(trade => portDataFiltered.has(trade.source.id) || portDataFiltered.has(trade.target.id))
            .slice(0, this._numTrades);
        console.log("_filterByVisiblePorts", this._linkDataFiltered);
    }

    _filterBySelectedNations() {
        const selectedNations = new Set(Array.from(this._nationSelector.selectedOptions).map(option => option.value));
        const portDataFiltered = new Set(
            this._portData.filter(port => selectedNations.has(port.nation)).map(port => port.id)
        );
        const linkData = this._linkData
            .filter(trade => portDataFiltered.has(trade.source.id) && portDataFiltered.has(trade.target.id))
            .slice(0, this._numTrades);

        this._update(linkData);
    }

    /**
     * Get profit value from cookie or use default value
     * @returns {string} - profit value
     */
    _getProfitValue() {
        const r = this._cookie.get();

        setRadioButton(`${this._baseId}-${r}`);

        return r;
    }

    /**
     * Store profit value in cookie
     * @return {void}
     */
    _storeProfitValue() {
        this._cookie.set(this._profitValue);
    }

    _update(linkData) {
        this._filterByVisiblePorts(linkData);
        this._updateGraph();
        this._updateList();
    }

    setBounds(lowerBound, upperBound) {
        this._lowerBound = lowerBound;
        this._upperBound = upperBound;
    }

    transform(transform) {
        this._g.attr("transform", transform);
        this._scale = transform.k;

        this._update(this._linkData);
    }

    clearMap() {
        this._g.selectAll("*").remove();
        this._update(this._linkData);
    }
}
