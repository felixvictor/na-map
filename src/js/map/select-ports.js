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

export default class SelectPorts {
    constructor(ports, pbZone) {
        this._ports = ports;
        this._pbZone = pbZone;

        this._dateFormat = "D MMM";
        this._timeFormat = "HH.00";

        this._portNamesId = "port-names-select";
        this._portNamesSelector = document.getElementById(this._portNamesId);
        this._portNames$ = $(`#${this._portNamesId}`);

        this._buyGoodsId = "buy-goods-select";
        this._buyGoodsSelector = document.getElementById(this._buyGoodsId);
        this._buyGoods$ = $(`#${this._buyGoodsId}`);

        this._propNationId = "prop-nation-select";
        this._propNationSelector = document.getElementById(this._propNationId);
        this._propNation$ = $(`#${this._propNationId}`);

        this._propClanId = "prop-clan-select";
        this._propClanSelector = document.getElementById(this._propClanId);
        this._propClan$ = $(`#${this._propClanId}`);

        this._propCMId = "prop-cm-select";
        this._propCMSelector = document.getElementById(this._propCMId);
        this._propCM$ = $(`#${this._propCMId}`);

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

    _resetOtherSelects(activeSelect$) {
        [this._portNames$, this._buyGoods$, this._propNation$, this._propClan$, this._propCM$].forEach((select$, i) => {
            if (
                select$ !== activeSelect$ &&
                !(select$ === this._propClan$ && activeSelect$ === this._propNation$) &&
                !(select$ === this._propNation$ && activeSelect$ === this._propClan$)
            ) {
                select$.val("default").selectpicker("refresh");
            }
        });
    }

    _setupListener() {
        $.fn.selectpicker.Constructor.DEFAULTS.virtualScroll = true;
        $.fn.selectpicker.Constructor.DEFAULTS.width = "fit";
        $.fn.selectpicker.Constructor.DEFAULTS.dropupAuto = false;
        $.fn.selectpicker.Constructor.DEFAULTS.liveSearch = true;
        $.fn.selectpicker.Constructor.DEFAULTS.liveSearchPlaceholder = "Search ...";
        $.fn.selectpicker.Constructor.DEFAULTS.liveSearchNormalize = true;

        this._portNamesSelector.addEventListener("change", event => {
            registerEvent("Menu", "Move to port");
            this._resetOtherSelects(this._portNames$);
            this._portSelected(event);
            event.preventDefault();
        });

        this._buyGoodsSelector.addEventListener("change", event => {
            registerEvent("Menu", "Select good");
            this._resetOtherSelects(this._buyGoods$);
            this._goodSelected(event);
            event.preventDefault();
        });

        this._propNationSelector.addEventListener("change", event => {
            this._resetOtherSelects(this._propNation$);
            this._nationSelected(event);
            event.preventDefault();
        });

        this._propClanSelector.addEventListener("change", event => {
            this._resetOtherSelects(this._propClan$);
            this._clanSelected(event);
            event.preventDefault();
        });

        this._propCMSelector.addEventListener("change", event => {
            this._resetOtherSelects(this._propCM$);
            this._CMSelected(event);
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
            $("#propertyDropdown").dropdown("toggle");
            event.preventDefault();
        });

        document.getElementById("menu-prop-today").addEventListener("click", () => this._capturedToday());
        document.getElementById("menu-prop-yesterday").addEventListener("click", () => this._capturedYesterday());
        document.getElementById("menu-prop-this-week").addEventListener("click", () => this._capturedThisWeek());
        document.getElementById("menu-prop-last-week").addEventListener("click", () => this._capturedLastWeek());

        const portFrom = $("#prop-from"),
            portTo = $("#prop-to");
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
            $("#propertyDropdown").dropdown("toggle");
            event.preventDefault();
        });

