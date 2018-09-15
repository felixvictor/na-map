/*
	port-select.js
*/

import "bootstrap-select/js/bootstrap-select";
import moment from "moment/moment";
import "moment/locale/en-gb";
import "tempusdominus-bootstrap-4/build/js/tempusdominus-bootstrap-4";
import "tempusdominus-core/build/js/tempusdominus-core";

import { nations } from "./common";
import { registerEvent } from "./analytics";

export default class PortSelect {
    constructor(map, ports, pbZone) {
        this._map = map;
        this._ports = ports;
        this._pbZone = pbZone;
        this._dateFormat = "D MMM";
        this._timeFormat = "HH.00";

        this._portNamesId = "port-names";
        this._portNamesSelector = document.getElementById(this._portNamesId);
        this._portNames$ = $(`#${this._portNamesId}`);

        this._buyGoodsId = "buy-goods";
        this._buyGoodsSelector = document.getElementById(this._buyGoodsId);
        this._buyGoods$ = $(`#${this._buyGoodsId}`);

        this._propNationId = "prop-nation";
        this._propNationSelector = document.getElementById(this._propNationId);
        this._propNation$ = $(`#${this._propNationId}`);

        this._propClanId = "prop-clan";
        this._propClanSelector = document.getElementById(this._propClanId);
        this._propClan$ = $(`#${this._propClanId}`);

        this._propCMId = "prop-cm";
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

    _setupListener() {
        this._portNamesSelector.classList.add("selectpicker");
        this._buyGoodsSelector.classList.add("selectpicker");
        this._propNationSelector.classList.add("selectpicker");
        this._propClanSelector.classList.add("selectpicker");
        this._propCMSelector.classList.add("selectpicker");
        const selectPickerDefaults = {
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
            timeZone: "UTC",
            noneSelectedText: "",
            dropupAuto: false
        };
        const selectPickerLiveSearch = JSON.parse(JSON.stringify(selectPickerDefaults));
        selectPickerLiveSearch.liveSearch = true;
        selectPickerLiveSearch.liveSearchPlaceholder = "Search ...";
        selectPickerLiveSearch.liveSearchNormalize = true;

        selectPickerLiveSearch.noneSelectedText = "Move to port";
        this._portNamesSelector.addEventListener("change", event => {
            registerEvent("Menu", "Move to port");
            this._portSelected(event);
        });
        this._portNames$.selectpicker(selectPickerLiveSearch);

        selectPickerLiveSearch.noneSelectedText = "Select good";
        this._buyGoodsSelector.addEventListener("change", event => {
            registerEvent("Menu", "Select good");
            this._goodSelected(event);
        });
        this._buyGoods$.selectpicker(selectPickerLiveSearch);

        selectPickerDefaults.noneSelectedText = "Select nation";
        this._propNationSelector.addEventListener("change", event => this._nationSelected(event));
        this._propNation$.selectpicker(selectPickerDefaults);

        selectPickerDefaults.noneSelectedText = "Select clan";
        this._propClanSelector.addEventListener("change", event => this._clanSelected(event));
        this._propClan$.selectpicker(selectPickerDefaults);

        selectPickerDefaults.noneSelectedText = "Select";
        this._propCMSelector.addEventListener("change", event => {
            event.preventDefault();
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

        // Adapted https://github.com/bootstrapthemesco/bootstrap-4-multi-dropdown-navbar
        $(".nav-item .dropdown-menu .bootstrap-select .dropdown-toggle").on("click", event => {
            const $el = $(event.currentTarget);

            $el.next(".dropdown-menu").toggleClass("show");
            $el.parent("li").toggleClass("show");
            $el.parents("li.nav-item.dropdown.show").on("hidden.bs.dropdown", event2 => {
                $(event2.currentTarget)
                    .find("div.dropdown-menu.show")
                    .removeClass("show");
            });

            return false;
        });
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

        const select = `${selectPorts
            .map(
                port =>
                    `<option data-subtext="${port.nation}" value="${port.coord}" data-id="${port.id}">${
                        port.name
                    }</option>`
            )
            .join("")}`;
        this._portNamesSelector.insertAdjacentHTML("beforeend", select);
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
            portsPerGood.add(port.properties.dropsTrading);
            portsPerGood.add(port.properties.dropsNonTrading);
            portsPerGood.add(port.properties.producesTrading);
            portsPerGood.add(port.properties.producesNonTrading);
        });
        const select = `${Array.from(selectGoods)
            .sort()
            .map(good => `<option>${good}</option>`)
            .join("")}`;

        this._buyGoodsSelector.insertAdjacentHTML("beforeend", select);
    }

    _setupNationSelect() {
        const select = `${nations
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
        this._propNationSelector.insertAdjacentHTML("beforeend", select);
    }

    _setupClanSelect() {
        this._propClanSelector.innerHTML = "";

        const clanList = new Set(),
            portId = new Set();
        this._ports.portData.forEach(d => portId.add(d.id));
        this._ports.pbData.ports.filter(d => d.capturer && portId.has(d.id)).forEach(d => clanList.add(d.capturer));
        const select = `${Array.from(clanList)
            .sort()
            .map(clan => `<option value="${clan}">${clan}</option>`)
            .join("")}`;

        if (select) {
            this._propClanSelector.insertAdjacentHTML("beforeend", select);
            this._propClanSelector.disabled = false;
            this._propClan$.val("default").selectpicker("refresh");
        } else {
            this._propClanSelector.remove();
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

    _portSelected(event) {
        const port = $(event.currentTarget).find(":selected");
        const c = port.val().split(",");

        if (c[0] === "0") {
            this._ports.portData = this._ports.portDataDefault;
            this._ports.showCurrentGood = false;
            this._ports.update();
        } else {
            const currentPort = { id: port.data("id").toString(), coord: { x: +c[0], y: +c[1] } };
            this._ports.currentPort = currentPort;
            if (this._pbZone._showPBZones) {
                this._pbZone.refresh();
                this._ports.showCurrentGood = false;
                this._ports.update();
            }
            this._map.goToPort();
        }
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
        this._ports.update();
    }

    _nationSelected(event) {
        const nationId = $(event.currentTarget).val();
        let portData;

        if (+nationId !== 0) {
            this._nation = nationId;
            const portId = new Set();
            this._ports.pbData.ports.filter(port => port.nation === this._nation).forEach(port => portId.add(port.id));
            portData = this._ports.portDataDefault.filter(d => portId.has(d.id));
        } else {
            this._nation = "";
            portData = this._ports.portDataDefault;
        }
        $("#propertyDropdown").dropdown("toggle");
        this._ports.portData = portData;
        this._ports.showCurrentGood = false;
        this._ports.update();
        this._setupClanSelect();
    }

    _clanSelected(event) {
        const clan = $(event.currentTarget).val();
        let portData;

        if (+clan !== 0) {
            const portId = new Set();
            this._ports.pbData.ports.filter(port => clan === port.capturer).forEach(port => portId.add(port.id));
            portData = this._ports.portDataDefault.filter(d => portId.has(d.id));
        } else if (this._nation) {
            const portId = new Set();
            this._ports.pbData.ports.filter(port => port.nation === this._nation).forEach(port => portId.add(port.id));
            portData = this._ports.portDataDefault.filter(d => portId.has(d.id));
        } else {
            portData = this._ports.portDataDefault;
        }
        $("#propertyDropdown").dropdown("toggle");
        this._ports.portData = portData;
        this._ports.showCurrentGood = false;
        this._ports.update();
    }

    _depthSelected(depth) {
        const portData = this._ports.portDataDefault.filter(
            d => (depth === "shallow" ? d.properties.shallow : !d.properties.shallow)
        );
        this._ports.portData = portData;
        this._ports.showCurrentGood = false;
        this._ports.update();
    }

    _allSelected() {
        const portData = this._ports.portDataDefault.filter(d => d.properties.availableForAll);
        this._ports.portData = portData;
        this._ports.showCurrentGood = false;
        this._ports.update();
    }

    _greenZoneSelected() {
        const portData = this._ports.portDataDefault.filter(
            d => d.properties.nonCapturable && d.properties.nation !== "FT"
        );
        this._ports.portData = portData;
        this._ports.showCurrentGood = false;
        this._ports.update();
    }

    _portSizeSelected(size) {
        const portData = this._ports.portDataDefault.filter(d => size === d.properties.portBattleType);
        this._ports.portData = portData;
        this._ports.showCurrentGood = false;
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
        this._ports.update();
    }

    clearMap() {
        this._setupClanSelect();
    }
}
