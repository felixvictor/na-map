/*
	port-select.js
*/

import "bootstrap-select/js/bootstrap-select";
import moment from "moment/moment";
import "tempusdominus-bootstrap-4/build/js/tempusdominus-bootstrap-4";

import { nations } from "./common";

export default class PortSelect {
    constructor(ports, teleport, pbZone) {
        this._ports = ports;
        this._teleport = teleport;
        this._pbZone = pbZone;
        this._dateFormat = "D MMM";
        this._timeFormat = "HH.00";

        this._setupSelects();
        this._setupListener();
    }

    _setupSelects() {
        $(".selectpicker").selectpicker({
            dropupAuto: false,
            liveSearch: true,
            liveSearchPlaceholder: "Search ...",
            // accent-insensitive searching
            liveSearchNormalize: true
        });

        this._setupPortSelect();
        this._setupGoodSelect();
        this._setupNationSelect();
        this._setupClanSelect();
        this._setupCMSelect();
    }

    _setupListener() {
        const portNames = $("#port-names"),
            goodNames = $("#good-names"),
            selectPicker = $(".selectpicker");
        portNames.addClass("selectpicker");
        goodNames.addClass("selectpicker");

        portNames.on("change", this._portSelected).selectpicker({
            title: "Go to a port"
        });

        goodNames.on("change", this._goodSelected).selectpicker({
            title: "Select a good"
        });

        selectPicker.selectpicker("refresh");

        $("#prop-nation")
            .on("click", event => event.stopPropagation())
            .on("change", this._nationSelected);

        $("#prop-clan")
            .on("click", event => event.stopPropagation())
            .on("change", this._clanSelected);

        $("#menu-prop-all").on("click", this._allSelected);
        $("#menu-prop-green").on("click", this._greenZoneSelected);

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

        $("#menu-prop-yesterday").on("click", this._capturedYesterday);
        $("#menu-prop-this-week").on("click", this._capturedThisWeek);
        $("#menu-prop-last-week").on("click", this._capturedLastWeek);

        const portFrom = $("#prop-from"),
            portTo = $("#prop-to");
        portFrom.datetimepicker({
            format: this._dateFormat
        });
        portTo.datetimepicker({
            format: this._dateFormat,
            useCurrent: false
        });
        portFrom.on("change.datetimepicker", e => {
            portTo.datetimepicker("minDate", e.date);
        });
        portTo.on("change.datetimepicker", e => {
            portFrom.datetimepicker("maxDate", e.date);
        });

        $("#prop-range").submit(event => {
            this._captureRange();
            $("#propertyDropdown").dropdown("toggle");
            event.preventDefault();
        });

        $("#prop-cm")
            .on("click", event => event.stopPropagation())
            .on("change", this._CMSelected);
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
        $("#good-names").append(select);
    }

    // noinspection JSMethodCanBeStatic
    _setupNationSelect() {
        const propNation = $("#prop-nation");
        const select = `<option value="0">Select a nation/Reset</option>${nations
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
        const select = `<option value="0">Select a clan / Reset</option>${Array.from(clanList)
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
                text: "Select amount"
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

    _portSelected() {
        const port = $(this).find(":selected");
        const c = port.val().split(",");
        this._ports.currentPort.coord.x = +c[0];
        this._ports.currentPort.coord.y = +c[1];
        this._ports.currentPort.id = port.data("id").toString();

        if (this._pbZone.showPBZones) {
            this._pbZone.refresh();
            this._ports.update(this._teleport.highlightId);
        }
        this._ports.goToPort();
    }

    _goodSelected() {
        const portIds = $(this)
            .val()
            .split(",");
        if (portIds.includes("0")) {
            this._ports.portData = this._ports.portDataDefault;
        } else {
            this._ports.portData = this._ports.portDataDefault.filter(d => portIds.includes(d.id));
        }
        this._ports.update(this._teleport.highlightId);
    }

    _nationSelected() {
        const nationId = $("#prop-nation").val();

        if (+nationId !== 0) {
            this._nation = nationId;
            this._ports.portData = this._ports.portDataDefault.filter(d => nationId === d.properties.nation);
            this._setupClanSelect();
        } else {
            this._nation = "";
            this._ports.portData = this._ports.portDataDefault;
            this._setupClanSelect();
        }
        $("#propertyDropdown").dropdown("toggle");
        this._ports.update(this._teleport.highlightId);
    }

    _clanSelected() {
        const clan = $("#prop-clan").val();

        if (+clan !== 0) {
            this._ports.portData = this._ports.portDataDefault.filter(d => clan === d.properties.capturer);
        } else if (this._nation) {
            this._ports.portData = this._ports.portDataDefault.filter(d => this._nation === d.properties.nation);
        } else {
            this._ports.portData = this._ports.portDataDefault;
        }
        $("#propertyDropdown").dropdown("toggle");
        this._ports.update(this._teleport.highlightId);
    }

    _allSelected() {
        this._ports.portData = this._ports.portDataDefault.filter(d => d.properties.availableForAll);
        this._ports.update(this._teleport.highlightId);
    }

    _greenZoneSelected() {
        this._ports.portData = this._ports.portDataDefault.filter(
            d => d.properties.nonCapturable && d.properties.nation !== "FT"
        );
        this._ports.update(this._teleport.highlightId);
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

        /*
        console.log(startTimes);
        for (const time of startTimes.values()) {
            console.log(
                "%s.00\u202f–\u202f%s.00",
                !time ? "11" : (time + 10) % 24,
                !time ? "8" : (time + 13) % 24
            );
        }
        */

        this._ports.portData = this._ports.portDataDefault.filter(
            d =>
                !d.properties.nonCapturable &&
                d.properties.nation !== "FT" &&
                startTimes.has(d.properties.portBattleStartTime)
        );
        this._ports.update(this._teleport.highlightId);
    }

    _filterCaptured(begin, end) {
        console.log("Between %s and %s", begin.format("dddd D MMMM YYYY h:mm"), end.format("dddd D MMMM YYYY h:mm"));
        this._ports.portData = this._ports.portDataDefault.filter(d =>
            moment(d.properties.lastPortBattle).isBetween(begin, end, null, "(]")
        );
        this._ports.update(this._teleport.highlightId);
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

        if (value !== 0) {
            this._ports.portData = this._ports.portDataDefault.filter(d => value === d.properties.conquestMarksPension);
        } else {
            this._ports.portData = this._ports.portDataDefault;
        }
        $("#propertyDropdown").dropdown("toggle");
        this._ports.update(this._teleport.highlightId);
    }
}