        this._portNamesSelector.classList.add("selectpicker");
        this._buyGoodsSelector.classList.add("selectpicker");
        this._propNationSelector.classList.add("selectpicker");
        this._propClanSelector.classList.add("selectpicker");
        this._propCMSelector.classList.add("selectpicker");
        $(".selectpicker").selectpicker();
        initMultiDropdownNavbar("selectPortNavbar");
    }

    _setupPortSelect() {
        const selectPorts = this._ports.portDataDefault
            .map(d => ({
                id: d.id,
                coord: [d.geometry.coordinates[0], d.geometry.coordinates[1]],
                name: d.properties.name,
                nation: d.properties.nation
            }))
            .sort((a, b) => {
                if (a.name < b.name) {
                    return -1;
                }
                if (a.name > b.name) {
                    return 1;
                }
                return 0;
            });

        const options = `${selectPorts
            .map(
                port =>
                    `<option data-subtext="${port.nation}" value="${port.coord}" data-id="${port.id}">${
                        port.name
                    }</option>`
            )
            .join("")}`;
        this._portNamesSelector.insertAdjacentHTML("beforeend", options);
    }

    _setupGoodSelect() {
        const selectGoods = new Set();

        this._ports.portDataDefault.forEach(port => {
            ["consumesTrading", "dropsTrading", "dropsNonTrading", "producesNonTrading"].forEach(type => {
                if (port.properties[type]) {
                    port.properties[type].forEach(good => selectGoods.add(good.name));
                }
            });
        });
        const options = `${Array.from(selectGoods)
            .sort()
            .map(good => `<option>${good}</option>`)
            .join("")}`;

        this._buyGoodsSelector.insertAdjacentHTML("beforeend", options);
    }

    _setupNationSelect() {
        const options = `${nations
            .sort((a, b) => {
                if (a.sortName < b.sortName) {
                    return -1;
                }
                if (a.sortName > b.sortName) {
                    return 1;
                }
                return 0;
            })
            .map(nation => `<option value="${nation.short}">${nation.name}</option>`)
            .join("")}`;
        this._propNationSelector.insertAdjacentHTML("beforeend", options);
    }

    _setupClanSelect() {
        const clanList = new Set();
        this._ports.portData.filter(d => d.properties.capturer).forEach(d => clanList.add(d.properties.capturer));

        this._propClanSelector.innerHTML = "";
        let options = "";
        if (clanList.size !== 0) {
            this._propClanSelector.disabled = false;
            options = `${Array.from(clanList)
                .sort()
                .map(clan => `<option value="${clan}">${clan}</option>`)
                .join("")}`;
        } else {
            this._propClanSelector.disabled = true;
        }

        this._propClanSelector.insertAdjacentHTML("beforeend", options);
    }

    _setupCMSelect() {
        const cmList = new Set();
        this._ports.portData.forEach(d => cmList.add(d.properties.conquestMarksPension));
        cmList.forEach(cm => {
            this._propCM$.append(
                "beforeend",
                $("<option>", {
                    value: cm,
                    text: cm
                })
            );
        });
    }

    _setTradePortPartners() {
        const tradePortConsumedGoods = [],
            tradePortProducedGoods = [];

        this._ports.portDataDefault
            .filter(port => port.id === this._ports.tradePortId)
            .forEach(port => {
                if (port.properties.consumesTrading) {
                    port.properties.consumesTrading.forEach(good => tradePortConsumedGoods.push(good.name));
                }
                if (port.properties.dropsTrading) {
                    port.properties.dropsTrading.forEach(good => tradePortProducedGoods.push(good.name));
                }
            });

        this._ports.portData = this._ports.portDataDefault
            .map(port => {
                // eslint-disable-next-line no-param-reassign
                port.properties.goodsToSellInTradePort = [];
                // eslint-disable-next-line no-param-reassign
                port.properties.sellInTradePort = false;
                // eslint-disable-next-line no-param-reassign
                port.properties.goodsToBuyInTradePort = [];
                // eslint-disable-next-line no-param-reassign
                port.properties.buyInTradePort = false;
                if (port.properties.consumesTrading) {
                    port.properties.consumesTrading.forEach(good => {
                        if (tradePortProducedGoods.includes(good.name)) {
                            port.properties.goodsToBuyInTradePort.push(good.name);
                            // eslint-disable-next-line no-param-reassign
                            port.properties.buyInTradePort = true;
                        }
                    });
                }
                if (port.properties.dropsTrading) {
                    port.properties.dropsTrading.forEach(good => {
                        if (tradePortConsumedGoods.includes(good.name)) {
                            port.properties.goodsToSellInTradePort.push(good.name);
                            // eslint-disable-next-line no-param-reassign
                            port.properties.sellInTradePort = true;
                        }
                    });
                }
                return port;
            })
            .filter(
                port =>
                    port.id === this._ports.tradePortId ||
                    port.properties.sellInTradePort ||
                    port.properties.buyInTradePort
            );
    }

    _portSelected(event) {
        const port = $(event.currentTarget).find(":selected");
        const c = port.val().split(",");

        const id = port.data("id").toString();
        this._ports.currentPort = {
            id,
            coord: { x: +c[0], y: +c[1] }
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

    _goodSelected(event) {
        const goodSelected = $(event.currentTarget).find(":selected")[0].text,
            sourcePorts = this._ports.portDataDefault
                .filter(
                    port =>
                        (port.properties.dropsTrading &&
                            port.properties.dropsTrading.some(good => good.name === goodSelected)) ||
                        (port.properties.dropsNonTrading &&
                            port.properties.dropsNonTrading.some(good => good.name === goodSelected)) ||
                        (port.properties.producesNonTrading &&
                            port.properties.producesNonTrading.some(good => good.name === goodSelected))
                )
                .map(port => {
                    // eslint-disable-next-line prefer-destructuring,no-param-reassign
                    port.properties.isSource = true;
                    return port;
                }),
            consumingPorts = this._ports.portDataDefault
                .filter(
                    port =>
                        port.properties.consumesTrading &&
                        port.properties.consumesTrading.some(good => good.name === goodSelected)
                )
                .map(port => {
                    // eslint-disable-next-line prefer-destructuring,no-param-reassign
                    port.properties.isSource = false;
                    return port;
                });

        this._ports.showRadiusSetting = "off";
        this._ports.portData = sourcePorts.concat(consumingPorts);
        this._ports.showCurrentGood = true;
        this._ports.showTradePortPartners = false;
        this._ports.update();
    }

    _nationSelected(event) {
        this._nation = $(event.currentTarget).val();
        $("#propertyDropdown").dropdown("toggle");

        this._ports.portData = this._ports.portDataDefault.filter(port => port.properties.nation === this._nation);
        this._ports.showCurrentGood = false;
        this._ports.showTradePortPartners = false;
        this._ports.update();
        this._setupClanSelect();
        this._propClan$.selectpicker("refresh");
    }

    _clanSelected(event) {
        const clan = $(event.currentTarget).val();

        $("#propertyDropdown").dropdown("toggle");

        if (clan !== 0) {
            this._ports.portData = this._ports.portDataDefault.filter(port => port.properties.capturer === clan);
        } else if (this._nation) {
            this._ports.portData = this._ports.portDataDefault.filter(port => port.properties.nation === this._nation);
        }
        this._ports.showCurrentGood = false;
        this._ports.showTradePortPartners = false;
        this._ports.update();
    }

    _depthSelected(depth) {
        const portData = this._ports.portDataDefault.filter(d =>
            depth === "shallow" ? d.properties.shallow : !d.properties.shallow
        );
        this._ports.portData = portData;
        this._ports.showCurrentGood = false;
        this._ports.showTradePortPartners = false;
        this._ports.update();
    }

    _allSelected() {
        const portData = this._ports.portDataDefault.filter(d => d.properties.availableForAll);
        this._ports.portData = portData;
        this._ports.showCurrentGood = false;
        this._ports.showTradePortPartners = false;
        this._ports.update();
    }

    _greenZoneSelected() {
        const portData = this._ports.portDataDefault.filter(
            d => d.properties.nonCapturable && d.properties.nation !== "FT"
        );
        this._ports.portData = portData;
        this._ports.showCurrentGood = false;
        this._ports.showTradePortPartners = false;
        this._ports.update();
    }

    _portSizeSelected(size) {
        const portData = this._ports.portDataDefault.filter(d => size === d.properties.portBattleType);
        this._ports.portData = portData;
        this._ports.showCurrentGood = false;
        this._ports.showTradePortPartners = false;
        this._ports.update();
    }

    _capturePBRange() {
        const blackOutTimes = [8, 9, 10],
            // 24 hours minus black-out hours
            maxStartTime = 24 - (blackOutTimes.length + 1);
        const startTimes = new Set();
        const begin = moment($("#prop-pb-from-input").val(), this._timeFormat).hour();
        let end = moment($("#prop-pb-to-input").val(), this._timeFormat).hour();

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
            d =>
                !d.properties.nonCapturable &&
                d.properties.nation !== "FT" &&
                startTimes.has(d.properties.portBattleStartTime)
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
        const begin = currentMondayOfWeek.hour(11), // this Monday
            end = moment(currentMondayOfWeek)
                .add(7, "day")
                .hour(11); // next Monday
        this._filterCaptured(begin, end);
    }

    _capturedLastWeek() {
        const currentMondayOfWeek = moment()
            .utc()
            .startOf("week");
        const begin = moment(currentMondayOfWeek)
                .subtract(7, "day")
                .hour(11), // Monday last week
            end = currentMondayOfWeek.hour(11); // this Monday
        this._filterCaptured(begin, end);
    }

    _captureRange() {
        const begin = moment($("#prop-from-input").val(), this._dateFormat).hour(11),
            end = moment($("#prop-to-input").val(), this._dateFormat)
                .add(1, "day")
                .hour(11);
        this._filterCaptured(begin, end);
    }

    _CMSelected() {
        const value = parseInt(this._propCM$.val(), 10);
        let portData;

        if (value !== 0) {
            portData = this._ports.portDataDefault.filter(d => value === d.properties.conquestMarksPension);
        } else {
            portData = this._ports.portDataDefault;
        }
        $("#propertyDropdown").dropdown("toggle");
        this._ports.portData = portData;
        this._ports.showTradePortPartners = false;
        this._ports.update();
    }

    clearMap() {
        this._setupClanSelect();
        this._propClan$.selectpicker("refresh");
    }
}
