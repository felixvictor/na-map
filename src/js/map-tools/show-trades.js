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
import { formatInt, formatSiCurrency, formatSiInt, roundToThousands } from "../util";
import Cookie from "../util/cookie";
import RadioButton from "../util/radio-button";

/**
 * Show trades
 */
export default class ShowTrades {
    /**
     * @param {object} portData - Port data
     * @param {object} tradeData - Trade data
     * @param {number} minScale - Minimal scale
     * @param {Bound} lowerBound - Top left coordinates of current viewport
     * @param {Bound} upperBound - Bottom right coordinates of current viewport
     */
    constructor(portData, tradeData, minScale, lowerBound, upperBound) {
        this._portData = portData;
        this._linkDataDefault = tradeData;
        this._linkData = tradeData;

        this._minScale = minScale;
        this._scale = this._minScale;
        this._fontSize = defaultFontSize;

        this._numTrades = 30;

        this._arrowX = 18;
        this._arrowY = 18;

        this._baseId = "show-trades";
        this._nationSelectId = `${this._baseId}-nation-select`;

        this._showId = "show-trades-show";

        /**
         * Possible values for show trade radio buttons (first is default value)
         * @type {string[]}
         * @private
         */
        this._showRadioValues = ["on", "off"];

        /**
         * Show trade cookie
         * @type {Cookie}
         */
        this._showCookie = new Cookie(this._showId, this._showRadioValues);

        /**
         * Show trade radio buttons
         * @type {RadioButton}
         */
        this._showRadios = new RadioButton(this._showId, this._showRadioValues);

        this._profitId = "show-trades-profit";

        /**
         * Possible values for profit radio buttons (first is default value)
         * @type {string[]}
         * @private
         */
        this._profitRadioValues = ["weight", "distance", "total"];
        this._profitCookie = new Cookie(this._profitId, this._profitRadioValues);
        this._profitRadios = new RadioButton(this._profitId, this._profitRadioValues);

        this._setupSvg();
        this._setupSelects();
        this._setupProfitRadios();
        this._setupListener();
        this._setupList();
        this._setupData();
        this.setBounds(lowerBound, upperBound);

        /**
         * Get show value from cookie or use default value
         * @type {string}
         */
        this._show = this._getShowValue();

        /**
         * Get profit value from cookie or use default value
         * @type {string}
         */
        this._profitValue = this._getProfitValue();

        this._filterPortsBySelectedNations();
        this._sortLinkData();
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
            countSelectedText(amount) {
                let text = "";
                if (amount === nations.length) {
                    text = "All";
                } else {
                    text = amount;
                }
                return `${text} nations selected`;
            },
            title: "Select nations"
        });
    }

    _setupProfitRadios() {
        const profitRadioGroup = this._mainDiv
            .append("div")
            .attr("id", this._profitId)
            .attr("class", "align-self-center radio-group");
        profitRadioGroup
            .append("legend")
            .attr("class", "col-form-label")
            .text("Sort profit by");

        this._profitRadioValues.forEach(button => {
            const id = `${this._profitId}-${button.replace(/ /g, "")}`;

            const div = profitRadioGroup
                .append("div")
                .attr("class", "custom-control custom-radio custom-control-inline");
            div.append("input")
                .attr("id", id)
                .attr("name", this._profitId)
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
        document.getElementById(this._showId).addEventListener("change", () => this._showSelected());
        document.getElementById(this._profitId).addEventListener("change", () => this._profitValueSelected());
        this._nationSelector.addEventListener("change", event => {
            this._nationChanged();
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

    _sortLinkData() {
        this._linkData = this._linkData
            .map(trade => {
                let profit = 0;
                switch (this._profitValue) {
                    case "weight":
                        profit =
                            trade.weightPerItem !== 0
                                ? Math.round(trade.profitTotal / (trade.weightPerItem * trade.quantity))
                                : trade.profitTotal;
                        break;
                    case "distance":
                        profit = trade.profitTotal / trade.distance;
                        break;
                    case "total":
                        profit = trade.profitTotal;
                        break;
                    default:
                        throw Error(`Wrong profit value ${this._profitValue}`);
                }
                // eslint-disable-next-line
                trade.profit = profit;
                return trade;
            })
            .sort((a, b) => b.profit - a.profit);
    }

    _showSelected() {
        const show = this._showRadios.get();
        this._show = show === "on";

        this._showCookie.set(show);
        this._mainDiv.classed("flex", this._show).classed("d-none", !this._show);
        this._linkData = this._show ? this._linkDataDefault : [];
        this._filterTradesBySelectedNations();
        this._sortLinkData();
        this._update();
    }

    _profitValueSelected() {
        this._profitValue = this._profitRadios.get();

        this._profitCookie.set(this._profitValue);

        this._sortLinkData();
        this._update();
    }

    _nationChanged() {
        this._linkData = this._linkDataDefault;
        this._filterPortsBySelectedNations();
        this._filterTradesBySelectedNations();
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
            )} per item, ${formatSiCurrency(
                trade.weightPerItem !== 0
                    ? Math.round(trade.profitTotal / (trade.weightPerItem * trade.quantity))
                    : trade.profitTota
            )} per ton<br>`;
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

    static _getId(link) {
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
                    .map(link => link.profit);

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
                dr /= 1 + (1 / siblings.length) * (arcScale(d.profit) - 1);
            }
            dr = Math.round(dr);

            return `M${x1},${y1}A${dr},${dr} ${xRotation},${largeArc},${sweep} ${x2},${y2}`;
        };

        const linkWidthScale = d3ScaleLinear()
            .range([5 / this._scale, 15 / this._scale])
            .domain(d3Extent(this._linkDataFiltered, d => d.profit));
        const fontScale = 2 ** Math.log2(Math.abs(this._minScale) + this._scale);
        const fontSize = roundToThousands(this._fontSize / fontScale);
        const transition = this._g.transition().duration(500);

        this._g
            .selectAll(".trade-link")
            .data(this._linkDataFiltered, d => ShowTrades._getId(d))
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
                        .attr("id", d => ShowTrades._getId(d))
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
            .attr("stroke-width", d => `${linkWidthScale(d.profit)}px`);

        this._labelG.attr("font-size", `${fontSize}px`);

        this._labelG
            .selectAll(".trade-label")
            .data(this._linkDataFiltered, d => ShowTrades._getId(d))
            .join(
                enter =>
                    enter
                        .append("text")
                        .attr("class", "trade-label")
                        .append("textPath")
                        .attr("startOffset", "50%")
                        .attr("xlink:href", d => `#${ShowTrades._getId(d)}`)
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
            .attr("dy", d => `-${linkWidthScale(d.profit) / 1.5}px`);
    }

    _updateList() {
        let profitText = "";
        switch (this._profitValue) {
            case "weight":
                profitText = "profit/ton";
                break;
            case "distance":
                profitText = "profit/distance";
                break;
            case "total":
                profitText = "total profit";
                break;
            default:
                throw Error("Wrong profit value");
        }

        const getTrade = trade => {
            const addInfo = text => `<div><div>${text}</div>`;
            const addDes = text => `<div class="des">${text}</div></div>`;

            const weight = trade.weightPerItem * trade.quantity;

            let h = addInfo(`${formatInt(trade.quantity)} ${trade.good}`) + addDes("trade");
            h += addInfo(`${formatSiCurrency(trade.profit)}`) + addDes(profitText);
            h += addInfo(`${formatSiInt(weight)}`) + addDes(weight === 1 ? "ton" : "tons");
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
            .data(this._linkDataFiltered, d => ShowTrades._getId(d))
            .join(enter => enter.append("div").attr("class", "block"))
            .html(d => getTrade(d));
    }

    _filterTradesByVisiblePorts() {
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
    }

    _filterTradesBySelectedNations() {
        console.log(this._portDataFiltered);
        this._linkData = this._linkData
            .filter(trade => this._portDataFiltered.has(trade.source.id) && this._portDataFiltered.has(trade.target.id))
            .slice(0, this._numTrades);
    }

    _filterPortsBySelectedNations() {
        const selectedNations = new Set(Array.from(this._nationSelector.selectedOptions).map(option => option.value));
        this._portDataFiltered = new Set(
            this._portData.filter(port => selectedNations.has(port.nation)).map(port => port.id)
        );
    }

    /**
     * Get profit value from cookie or use default value
     * @returns {string} - profit value
     */
    _getShowValue() {
        const r = this._showCookie.get();

        this._showRadios.set(r);

        return r;
    }

    /**
     * Get profit value from cookie or use default value
     * @returns {string} - profit value
     */
    _getProfitValue() {
        const r = this._profitCookie.get();

        this._profitRadios.set(r);

        return r;
    }

    _update() {
        this._filterTradesByVisiblePorts();
        this._updateGraph();
        this._updateList();
    }

    /**
     * Set bounds of current viewport
     * @param {Bound} lowerBound - Top left coordinates of current viewport
     * @param {Bound} upperBound - Bottom right coordinates of current viewport
     * @return {void}
     */
    setBounds(lowerBound, upperBound) {
        this._lowerBound = lowerBound;
        this._upperBound = upperBound;
    }

    transform(transform) {
        this._g.attr("transform", transform);
        this._scale = transform.k;

        this._update();
    }

    clearMap() {
        this._g.selectAll("*").remove();
        this._linkData = this._linkDataDefault;
        this._update();
    }
}
