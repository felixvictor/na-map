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
        this._portNames = $("#port-names");
        this._buyGoods = $("#buy-goods");
        this._sellGoods = $("#sell-goods");
        this._propNation = $("#prop-nation");
        this._propClan = $("#prop-clan");
        this._propCM = $("#prop-cm");

        this._setupSelects();
        this._setupListener();
    }

    _setupSelects() {
        this._setupPortSelect();

        // Buy goods
        let goodsPerPort = this._ports.portDataDefault.map(port => {
            let goods = port.properties.dropsTrading.length ? port.properties.dropsTrading : "";
            goods += port.properties.dropsNonTrading.length ? `,${port.properties.dropsNonTrading}` : "";
            goods += port.properties.producesTrading.length ? `,${port.properties.producesTrading}` : "";
            goods += port.properties.producesNonTrading.length ? `,${port.properties.producesNonTrading}` : "";

            return {
                id: port.id,
                goods
            };
        });
        this.constructor._setupGoodSelect(goodsPerPort, this._buyGoods);

        // Sell goods
        goodsPerPort = this._ports.portDataDefault.map(port => {
            let goods = port.properties.consumesTrading.length ? `${port.properties.consumesTrading},` : "";
            goods += port.properties.consumesNonTrading.length ? `${port.properties.consumesNonTrading}` : "";

            return {
                id: port.id,
                goods
            };
        });
        this.constructor._setupGoodSelect(goodsPerPort, this._sellGoods);
        this.constructor._setupNationSelect();
        this._setupClanSelect();
        this._setupCMSelect();
    }

    _setupListener() {
        this._portNames.addClass("selectpicker");
        this._buyGoods.addClass("selectpicker");
        this._sellGoods.addClass("selectpicker");
        this._propNation.addClass("selectpicker");
        this._propClan.addClass("selectpicker");
        this._propCM.addClass("selectpicker");
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
        this._portNames
            .on("change", event => {
                registerEvent("Menu", "Move to port");
                this._portSelected(event);
            })
            .selectpicker(selectPickerLiveSearch);
        selectPickerLiveSearch.noneSelectedText = "Select good";
        this._buyGoods
            .on("change", event => {
                registerEvent("Menu", "Select good");
                this._goodSelected(event);
            })
            .selectpicker(selectPickerLiveSearch);
        selectPickerLiveSearch.noneSelectedText = "Select consumed good";
        this._sellGoods
            .on("change", event => {
                registerEvent("Menu", "Select consumed good");
                this._goodSelected(event);
            })
            .selectpicker(selectPickerLiveSearch);

        selectPickerDefaults.noneSelectedText = "Select nation";
        this._propNation.on("change", event => this._nationSelected(event)).selectpicker(selectPickerDefaults);
        selectPickerDefaults.noneSelectedText = "Select clan";
        this._propClan.on("change", event => this._clanSelected(event)).selectpicker(selectPickerDefaults);
        selectPickerDefaults.noneSelectedText = "Select";
        this._propCM
            .on("change", event => {
                event.preventDefault();
                this._CMSelected(event);
            })
            .selectpicker(selectPickerDefaults);

        $("#menu-prop-deep").on("click", () => this._depthSelected("deep"));
        $("#menu-prop-shallow").on("click", () => this._depthSelected("shallow"));

        $("#menu-prop-all").on("click", () => this._allSelected());
        $("#menu-prop-green").on("click", () => this._greenZoneSelected());

        $("#menu-prop-large").on("click", () => this._portSizeSelected("Large"));
        $("#menu-prop-medium").on("click", () => this._portSizeSelected("Medium"));
        $("#menu-prop-small").on("click", () => this._portSizeSelected("Small"));

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

        $("#menu-prop-today").on("click", () => this._capturedToday());
        $("#menu-prop-yesterday").on("click", () => this._capturedYesterday());
        $("#menu-prop-this-week").on("click", () => this._capturedThisWeek());
        $("#menu-prop-last-week").on("click", () => this._capturedLastWeek());

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
        $("#port-names").append(select);
    }

    static _setupGoodSelect(goodsPerPort, selectItem) {
        let selectGoods = new Map();

        goodsPerPort.forEach(port => {
            port.goods.split(",").forEach(good => {
                if (good) {
                    const portIds = new Set(selectGoods.get(good)).add(port.id);
                    selectGoods.set(good, portIds);
                }
            });
        });
        selectGoods = new Map(Array.from(selectGoods).sort());
        let select = "";
        // eslint-disable-next-line no-restricted-syntax
        for (const [key, portIds] of selectGoods.entries()) {
            let ids = "";
            // eslint-disable-next-line no-restricted-syntax
            for (const id of portIds) {
                ids += `,${id}`;
            }
            select += `<option value="${ids.substr(1)}">${key}</option>`;
        }
        selectItem.append(select);
    }

    static _setupNationSelect() {
        const propNation = $("#prop-nation");
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
        propNation.append(select);
    }

    _setupClanSelect() {
        const propClan = $("#prop-clan");

        propClan.empty();

        const clanList = new Set(),
            portId = new Set();
        this._ports.portData.forEach(d => portId.add(d.id));
        this._ports.pbData.ports.filter(d => d.capturer && portId.has(d.id)).forEach(d => clanList.add(d.capturer));
        const select = `${Array.from(clanList)
            .sort()
            .map(clan => `<option value="${clan}">${clan}</option>`)
            .join("")}`;

        if (select.length) {
            propClan.append(select);
            propClan.removeAttr("disabled");
        } else {
            propClan.attr("disabled", "disabled");
        }
        propClan.val("default").selectpicker("refresh");
    }

    _setupCMSelect() {
        const propCM = $("#prop-cm");

        const cmList = new Set();
        this._ports.portData.forEach(d => cmList.add(d.properties.conquestMarksPension));
        cmList.forEach(cm => {
            propCM.append(
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
            this._ports.setPortData(this._ports.portDataDefault);
            this._ports.update();
        } else {
            this._ports.setCurrentPort(port.data("id").toString(), +c[0], +c[1]);
            if (this._pbZone._showPBZones) {
                this._pbZone.refresh();
                this._ports.update();
            }
            this._map.goToPort();
        }
    }

    _goodSelected(event) {
        const portIds = $(event.currentTarget)
                .val()
                .split(","),
            good = $(event.currentTarget).find(":selected")[0].text,
            sourcePorts = this._ports.portDataDefault.filter(d => portIds.includes(d.id)).map(port => {
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

        this._ports.setShowRadiusSetting("off");
        this._ports.setPortData(sourcePorts.concat(consumingPorts), true);
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
        // $("#propertyDropdown").dropdown("toggle");
        this._ports.setPortData(portData);
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
        // $("#propertyDropdown").dropdown("toggle");
        this._ports.setPortData(portData);
        this._ports.update();
    }

    _depthSelected(depth) {
        const portData = this._ports.portDataDefault.filter(
            d => (depth === "shallow" ? d.properties.shallow : !d.properties.shallow)
        );
        this._ports.setPortData(portData);
        this._ports.update();
    }

    _allSelected() {
        const portData = this._ports.portDataDefault.filter(d => d.properties.availableForAll);
        this._ports.setPortData(portData);
        this._ports.update();
    }

    _greenZoneSelected() {
        const portData = this._ports.portDataDefault.filter(
            d => d.properties.nonCapturable && d.properties.nation !== "FT"
        );
        this._ports.setPortData(portData);
        this._ports.update();
    }

    _portSizeSelected(size) {
        const portData = this._ports.portDataDefault.filter(d => size === d.properties.portBattleType);
        this._ports.setPortData(portData);
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
        this._ports.setPortData(portData);
        this._ports.update();
    }

    _filterCaptured(begin, end) {
        // console.log("Between %s and %s", begin.format("dddd D MMMM YYYY H:mm"), end.format("dddd D MMMM YYYY H:mm"));
        const portId = new Set();
        this._ports.pbData.ports
            .filter(port => moment(port.lastPortBattle).isBetween(begin, end, null, "(]"))
            .forEach(port => portId.add(port.id));
        const portData = this._ports.portDataDefault.filter(d => portId.has(d.id));

        this._ports.setPortData(portData);
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
        const value = parseInt($("#prop-cm").val(), 10);
        let portData;

        if (value !== 0) {
            portData = this._ports.portDataDefault.filter(d => value === d.properties.conquestMarksPension);
        } else {
            portData = this._ports.portDataDefault;
        }
        $("#propertyDropdown").dropdown("toggle");
        this._ports.setPortData(portData);
        this._ports.update();
    }

    clearMap() {
        this._setupClanSelect();
    }
}
