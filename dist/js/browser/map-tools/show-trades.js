/*!
 * This file is part of na-map.
 *
 * @file      Show trades.
 * @module    map-tools/show-trades
 * @author    iB aka Felix Victor
 * @copyright 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import "bootstrap/js/dist/util";
import "bootstrap/js/dist/collapse";
import "bootstrap/js/dist/tooltip";
import "bootstrap-select/js/bootstrap-select";
import { extent as d3Extent } from "d3-array";
import { scaleLinear as d3ScaleLinear, scalePoint as d3ScalePoint } from "d3-scale";
import { select as d3Select } from "d3-selection";
import { nations, putImportError } from "../../common/common";
import { formatInt, formatSiCurrency, formatSiInt } from "../../common/common-format";
import { defaultFontSize, roundToThousands } from "../../common/common-math";
import Cookie from "../util/cookie";
import RadioButton from "../util/radio-button";
export default class ShowTrades {
    constructor(serverName, portSelect, minScale, lowerBound, upperBound) {
        this._serverName = serverName;
        this._portSelect = portSelect;
        this._minScale = minScale;
        this._scale = this._minScale;
        this._fontSize = defaultFontSize;
        this._isDataLoaded = false;
        this._numTrades = 30;
        this._arrowX = 18;
        this._arrowY = 18;
        this._baseId = "show-trades";
        this._nationSelectId = `${this._baseId}-nation-select`;
        this._listType = "tradeList";
        this._showId = "show-trades-show";
        this._showRadioValues = ["off", "on"];
        this._showCookie = new Cookie({ id: this._showId, values: this._showRadioValues });
        this._showRadios = new RadioButton(this._showId, this._showRadioValues);
        this._profitId = "show-trades-profit";
        this._profitRadioValues = ["weight", "distance", "total"];
        this._profitCookie = new Cookie({ id: this._profitId, values: this._profitRadioValues });
        this._profitRadios = new RadioButton(this._profitId, this._profitRadioValues);
        this.show = this._getShowValue();
        this._setupSvg();
        this._setupSelects();
        this._setupProfitRadios();
        this._setupListener();
        this._setupList();
        this.setBounds(lowerBound, upperBound);
        if (this.show) {
            this._portSelect.setupInventorySelect(this.show);
        }
        this._profitValue = this._getProfitValue();
    }
    static _getId(link) {
        return `trade-${link.source.id}-${link.good.replace(/ /g, "")}-${link.target.id}`;
    }
    static _addInfo(text) {
        return `<div><div>${text}</div>`;
    }
    static _addDes(text) {
        return `<div class="des">${text}</div></div>`;
    }
    static _getProfitPerWeight(trade) {
        return trade.weightPerItem === 0
            ? trade.profitTotal
            : Math.round(trade.profitTotal / (trade.weightPerItem * trade.quantity));
    }
    static _getProfitPerDistance(trade) {
        return trade.profitTotal / trade.distance;
    }
    static _startBlock(text) {
        return `<div class="block-block"><span>${text}</span>`;
    }
    static _endBlock() {
        return "</div>";
    }
    static _hideDetails(d, i, nodes) {
        $(d3Select(nodes[i]).node()).tooltip("dispose");
    }
    static _showElem(elem) {
        elem.classed("d-none", false);
    }
    static _hideElem(elem) {
        elem.classed("d-none", true);
    }
    _setupSvg() {
        this._g = d3Select("#na-svg").insert("g", "g.pb").attr("class", "trades");
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
            .attr("class", "trade-arrow-head");
        this._tradeDetailsDiv = d3Select("main #summary-column")
            .append("div")
            .attr("id", "trade-details")
            .attr("class", "trade-details");
    }
    _setupSelects() {
        const options = `${nations
            .map((nation) => `<option value="${nation.short}" selected>${nation.name}</option>`)
            .join("")}`;
        const cardId = `${this._baseId}-card`;
        this._tradeDetailsHead = this._tradeDetailsDiv.append("div");
        const label = this._tradeDetailsHead.append("label");
        const select = label
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
                }
                else {
                    text = String(amount);
                }
                return `${text} nations selected`;
            },
            title: "Select nations",
        });
        label
            .append("button")
            .attr("class", "btn btn-small btn-outline-primary")
            .attr("data-toggle", "collapse")
            .attr("data-target", `#${cardId}`)
            .text("Info");
        this._tradeDetailsHead
            .append("div")
            .attr("id", cardId)
            .attr("class", "collapse")
            .append("div")
            .attr("class", "card card-body small")
            .text("Trade data is static (snapshot taken during maintenance). " +
            "Therefore, price and/or quantity may not be available anymore. " +
            "Data is limited as buy and sell prices at a certain port are " +
            "only known when this port has this good in its inventory or " +
            "a buy/sell contract. " +
            "Better sell ports may be found using the in-game trader tool.");
    }
    _setupProfitRadios() {
        const profitRadioGroup = this._tradeDetailsHead
            .append("div")
            .attr("id", this._profitId)
            .attr("class", "align-self-center radio-group pl-2");
        profitRadioGroup.append("legend").attr("class", "col-form-label").text("Sort net profit by");
        for (const button of this._profitRadioValues) {
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
            div.append("label").attr("for", id).attr("class", "custom-control-label").text(button);
        }
    }
    _setupListener() {
        var _a, _b;
        (_a = document.querySelector(`#${this._showId}`)) === null || _a === void 0 ? void 0 : _a.addEventListener("change", async () => this._showSelected());
        (_b = document.querySelector(`#${this._profitId}`)) === null || _b === void 0 ? void 0 : _b.addEventListener("change", () => this._profitValueSelected());
        this._nationSelector.addEventListener("change", (event) => {
            this._nationChanged();
            event.preventDefault();
        });
    }
    _setupList() {
        this._list = this._tradeDetailsDiv.append("div").attr("class", "trade-list small");
    }
    _setupData() {
        this._linkData = this._linkDataDefault;
        this._nodeData = new Map(this._portData.map((port) => [
            port.id,
            {
                name: port.name,
                nation: port.nation,
                isShallow: port.shallow,
                x: port.coordinates[0],
                y: port.coordinates[1],
            },
        ]));
        this._filterPortsBySelectedNations();
        this._sortLinkData();
    }
    _sortLinkData() {
        this._linkData = this._linkData
            .map((trade) => {
            let profit = 0;
            switch (this._profitValue) {
                case "weight":
                    profit = ShowTrades._getProfitPerWeight(trade);
                    break;
                case "distance":
                    profit = ShowTrades._getProfitPerDistance(trade);
                    break;
                case "total":
                    profit = trade.profitTotal;
                    break;
                default:
                    throw new Error(`Wrong profit value ${this._profitValue}`);
            }
            trade.profit = profit;
            return trade;
        })
            .sort((a, b) => { var _a, _b; return (_a = b.profit) !== null && _a !== void 0 ? _a : 0 - ((_b = a.profit) !== null && _b !== void 0 ? _b : 0); });
    }
    async _showSelected() {
        const show = this._showRadios.get();
        this.show = show === "on";
        this._showCookie.set(show);
        await this.showOrHide();
        this._portSelect.setupInventorySelect(this.show);
        this._filterTradesBySelectedNations();
        this._sortLinkData();
        this.update();
    }
    async _loadData() {
        const dataDirectory = "data";
        try {
            const portData = (await import("Lib/gen-generic/ports.json"))
                .default;
            const pbData = (await (await fetch(`${dataDirectory}/${this._serverName}-pb.json`)).json());
            this._linkDataDefault = (await (await fetch(`${dataDirectory}/${this._serverName}-trades.json`)).json());
            this._portData = portData.map((port) => {
                const pbPortData = pbData.find((d) => d.id === port.id);
                return { ...port, ...pbPortData };
            });
        }
        catch (error) {
            putImportError(error);
        }
    }
    async _loadAndSetupData() {
        try {
            await this._loadData();
            this._setupData();
        }
        catch (error) {
            putImportError(error);
        }
    }
    async showOrHide() {
        if (this.show) {
            if (!this._isDataLoaded) {
                await this._loadAndSetupData().then(() => {
                    this._isDataLoaded = true;
                });
            }
            ShowTrades._showElem(this._tradeDetailsDiv);
            this._linkData = this._linkDataDefault;
        }
        else {
            ShowTrades._hideElem(this._tradeDetailsDiv);
            this._linkData = [];
        }
    }
    _profitValueSelected() {
        this._profitValue = this._profitRadios.get();
        this._profitCookie.set(this._profitValue);
        this._sortLinkData();
        this.update();
    }
    _nationChanged() {
        this._linkData = this._linkDataDefault;
        this._filterPortsBySelectedNations();
        this._filterTradesBySelectedNations();
        this.update();
    }
    _portIsShallow(portId) {
        var _a, _b;
        return (_b = (_a = this._nodeData.get(portId)) === null || _a === void 0 ? void 0 : _a.isShallow) !== null && _b !== void 0 ? _b : true;
    }
    _getDepth(portId) {
        return this._portIsShallow(portId) ? "(shallow)" : "(deep)";
    }
    _getTradeLimitedData(trade) {
        var _a, _b, _c, _d, _e;
        const weight = trade.weightPerItem * trade.quantity;
        let h = "";
        h += ShowTrades._addInfo(`${formatInt(trade.quantity)} ${trade.good}`) + ShowTrades._addDes("trade");
        h += ShowTrades._addInfo(`${formatSiCurrency((_a = trade.profit) !== null && _a !== void 0 ? _a : 0)}`) + ShowTrades._addDes(this._profitText);
        h +=
            ShowTrades._addInfo(`${formatSiInt(weight)} ${weight === 1 ? "ton" : "tons"}`) +
                ShowTrades._addDes("weight");
        h +=
            ShowTrades._addInfo(`${(_b = this._nodeData.get(trade.source.id)) === null || _b === void 0 ? void 0 : _b.name} <span class="caps">${(_c = this._nodeData.get(trade.source.id)) === null || _c === void 0 ? void 0 : _c.nation}</span>`) + ShowTrades._addDes(`from ${this._getDepth(trade.source.id)}`);
        h +=
            ShowTrades._addInfo(`${(_d = this._nodeData.get(trade.target.id)) === null || _d === void 0 ? void 0 : _d.name} <span class="caps">${(_e = this._nodeData.get(trade.target.id)) === null || _e === void 0 ? void 0 : _e.nation}</span>`) + ShowTrades._addDes(`to ${this._getDepth(trade.target.id)}`);
        h += ShowTrades._addInfo(`${formatSiInt(trade.distance)}\u2009k`) + ShowTrades._addDes("distance");
        return h;
    }
    _getTradeFullData(trade) {
        var _a, _b, _c, _d;
        const weight = trade.weightPerItem * trade.quantity;
        const profitPerItem = trade.target.grossPrice - trade.source.grossPrice;
        const profitPerDistance = ShowTrades._getProfitPerDistance(trade);
        const profitPerWeight = ShowTrades._getProfitPerWeight(trade);
        let h = "";
        h += ShowTrades._startBlock("Trade");
        h += ShowTrades._addInfo(`${formatInt(trade.quantity)} ${trade.good}`) + ShowTrades._addDes("good");
        h += ShowTrades._addInfo(`${formatSiCurrency(trade.source.grossPrice)}`) + ShowTrades._addDes("gross buy price");
        h +=
            ShowTrades._addInfo(`${formatSiCurrency(trade.target.grossPrice)}`) + ShowTrades._addDes("gross sell price");
        h +=
            ShowTrades._addInfo(`${formatSiInt(weight)} ${weight === 1 ? "ton" : "tons"}`) +
                ShowTrades._addDes("weight");
        h += ShowTrades._endBlock();
        h += ShowTrades._startBlock("Profit");
        h += ShowTrades._addInfo(`${formatSiCurrency(trade.profitTotal)}`) + ShowTrades._addDes("total");
        h += ShowTrades._addInfo(`${formatSiCurrency(profitPerItem)}`) + ShowTrades._addDes("profit/item");
        h += ShowTrades._addInfo(`${formatSiCurrency(profitPerDistance)}`) + ShowTrades._addDes("profit/distance");
        h += ShowTrades._addInfo(`${formatSiCurrency(profitPerWeight)}`) + ShowTrades._addDes("profit/weight");
        h += ShowTrades._endBlock();
        h += ShowTrades._startBlock("Route");
        h +=
            ShowTrades._addInfo(`${(_a = this._nodeData.get(trade.source.id)) === null || _a === void 0 ? void 0 : _a.name} <span class="caps">${(_b = this._nodeData.get(trade.source.id)) === null || _b === void 0 ? void 0 : _b.nation}</span>`) + ShowTrades._addDes(`from ${this._getDepth(trade.source.id)}`);
        h +=
            ShowTrades._addInfo(`${(_c = this._nodeData.get(trade.target.id)) === null || _c === void 0 ? void 0 : _c.name} <span class="caps">${(_d = this._nodeData.get(trade.target.id)) === null || _d === void 0 ? void 0 : _d.nation}</span>`) + ShowTrades._addDes(`to ${this._getDepth(trade.source.id)}`);
        h += ShowTrades._addInfo(`${formatSiInt(trade.distance)}\u2009k`) + ShowTrades._addDes("distance");
        h += ShowTrades._endBlock();
        return h;
    }
    _showDetails(d, i, nodes) {
        const trade = d3Select(nodes[i]);
        const title = this._getTradeFullData(d);
        $(trade.node())
            .tooltip({
            html: true,
            placement: "auto",
            template: '<div class="tooltip" role="tooltip">' +
                '<div class="tooltip-block tooltip-inner tooltip-small">' +
                "</div></div>",
            title,
            trigger: "manual",
            sanitize: false,
        })
            .tooltip("show");
    }
    _getSiblingLinks(sourceId, targetId) {
        return this._linkDataFiltered
            .filter((link) => (link.source.id === sourceId && link.target.id === targetId) ||
            (link.source.id === targetId && link.target.id === sourceId))
            .map((link) => { var _a; return (_a = link.profit) !== null && _a !== void 0 ? _a : 0; });
    }
    _getXCoord(portId) {
        var _a, _b;
        return (_b = (_a = this._nodeData.get(portId)) === null || _a === void 0 ? void 0 : _a.x) !== null && _b !== void 0 ? _b : 0;
    }
    _getYCoord(portId) {
        var _a, _b;
        return (_b = (_a = this._nodeData.get(portId)) === null || _a === void 0 ? void 0 : _a.y) !== null && _b !== void 0 ? _b : 0;
    }
    _updateGraph() {
        const arcPath = (leftHand, d) => {
            var _a, _b;
            const source = { x: this._getXCoord(d.source.id), y: this._getYCoord(d.source.id) };
            const target = { x: this._getXCoord(d.target.id), y: this._getYCoord(d.target.id) };
            const x1 = leftHand ? source.x : target.x;
            const y1 = leftHand ? source.y : target.y;
            const x2 = leftHand ? target.x : source.x;
            const y2 = leftHand ? target.y : source.y;
            let dr = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
            const xRotation = 0;
            const largeArc = 0;
            const sweep = leftHand ? 0 : 1;
            const siblings = this._getSiblingLinks(d.source.id, d.target.id);
            if (siblings.length > 1) {
                const arcScale = d3ScalePoint().domain(siblings).range([1, siblings.length]);
                dr /= 1 + (1 / siblings.length) * ((_b = arcScale((_a = d.profit) !== null && _a !== void 0 ? _a : 0)) !== null && _b !== void 0 ? _b : 0 - 1);
            }
            dr = Math.round(dr);
            return `M${x1},${y1}A${dr},${dr} ${xRotation},${largeArc},${sweep} ${x2},${y2}`;
        };
        const data = this._portSelect.isInventorySelected ? [] : this._linkDataFiltered;
        const extent = d3Extent(this._linkDataFiltered, (d) => { var _a; return (_a = d.profit) !== null && _a !== void 0 ? _a : 0; });
        const linkWidthScale = d3ScaleLinear()
            .range([5 / this._scale, 15 / this._scale])
            .domain(extent);
        const fontScale = 2 ** Math.log2(Math.abs(this._minScale) + this._scale);
        const fontSize = roundToThousands(this._fontSize / fontScale);
        this._g
            .selectAll(".trade-link")
            .data(data, (d) => ShowTrades._getId(d))
            .join((enter) => enter
            .append("path")
            .attr("class", "trade-link")
            .attr("marker-start", (d) => this._getXCoord(d.source.id) < this._getXCoord(d.target.id) ? "" : "url(#trade-arrow)")
            .attr("marker-end", (d) => this._getXCoord(d.source.id) < this._getXCoord(d.target.id) ? "url(#trade-arrow)" : "")
            .attr("id", (d) => ShowTrades._getId(d))
            .on("click", (d, i, nodes) => this._showDetails(d, i, nodes))
            .on("mouseleave", ShowTrades._hideDetails))
            .attr("d", (d) => arcPath(this._getXCoord(d.source.id) < this._getXCoord(d.target.id), d))
            .attr("stroke-width", (d) => { var _a; return `${linkWidthScale((_a = d.profit) !== null && _a !== void 0 ? _a : 0)}px`; });
        this._labelG.attr("font-size", `${fontSize}px`);
        this._labelG
            .selectAll(".trade-label")
            .data(this._linkDataFiltered, (d) => ShowTrades._getId(d))
            .join((enter) => enter
            .append("text")
            .attr("class", "trade-label")
            .append("textPath")
            .attr("startOffset", "15%")
            .attr("xlink:href", (d) => `#${ShowTrades._getId(d)}`)
            .text((d) => `${formatInt(d.quantity)} ${d.good}`))
            .attr("dy", (d) => { var _a; return `-${linkWidthScale((_a = d.profit) !== null && _a !== void 0 ? _a : 0) / 1.5}px`; });
    }
    get listType() {
        return this._listType;
    }
    set listType(type) {
        this._listType = type;
        switch (this._listType) {
            case "inventory":
                this._linkData = [];
                ShowTrades._hideElem(this._tradeDetailsHead);
                this._list.remove();
                this._list = this._tradeDetailsDiv.append("div").attr("class", "small p-2");
                break;
            case "portList":
                this._linkData = [];
                ShowTrades._hideElem(this._tradeDetailsHead);
                this._list.remove();
                this._list = this._tradeDetailsDiv.append("div").attr("class", "small p-2");
                break;
            default:
                this._linkData = this._linkDataDefault;
                ShowTrades._showElem(this._tradeDetailsHead);
                this._list.remove();
                this._list = this._tradeDetailsDiv.append("div").attr("class", "trade-list small");
                break;
        }
    }
    _updateList(data) {
        switch (this._listType) {
            case "inventory":
                this._updateInventory(data);
                break;
            case "portList":
                this._updatePortList(data);
                break;
            default:
                this._updateTradeList();
                break;
        }
    }
    _updateInventory(inventory) {
        this._list.html(inventory !== null && inventory !== void 0 ? inventory : "");
    }
    _updatePortList(portList) {
        this._list.html(portList !== null && portList !== void 0 ? portList : "");
    }
    _updateTradeList() {
        let highlightLink;
        const highlightOn = (d) => {
            highlightLink = d3Select(`path#${ShowTrades._getId(d)}`).classed("highlight", true);
            highlightLink.dispatch("click");
        };
        const highlightOff = () => {
            highlightLink.classed("highlight", false);
            highlightLink.dispatch("mouseleave");
        };
        this._list
            .selectAll("div.block")
            .data(this._linkDataFiltered, (d) => ShowTrades._getId(d))
            .join((enter) => enter.append("div").attr("class", "block").on("mouseenter", highlightOn).on("mouseleave", highlightOff))
            .html((d) => this._getTradeLimitedData(d));
    }
    _filterTradesByVisiblePorts() {
        const portDataFiltered = new Set(this._portData
            .filter((port) => port.coordinates[0] >= this._lowerBound[0] &&
            port.coordinates[0] <= this._upperBound[0] &&
            port.coordinates[1] >= this._lowerBound[1] &&
            port.coordinates[1] <= this._upperBound[1])
            .map((port) => port.id));
        this._linkDataFiltered = this._linkData
            .filter((trade) => portDataFiltered.has(trade.source.id) || portDataFiltered.has(trade.target.id))
            .slice(0, this._numTrades);
    }
    _filterTradesBySelectedNations() {
        this._linkData = this._linkData
            .filter((trade) => this._portDataFiltered.has(trade.source.id) && this._portDataFiltered.has(trade.target.id))
            .slice(0, this._numTrades);
    }
    _filterPortsBySelectedNations() {
        const selectedNations = new Set([...this._nationSelector.selectedOptions].map((option) => option.value));
        this._portDataFiltered = new Set(this._portData.filter((port) => selectedNations.has(port.nation)).map((port) => port.id));
    }
    _getShowValue() {
        const r = this._showCookie.get();
        this._showRadios.set(r);
        return r === "on";
    }
    _getProfitValue() {
        const r = this._profitCookie.get();
        this._profitRadios.set(r);
        switch (r) {
            case "weight":
                this._profitText = "profit/weight";
                break;
            case "distance":
                this._profitText = "profit/distance";
                break;
            case "total":
                this._profitText = "total";
                break;
            default:
                throw new Error("Wrong profit value");
        }
        return r;
    }
    update(data) {
        if (this.show) {
            this._filterTradesByVisiblePorts();
            this._updateList(data);
        }
        else {
            this._linkDataFiltered = [];
        }
        this._updateGraph();
    }
    setBounds(lowerBound, upperBound) {
        this._lowerBound = lowerBound;
        this._upperBound = upperBound;
    }
    transform(transform) {
        this._g.attr("transform", transform.toString());
        this._scale = transform.k;
        this.update();
    }
    clearMap() {
        this.listType = "tradeList";
        if (this.show) {
            this._linkData = this._linkDataDefault;
        }
        else {
            this._linkData = [];
        }
        this.update();
    }
}
//# sourceMappingURL=show-trades.js.map