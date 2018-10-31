/*
	port-select.js
*/

import "bootstrap-select/js/bootstrap-select";
import moment from "moment/moment";
import "moment/locale/en-gb";
import "tempusdominus-bootstrap-4/build/js/tempusdominus-bootstrap-4";
import "tempusdominus-core/build/js/tempusdominus-core";

import { registerEvent } from "./analytics";
import { initMultiDropdownNavbar, nations } from "./common";

export default class PortSelect {
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
        this._portNamesSelector.classList.add("selectpicker");
        this._buyGoodsSelector.classList.add("selectpicker");
        this._propNationSelector.classList.add("selectpicker");
        this._propClanSelector.classList.add("selectpicker");
        this._propCMSelector.classList.add("selectpicker");
        const selectPickerDefaults = {
            noneSelectedText: "",
            dropupAuto: false
        };
        const selectPickerLiveSearch = JSON.parse(JSON.stringify(selectPickerDefaults));
        selectPickerLiveSearch.liveSearch = true;
        selectPickerLiveSearch.liveSearchPlaceholder = "Search ...";
        selectPickerLiveSearch.liveSearchNormalize = true;

        selectPickerLiveSearch.noneSelectedText = "Select single port";
        this._portNamesSelector.addEventListener("change", event => {
            registerEvent("Menu", "Move to port");
            this._resetOtherSelects(this._portNames$);
            this._portSelected(event);
        });
        this._portNames$.selectpicker(selectPickerLiveSearch);

        selectPickerLiveSearch.noneSelectedText = "Select good";
        this._buyGoodsSelector.addEventListener("change", event => {
            registerEvent("Menu", "Select good");
            this._resetOtherSelects(this._buyGoods$);
            this._goodSelected(event);
        });
        this._buyGoods$.selectpicker(selectPickerLiveSearch);

        selectPickerDefaults.noneSelectedText = "Select nation";
        this._propNationSelector.addEventListener("change", event => {
            this._resetOtherSelects(this._propNation$);
            this._nationSelected(event);
        });
        this._propNation$.selectpicker(selectPickerDefaults);

        selectPickerDefaults.noneSelectedText = "Select clan";
        this._propClanSelector.addEventListener("change", event => {
            this._resetOtherSelects(this._propClan$);
            this._clanSelected(event);
        });
        this._propClan$.selectpicker(selectPickerDefaults);

        selectPickerDefaults.noneSelectedText = "Select";
        this._propCMSelector.addEventListener("change", event => {
            this._resetOtherSelects(this._propCM$);
            this._CMSelected(event);
        });
        this._propCM$.selectpicker(selectPickerDefaults);

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

