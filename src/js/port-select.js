/*
	port-select.js
*/

import "bootstrap-select/js/bootstrap-select";
import moment from "moment/moment";
import "moment/locale/en-gb";
import "tempusdominus-bootstrap-4/build/js/tempusdominus-bootstrap-4";

import { nations } from "./common";

export default class PortSelect {
    constructor(map, ports, pbZone) {
        this._map = map;
        this._ports = ports;
        this._pbZone = pbZone;
        this._dateFormat = "D MMM";
        this._timeFormat = "HH.00";

        this._setupSelects();
        this._setupListener();
    }

    _setupSelects() {
        $(".selectpicker").selectpicker({
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
            dropupAuto: false,
            liveSearch: true,
            liveSearchPlaceholder: "Search ...",
            // accent-insensitive searching
            liveSearchNormalize: true
        });

        this._setupPortSelect();
        this._setupGoodSelect();
        this.constructor._setupNationSelect();
        this._setupClanSelect();
        this._setupCMSelect();
    }

    _setupListener() {
        const portNames = $("#port-names"),
            goodNames = $("#good-names");

        portNames.addClass("selectpicker");
        portNames.on("change", event => this._portSelected(event)).selectpicker({
            title: "Move to port"
        });

        goodNames.addClass("selectpicker");
        goodNames.on("change", event => this._goodSelected(event)).selectpicker({
            title: "Select a good/Reset"
        });

        $("#prop-nation")
            .on("click", event => event.stopPropagation())
            .on("change", () => this._nationSelected());

        $("#prop-clan")
            .on("click", event => event.stopPropagation())
            .on("change", () => this._clanSelected());

        $("#menu-prop-all").on("click", () => this._allSelected());
        $("#menu-prop-green").on("click", () => this._greenZoneSelected());

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

        $("#prop-cm")
            .on("click", event => event.stopPropagation())
            .on("change", () => this._CMSelected());

        $(".selectpicker").selectpicker("refresh");
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

        const select = `<option value="0" selected>Move to port</option>${selectPorts
            .map(
                port =>
                    `<option data-subtext="${port.nation}" value="${port.coord}" data-id="${port.id}">${
                        port.name
                    }</option>`
            )
            .join("")}`;
        $("#port-names").append(select);
    }

    _setupGoodSelect() {
        let selectGoods = new Map();
        const goodsPerPort = this._ports.portDataDefault.map(d => {
            let goods = d.properties.dropsTrading ? d.properties.dropsTrading : "";
            goods += d.properties.dropsNonTrading ? `,${d.properties.dropsNonTrading}` : "";
            goods += d.properties.producesTrading ? `,${d.properties.producesTrading}` : "";
            goods += d.properties.producesNonTrading ? `,${d.properties.producesNonTrading}` : "";
            return {
                id: d.id,
                goods
            };
        });

        goodsPerPort.forEach(port => {
            port.goods.split(",").forEach(good => {
                if (good) {
                    const portIds = new Set(selectGoods.get(good)).add(port.id);
                    selectGoods.set(good, portIds);
                }
            });
        });
        selectGoods = new Map(Array.from(selectGoods).sort());
        let select = '<option value="0" selected>Select a good/Reset</option>';
        // eslint-disable-next-line no-restricted-syntax
        for (const [key, portIds] of selectGoods.entries()) {
            let ids = "";
            // eslint-disable-next-line no-restricted-syntax
            for (const id of portIds) {
                ids += `,${id}`;
            }
            select += `<option value="${ids.substr(1)}">${key}</option>`;
        }
        $("#good-names").append(select);
    }

    static _setupNationSelect() {
        const propNation = $("#prop-nation");
        const select = `<option value="0" selected>Select a nation/Reset</option>${nations
            .sort((a, b) => {
                if (a.sortName < b.sortName) {
                    return -1;
                }
                if (a.sortName > b.sortName) {
                    return 1;
                }
                return 0;
            })
            .map(nation => `<option value="${nation.id}">${nation.name}</option>`)
            .join("")}`;
        propNation.append(select);
    }

    _setupClanSelect() {
        const propClan = $("#prop-clan");

        propClan.empty();

        const clanList = new Set();
        this._ports.portData.filter(d => d.properties.capturer).map(d => clanList.add(d.properties.capturer));
        const select = `<option value="0" selected>Select a clan/Reset</option>${Array.from(clanList)
            .sort()
            .map(clan => `<option value="${clan}">${clan}</option>`)
            .join("")}`;
        propClan.append(select);
    }

    _setupCMSelect() {
        const propCM = $("#prop-cm");

        propCM.append(
            $("<option>", {
                value: 0,
                text: "Select amount/Reset"
            })
        );
        const cmList = new Set();
        this._ports.portData.filter(d => d.properties.capturer).map(d => cmList.add(d.properties.conquestMarksPension));
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
            this._ports.setCurrentPort(+c[0], +c[1], port.data("id").toString());
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
            .split(",");
        let portData;

        if (portIds.includes("0")) {
            portData = this._ports.portDataDefault;
        } else {
            portData = this._ports.portDataDefault.filter(d => portIds.includes(d.id));
        }
        this._ports.setPortData(portData);
        this._ports.update();
    }

    _nationSelected() {
        const nationId = $("#prop-nation").val();
        let portData;

        if (+nationId !== 0) {
            this._nation = nationId;
            portData = this._ports.portDataDefault.filter(d => nationId === d.properties.nation);
        } else {
            this._nation = "";
            portData = this._ports.portDataDefault;
        }
        $("#propertyDropdown").dropdown("toggle");
        this._ports.setPortData(portData);
        this._ports.update();
        this._setupClanSelect();
    }

    _clanSelected() {
        const clan = $("#prop-clan").val();
        let portData;

        if (+clan !== 0) {
            portData = this._ports.portDataDefault.filter(d => clan === d.properties.capturer);
        } else if (this._nation) {
            portData = this._ports.portDataDefault.filter(d => this._nation === d.properties.nation);
        } else {
            portData = this._ports.portDataDefault;
        }
        $("#propertyDropdown").dropdown("toggle");
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

    _capturePBRange() {
        const blackOutTimes = [8, 9, 10],
            // 24 hours minus black-out hours
            maxStartTime = 24 - (blackOutTimes.length + 1);
        const startTimes = new Set();
        const begin = moment($("#prop-pb-from-input").val(), this._timeFormat).hour();
        let end = moment($("#prop-pb-to-input").val(), this._timeFormat).hour();

        console.log("Between %d and %d", begin, end);

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
        console.log("Between %s and %s", begin.format("dddd D MMMM YYYY h:mm"), end.format("dddd D MMMM YYYY h:mm"));
        const portData = this._ports.portDataDefault.filter(d =>
            moment(d.properties.lastPortBattle).isBetween(begin, end, null, "(]")
        );
        this._ports.setPortData(portData);
        this._ports.update();
    }

    _capturedYesterday() {
        const begin = moment()
                .utc()
                .subtract(1, "day")
                .hour(11)
                .minute(0),
            end = moment()
                .utc()
                .hour(11)
                .minute(0);
        this._filterCaptured(begin, end);
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
}
