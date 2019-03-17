/**
 * This file is part of na-map.
 *
 * @file      Select ports.
 * @module    map/select-ports
 * @author    iB aka Felix Victor
 * @copyright 2018
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import "bootstrap-select/js/bootstrap-select";
import moment from "moment";

import "tempusdominus-bootstrap-4/build/js/tempusdominus-bootstrap-4";
import "tempusdominus-core/build/js/tempusdominus-core";

import { registerEvent } from "../analytics";
import { initMultiDropdownNavbar, nations } from "../common";
import { formatInt, formatSiCurrency, sortBy } from "../util";

export default class SelectPorts {
    constructor(ports, pbZone, map) {
        this._ports = ports;
        this._pbZone = pbZone;
        this._map = map;

        this._dateFormat = "D MMM";
        this._timeFormat = "HH.00";

        this._portNamesId = "port-names-select";
        this._portNamesSelector = document.getElementById(this._portNamesId);

        this._buyGoodsId = "buy-goods-select";
        this._buyGoodsSelector = document.getElementById(this._buyGoodsId);

        this._inventoryId = "inventory-select";
        this._inventorySelector = document.getElementById(this._inventoryId);

        this._propNationId = "prop-nation-select";
        this._propNationSelector = document.getElementById(this._propNationId);

        this._propClanId = "prop-clan-select";
        this._propClanSelector = document.getElementById(this._propClanId);

        this._propCMId = "prop-cm-select";
        this._propCMSelector = document.getElementById(this._propCMId);

        this.isInventorySelected = false;

        this._setupSelects();
        this._setupListener();
    }

    _setupSelects() {
        this._setupPortSelect();
        this._setupGoodSelect();
        this._setupNationSelect();
        this._setupClanSelect();
        this._setupCMSelect();
    }

    _resetOtherSelects(activeSelectSelector) {
        [
            this._portNamesSelector,
            this._buyGoodsSelector,
            this._inventorySelector,
            this._propNationSelector,
            this._propClanSelector,
            this._propCMSelector
        ].forEach(selectSelector => {
            if (
                selectSelector !== activeSelectSelector &&
                !(selectSelector === this._propClanSelector && activeSelectSelector === this._propNationSelector) &&
                !(selectSelector === this._propNationSelector && activeSelectSelector === this._propClanSelector)
            ) {
                $(selectSelector)
                    .val("default")
                    .selectpicker("refresh");
            }
        });
    }

    _setupListener() {
        this._portNamesSelector.addEventListener("change", event => {
            registerEvent("Menu", "Port relations");
            this._resetOtherSelects(this._portNamesSelector);
            this._portSelected();
            event.preventDefault();
        });

        this._buyGoodsSelector.addEventListener("change", event => {
            registerEvent("Menu", "Goods’ relations");
            this._resetOtherSelects(this._buyGoodsSelector);
            this._goodSelected();
            event.preventDefault();
        });

        this._inventorySelector.addEventListener("change", event => {
            registerEvent("Menu", "Inventory");
            this._resetOtherSelects(this._inventorySelector);
            this.inventorySelected();
            event.preventDefault();
        });

        this._propNationSelector.addEventListener("change", event => {
            this._resetOtherSelects(this._propNationSelector);
            this._nationSelected();
            event.preventDefault();
        });

        this._propClanSelector.addEventListener("change", event => {
            this._resetOtherSelects(this._propClanSelector);
            this._clanSelected();
            event.preventDefault();
        });

        this._propCMSelector.addEventListener("change", event => {
            this._resetOtherSelects(this._propCMSelector);
            this._CMSelected();
            event.preventDefault();
        });

        document.getElementById("menu-prop-deep").addEventListener("click", () => this._depthSelected("deep"));
        document.getElementById("menu-prop-shallow").addEventListener("click", () => this._depthSelected("shallow"));

        document.getElementById("menu-prop-all").addEventListener("click", () => this._allSelected());
        document.getElementById("menu-prop-green").addEventListener("click", () => this._greenZoneSelected());

        document.getElementById("menu-prop-large").addEventListener("click", () => this._portSizeSelected("Large"));
        document.getElementById("menu-prop-medium").addEventListener("click", () => this._portSizeSelected("Medium"));
        document.getElementById("menu-prop-small").addEventListener("click", () => this._portSizeSelected("Small"));

        $.fn.datetimepicker.Constructor.Default = $.extend({}, $.fn.datetimepicker.Constructor.Default, {
            icons: {
                time: "far fa-clock",
                date: "far fa-calendar",
                up: "fas fa-arrow-up",
                down: "fas fa-arrow-down",
                previous: "fas fa-chevron-left",
                next: "fas fa-chevron-right",
                today: "far fa-calendar-check",
                clear: "fas fa-trash",
                close: "fas fa-times"
            },
            timeZone: "UTC"
        });

        $("#prop-pb-from").datetimepicker({
            format: this._timeFormat
        });
        $("#prop-pb-to").datetimepicker({
            format: this._timeFormat
        });
        $("#prop-pb-range").submit(event => {
            this._capturePBRange();
            this._toggleMenuDropdown();
            event.preventDefault();
        });

        document.getElementById("menu-prop-today").addEventListener("click", () => this._capturedToday());
        document.getElementById("menu-prop-yesterday").addEventListener("click", () => this._capturedYesterday());
        document.getElementById("menu-prop-this-week").addEventListener("click", () => this._capturedThisWeek());
        document.getElementById("menu-prop-last-week").addEventListener("click", () => this._capturedLastWeek());

        const portFrom = $("#prop-from");
        const portTo = $("#prop-to");
        portFrom.datetimepicker({
            format: this._dateFormat
        });
        portTo.datetimepicker({
            format: this._dateFormat,
            useCurrent: false
        });
        portFrom.on("change.datetimepicker", e => portTo.datetimepicker("minDate", e.date));
        portTo.on("change.datetimepicker", e => portFrom.datetimepicker("maxDate", e.date));

        $("#prop-range").submit(event => {
            this._captureRange();
            this._toggleMenuDropdown();
            event.preventDefault();
        });

        initMultiDropdownNavbar("selectPortNavbar");
    }

    _setupPortSelect() {
        const selectPorts = this._ports.portDataDefault
            .map(d => ({
                id: d.id,
                coord: [d.coordinates[0], d.coordinates[1]],
                name: d.name,
                nation: d.nation
            }))
            .sort(sortBy(["name"]));
        const options = `${selectPorts
            .map(
                port =>
                    `<option data-subtext="${port.nation}" value="${port.coord}" data-id="${port.id}">${
                        port.name
                    }</option>`
            )
            .join("")}`;

        this._portNamesSelector.insertAdjacentHTML("beforeend", options);
        this._portNamesSelector.classList.add("selectpicker");
        $(this._portNamesSelector).selectpicker({
            dropupAuto: false,
            liveSearch: true,
            liveSearchNormalize: true,
            liveSearchPlaceholder: "Search ...",
            title: "Show port relations",
            virtualScroll: true
        });
        this._portNamesSelector.classList.remove("d-none");
        this._portNamesSelector.parentNode.classList.remove("d-none");
    }

    _setupGoodSelect() {
        const selectGoods = new Set();

        this._ports.portDataDefault.forEach(port => {
            ["consumesTrading", "dropsTrading", "dropsNonTrading", "producesNonTrading"].forEach(type => {
                if (port[type]) {
                    port[type].forEach(good => selectGoods.add(good));
                }
            });
        });

        const options = `${[...selectGoods]
            .sort()
            .map(good => `<option>${good}</option>`)
            .join("")}`;

        this._buyGoodsSelector.insertAdjacentHTML("beforeend", options);
        this._buyGoodsSelector.classList.add("selectpicker");
        $(this._buyGoodsSelector).selectpicker({
            dropupAuto: false,
            liveSearch: true,
            liveSearchNormalize: true,
            liveSearchPlaceholder: "Search ...",
            title: "Show goods’ relations",
            virtualScroll: true
        });
        this._buyGoodsSelector.classList.remove("d-none");
        this._buyGoodsSelector.parentNode.classList.remove("d-none");
    }

    setupInventorySelect(show) {
        if (!this._inventorySelector.classList.contains("selectpicker")) {
            const selectGoods = new Set();

            this._ports.portDataDefault.forEach(port => {
                if (port.inventory) {
                    port.inventory.forEach(good => selectGoods.add(good.name));
                }
            });

            const options = `${[...selectGoods]
                .sort()
                .map(good => `<option>${good}</option>`)
                .join("")}`;

            this._inventorySelector.insertAdjacentHTML("beforeend", options);
            this._inventorySelector.classList.add("selectpicker");
            $(this._inventorySelector).selectpicker({
                dropupAuto: false,
                liveSearch: true,
                liveSearchNormalize: true,
                liveSearchPlaceholder: "Search ...",
                title: "Show good availability",
                virtualScroll: true
            });
        }

        if (show) {
            this._inventorySelector.classList.remove("d-none");
            this._inventorySelector.parentNode.classList.remove("d-none");
        } else {
            this._inventorySelector.classList.add("d-none");
            this._inventorySelector.parentNode.classList.add("d-none");
        }
    }

    _setupNationSelect() {
        const options = `${nations
            .sort(sortBy(["name"]))
            .map(nation => `<option value="${nation.short}">${nation.name}</option>`)
            .join("")}`;

        this._propNationSelector.insertAdjacentHTML("beforeend", options);
        this._propNationSelector.classList.add("selectpicker");
        $(this._propNationSelector).selectpicker({
            dropupAuto: false,
            liveSearch: false,
            virtualScroll: true
        });
    }

    _setupClanSelect() {
        const clanList = new Set();
        this._ports.portData.filter(d => d.capturer).forEach(d => clanList.add(d.capturer));

        this._propClanSelector.innerHTML = "";
        let options = "";

        if (clanList.size === 0) {
            this._propClanSelector.disabled = true;
        } else {
            this._propClanSelector.disabled = false;
            options = `${[...clanList]
                .sort()
                .map(clan => `<option value="${clan}" class="caps">${clan}</option>`)
                .join("")}`;
        }

        this._propClanSelector.insertAdjacentHTML("beforeend", options);
        this._propClanSelector.classList.add("selectpicker");
        $(this._propClanSelector).selectpicker({
            dropupAuto: false,
            liveSearch: false,
            virtualScroll: true
        });
    }

    _setupCMSelect() {
        const cmList = new Set();

        this._ports.portData.forEach(d => cmList.add(d.conquestMarksPension));
        const options = `${[...cmList]
            .sort()
            .map(cm => `<option value="${cm}">${cm}</option>`)
            .join("")}`;
        this._propCMSelector.insertAdjacentHTML("beforeend", options);
        this._propCMSelector.classList.add("selectpicker");
        $(this._propCMSelector).selectpicker();
    }

    _setTradePortPartners() {
        let tradePortConsumedGoods = [];
        let tradePortProducedGoods = [];

        const tradePort = this._ports.portDataDefault.find(port => port.id === this._ports.tradePortId);
        if (tradePort.consumesTrading) {
            tradePortConsumedGoods = tradePort.consumesTrading.map(good => good);
        }

        if (tradePort.dropsTrading) {
            tradePortProducedGoods = tradePort.dropsTrading.map(good => good);
        }

        this._ports.portData = JSON.parse(JSON.stringify(this._ports.portDataDefault))
            .map(port => {
                // eslint-disable-next-line no-param-reassign
                port.goodsToSellInTradePort = [];
                // eslint-disable-next-line no-param-reassign
                port.sellInTradePort = false;
                // eslint-disable-next-line no-param-reassign
                port.goodsToBuyInTradePort = [];
                // eslint-disable-next-line no-param-reassign
                port.buyInTradePort = false;
                if (port.consumesTrading) {
                    port.consumesTrading.forEach(good => {
                        if (tradePortProducedGoods.includes(good)) {
                            port.goodsToBuyInTradePort.push(good);
                            // eslint-disable-next-line no-param-reassign
                            port.buyInTradePort = true;
                        }
                    });
                }

                if (port.dropsTrading) {
                    port.dropsTrading.forEach(good => {
                        if (tradePortConsumedGoods.includes(good)) {
                            port.goodsToSellInTradePort.push(good);
                            // eslint-disable-next-line no-param-reassign
                            port.sellInTradePort = true;
                        }
                    });
                }

                return port;
            })
            .filter(port => port.id === this._ports.tradePortId || port.sellInTradePort || port.buyInTradePort);
    }

    _toggleMenuDropdown() {
        $("#propertyDropdown").dropdown("toggle");
    }

    _portSelected() {
        const port = this._portNamesSelector.options[this._portNamesSelector.selectedIndex];
        const c = port.value.split(",");
        const id = Number(port.getAttribute("data-id"));

        this._ports.currentPort = {
            id,
            coord: { x: Number(c[0]), y: Number(c[1]) }
        };
        this._ports.tradePortId = id;

        this._setTradePortPartners();

        if (this._pbZone._showPBZones) {
            this._pbZone.refresh();
        }

        this._ports.showTradePortPartners = true;
        this._ports.showCurrentGood = false;
        this._ports.update();
        this._ports._map.initialZoomAndPan();
    }

    _goodSelected() {
        const goodSelected = this._buyGoodsSelector.options[this._buyGoodsSelector.selectedIndex].value;
        const sourcePorts = JSON.parse(
            JSON.stringify(
                this._ports.portDataDefault.filter(
                    port =>
                        (port.dropsTrading && port.dropsTrading.some(good => good === goodSelected)) ||
                        (port.dropsNonTrading && port.dropsNonTrading.some(good => good === goodSelected)) ||
                        (port.producesNonTrading && port.producesNonTrading.some(good => good === goodSelected))
                )
            )
        ).map(port => {
            // eslint-disable-next-line no-param-reassign
            port.isSource = true;
            return port;
        });
        const consumingPorts = JSON.parse(
            JSON.stringify(
                this._ports.portDataDefault.filter(
                    port => port.consumesTrading && port.consumesTrading.some(good => good === goodSelected)
                )
            )
        ).map(port => {
            // eslint-disable-next-line prefer-destructuring,no-param-reassign
            port.isSource = false;
            return port;
        });

        this._ports.setShowRadiusSetting("off");
        this._ports.portData = sourcePorts.concat(consumingPorts);
        this._ports.showCurrentGood = true;
        this._ports.showTradePortPartners = false;
        this._ports.update();
    }

    inventorySelected() {
        this.isInventorySelected = true;

        const goodSelected = this._inventorySelector.options[this._inventorySelector.selectedIndex].value;
        const buyGoods = new Map();
        const sellGoods = new Map();
        const portsFiltered = JSON.parse(
            JSON.stringify(
                this._ports.portDataDefault.filter(
                    port => port.inventory && port.inventory.some(good => good.name === goodSelected)
                )
            )
        )
            .sort(sortBy(["name"]))
            .map(port => {
                const item = port.inventory.find(good => good.name === goodSelected);

                if (item.buyQuantity > 0) {
                    // eslint-disable-next-line no-param-reassign
                    port.sellInTradePort = item.buyQuantity > 0;
                    buyGoods.set(port.name, { name: port.name, nation: port.nation, good: item });
                }

                if (item.sellQuantity > 0) {
                    // eslint-disable-next-line no-param-reassign
                    port.buyInTradePort = item.sellQuantity > 0;
                    sellGoods.set(port.name, { name: port.name, nation: port.nation, good: item });
                }

                return port;
            });

        const getPortList = () => {
            let h = "";

            h += `<h5>${goodSelected}</h5>`;
            if (buyGoods.size) {
                h += "<h6>Buy</h6>";
                buyGoods.forEach(value => {
                    h += `${value.name} <span class="caps">${value.nation}</span>: ${formatInt(
                        value.good.buyQuantity
                    )} @ ${formatSiCurrency(value.good.buyPrice)}<br>`;
                });
            }

            if (buyGoods && sellGoods) {
                h += "<p></p>";
            }

            if (sellGoods.size) {
                h += "<h6>Sell</h6>";
                sellGoods.forEach(value => {
                    h += `${value.name} <span class="caps">${value.nation}</span>: ${formatInt(
                        value.good.sellQuantity
                    )} @ ${formatSiCurrency(value.good.sellPrice)}<br>`;
                });
            }

            return h;
        };

        this._ports.setShowRadiusSetting("off");
        this._ports.portData = portsFiltered;
        this._ports.showTradePortPartners = true;
        this._ports.showCurrentGood = false;
        if (this._map.showTrades.listType !== "portList") {
            this._map.showTrades.listType = "portList";
        }

        this._map.showTrades.update(getPortList());
        this._ports.update();
    }

    _nationSelected() {
        this._nation = this._propNationSelector.options[this._propNationSelector.selectedIndex].value;
        this._toggleMenuDropdown();

        this._ports.portData = this._ports.portDataDefault.filter(port => port.nation === this._nation);
        this._ports.showCurrentGood = false;
        this._ports.showTradePortPartners = false;
        this._ports.update();
        this._setupClanSelect();
        $(this._propClanSelector).selectpicker("refresh");
    }

    _clanSelected() {
        const clan = this._propClanSelector.options[this._propClanSelector.selectedIndex].value;

        this._toggleMenuDropdown();

        if (clan !== 0) {
            this._ports.portData = this._ports.portDataDefault.filter(port => port.capturer === clan);
        } else if (this._nation) {
            this._ports.portData = this._ports.portDataDefault.filter(port => port.nation === this._nation);
        }

        this._ports.showCurrentGood = false;
        this._ports.showTradePortPartners = false;
        this._ports.update();
    }

    _depthSelected(depth) {
        const portData = this._ports.portDataDefault.filter(d => (depth === "shallow" ? d.shallow : !d.shallow));

        this._ports.portData = portData;
        this._ports.showCurrentGood = false;
        this._ports.showTradePortPartners = false;
        this._ports.update();
    }

    _allSelected() {
        const portData = this._ports.portDataDefault.filter(d => d.availableForAll);

        this._ports.portData = portData;
        this._ports.showCurrentGood = false;
        this._ports.showTradePortPartners = false;
        this._ports.update();
    }

    _greenZoneSelected() {
        const portData = this._ports.portDataDefault.filter(d => d.nonCapturable && d.nation !== "FT");

        this._ports.portData = portData;
        this._ports.showCurrentGood = false;
        this._ports.showTradePortPartners = false;
        this._ports.update();
    }

    _portSizeSelected(size) {
        const portData = this._ports.portDataDefault.filter(d => size === d.portBattleType);

        this._ports.portData = portData;
        this._ports.showCurrentGood = false;
        this._ports.showTradePortPartners = false;
        this._ports.update();
    }

    _CMSelected() {
        const value = Number(this._propCMSelector.options[this._propCMSelector.selectedIndex].value);
        let portData;

        if (value === 0) {
            portData = this._ports.portDataDefault;
        } else {
            portData = this._ports.portDataDefault.filter(d => value === d.conquestMarksPension);
        }

        this._toggleMenuDropdown();
        this._ports.portData = portData;
        this._ports.showTradePortPartners = false;
        this._ports.update();
    }

    _capturePBRange() {
        const blackOutTimes = [8, 9, 10];
        // 24 hours minus black-out hours
        const maxStartTime = 24 - (blackOutTimes.length + 1);
        const startTimes = new Set();
        const begin = moment(document.getElementById("prop-pb-from-input").value, this._timeFormat).hour();
        let end = moment(document.getElementById("prop-pb-to-input").value, this._timeFormat).hour();

        // console.log("Between %d and %d", begin, end);

        // Range not in black-out range of 9 to 10
        if (!(blackOutTimes.includes(begin) && blackOutTimes.includes(end) && begin <= end)) {
            startTimes.add(0);
            if (end < begin) {
                end += 24;
            }

            for (let i = begin - 2; i <= end - 3; i += 1) {
                startTimes.add((i - 10) % maxStartTime);
            }
        }

        const portData = this._ports.portDataDefault.filter(
            d => !d.nonCapturable && d.nation !== "FT" && startTimes.has(d.portBattleStartTime)
        );
        this._ports.portData = portData;
        this._ports.showCurrentGood = false;
        this._ports.showTradePortPartners = false;
        this._ports.update();
    }

    _filterCaptured(begin, end) {
        // console.log("Between %s and %s", begin.format("dddd D MMMM YYYY H:mm"), end.format("dddd D MMMM YYYY H:mm"));
        const portData = this._ports.portDataDefault.filter(port =>
            moment(port.lastPortBattle).isBetween(begin, end, null, "(]")
        );

        this._ports.portData = portData;
        this._ports.showCurrentGood = false;
        this._ports.showTradePortPartners = false;
        this._ports.update();
    }

    _capturedToday() {
        const now = moment.utc();
        let begin = moment()
            .utc()
            .hour(11)
            .minute(0);
        if (now.hour() < begin.hour()) {
            begin = begin.subtract(1, "day");
        }

        this._filterCaptured(begin, moment.utc(begin).add(1, "day"));
    }

    _capturedYesterday() {
        const now = moment.utc();
        let begin = moment()
            .utc()
            .hour(11)
            .minute(0)
            .subtract(1, "day");
        if (now.hour() < begin.hour()) {
            begin = begin.subtract(1, "day");
        }

        this._filterCaptured(begin, moment.utc(begin).add(1, "day"));
    }

    _capturedThisWeek() {
        const currentMondayOfWeek = moment()
            .utc()
            .startOf("week");
        // This Monday
        const begin = currentMondayOfWeek.hour(11);
        // Next Monday
        const end = moment(currentMondayOfWeek)
            .add(7, "day")
            .hour(11);

        this._filterCaptured(begin, end);
    }

    _capturedLastWeek() {
        const currentMondayOfWeek = moment()
            .utc()
            .startOf("week");
        // Monday last week
        const begin = moment(currentMondayOfWeek)
            .subtract(7, "day")
            .hour(11);
        // This Monday
        const end = currentMondayOfWeek.hour(11);

        this._filterCaptured(begin, end);
    }

    _captureRange() {
        const from = document.getElementById("prop-from-input").value;
        const to = document.getElementById("prop-to-input").value;
        const begin = moment(from, this._dateFormat).hour(11);
        const end = moment(to, this._dateFormat)
            .add(1, "day")
            .hour(11);

        this._filterCaptured(begin, end);
    }

    clearMap() {
        this.isInventorySelected = false;
        this._setupClanSelect();
        $(this._propClanSelector).selectpicker("refresh");
    }
}