        initMultiDropdownNavbar("selectPortNavbar");
        $(".selectpicker")
            .val("default")
            .selectpicker("refresh");
    }

    _setupPortSelect() {
        const selectPorts = this._ports.portDataDefault
            .map(d => ({
                id: d.id,
                coord: [d.geometry.coordinates[0], d.geometry.coordinates[1]],
                name: d.properties.name,
                nation: this._ports.pbData.ports.filter(port => port.id === d.id).map(port => port.nation)
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
        function PortsPerGood() {}
        PortsPerGood.prototype.add = goods => {
            goods.forEach(good => {
                selectGoods.add(good);
            });
        };
        const portsPerGood = new PortsPerGood();

        this._ports.portDataDefault.forEach(port => {
            portsPerGood.add(port.properties.consumesTrading);
            portsPerGood.add(port.properties.consumesNonTrading);
            portsPerGood.add(port.properties.dropsTrading);
            portsPerGood.add(port.properties.dropsNonTrading);
            portsPerGood.add(port.properties.producesTrading);
            portsPerGood.add(port.properties.producesNonTrading);
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
        this._propClanSelector.innerHTML = "";

        const clanList = new Set(),
            portId = new Set();
        this._ports.portData.forEach(d => portId.add(d.id));
        this._ports.pbData.ports.filter(d => d.capturer && portId.has(d.id)).forEach(d => clanList.add(d.capturer));
        const options = `${Array.from(clanList)
            .sort()
            .map(clan => `<option value="${clan}">${clan}</option>`)
            .join("")}`;

        if (options) {
            this._propClanSelector.insertAdjacentHTML("beforeend", options);
            this._propClanSelector.disabled = false;
            this._propClan$.val("default").selectpicker("refresh");
        } else {
            this._propClanSelector.disabled = true;
            this._propClan$.append("<option></option>").selectpicker("refresh");
        }
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
        function ConsumedGoodList() {}
        ConsumedGoodList.prototype.add = goods => {
            goods.forEach(good => {
                tradePortConsumedGoods.push(good);
            });
        };
        function ProducedGoodList() {}
        ProducedGoodList.prototype.add = goods => {
            goods.forEach(good => {
                tradePortProducedGoods.push(good);
            });
        };
        const consumedGoodList = new ConsumedGoodList(),
            producedGoodList = new ProducedGoodList();

        this._ports.portDataDefault.filter(port => port.id === this._ports.tradePortId).forEach(port => {
            producedGoodList.add(port.properties.dropsTrading);
            producedGoodList.add(port.properties.producesTrading);
            consumedGoodList.add(port.properties.consumesTrading);
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
                ["dropsTrading", "producesTrading"].forEach(type => {
                    port.properties[type].forEach(good => {
                        if (tradePortConsumedGoods.includes(good)) {
                            port.properties.goodsToSellInTradePort.push(good);
                            // eslint-disable-next-line no-param-reassign
                            port.properties.sellInTradePort = true;
                        }
                    });
                });
                ["consumesTrading"].forEach(type => {
                    port.properties[type].forEach(good => {
                        if (tradePortProducedGoods.includes(good)) {
                            port.properties.goodsToBuyInTradePort.push(good);
                            // eslint-disable-next-line no-param-reassign
                            port.properties.buyInTradePort = true;
                        }
                    });
                });
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
    }

    _goodSelected(event) {
        const good = $(event.currentTarget).find(":selected")[0].text,
            sourcePorts = this._ports.portDataDefault
                .filter(
                    port =>
                        port.properties.dropsTrading.includes(good) ||
                        port.properties.dropsNonTrading.includes(good) ||
                        port.properties.producesTrading.includes(good) ||
                        port.properties.producesNonTrading.includes(good)
                )
                .map(port => {
                    // eslint-disable-next-line prefer-destructuring,no-param-reassign
                    port.properties.isSource = true;
                    return port;
                }),
            consumingPorts = this._ports.portDataDefault
                .filter(
                    port =>
                        port.properties.consumesTrading.includes(good) ||
                        port.properties.consumesNonTrading.includes(good)
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
        const portId = new Set();

        this._nation = $(event.currentTarget).val();
        $("#propertyDropdown").dropdown("toggle");

        this._ports.pbData.ports.filter(port => port.nation === this._nation).forEach(port => portId.add(port.id));
        this._ports.portData = this._ports.portDataDefault.filter(d => portId.has(d.id));
        this._ports.showCurrentGood = false;
        this._ports.showTradePortPartners = false;
        this._ports.update();
        this._setupClanSelect();
    }

    _clanSelected(event) {
        const portId = new Set(),
            clan = $(event.currentTarget).val();

        $("#propertyDropdown").dropdown("toggle");

        if (clan !== 0) {
            this._ports.pbData.ports.filter(port => clan === port.capturer).forEach(port => portId.add(port.id));
        } else if (this._nation) {
            this._ports.pbData.ports.filter(port => port.nation === this._nation).forEach(port => portId.add(port.id));
        }
        this._ports.portData = this._ports.portDataDefault.filter(d => portId.has(d.id));
        this._ports.showCurrentGood = false;
        this._ports.showTradePortPartners = false;
        this._ports.update();
    }

    _depthSelected(depth) {
        const portData = this._ports.portDataDefault.filter(
            d => (depth === "shallow" ? d.properties.shallow : !d.properties.shallow)
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
        const portId = new Set();
        this._ports.pbData.ports
            .filter(port => moment(port.lastPortBattle).isBetween(begin, end, null, "(]"))
            .forEach(port => portId.add(port.id));
        const portData = this._ports.portDataDefault.filter(d => portId.has(d.id));

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
    }
}
