/*!
 * This file is part of na-map.
 *
 * @file      Display port battle zones.
 * @module    map/display-pb-zones
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import { select as d3Select } from "d3-selection";
import { putImportError } from "../../common/common";
import { drawSvgCircle, drawSvgRect } from "../util";
import Cookie from "../util/cookie";
import RadioButton from "../util/radio-button";
export default class DisplayPbZones {
    constructor(ports) {
        this._ports = ports;
        this._showId = "show-zones";
        this._showValues = ["pb-all", "pb-single", "raid-all", "raid-single", "off"];
        this._showCookie = new Cookie({ id: this._showId, values: this._showValues });
        this._showRadios = new RadioButton(this._showId, this._showValues);
        this.showPB = this._getShowPBSetting();
        this._isDataLoaded = false;
        this._setupSvg();
        this._setupListener();
    }
    _setupSvg() {
        this._g = d3Select("#na-svg").insert("g", "#ports").attr("class", "pb");
    }
    async _loadData() {
        try {
            this._pbZonesDefault = (await import("Lib/gen-generic/pb-zones.json")).default;
        }
        catch (error) {
            putImportError(error);
        }
    }
    _setupListener() {
        var _a;
        (_a = document.querySelector(`#${this._showId}`)) === null || _a === void 0 ? void 0 : _a.addEventListener("change", (event) => {
            this._showPBZonesSelected();
            event.preventDefault();
        });
    }
    _getShowPBSetting() {
        const r = this._showCookie.get();
        this._showRadios.set(r);
        return r;
    }
    _refreshPBZones() {
        this.refresh();
        this._ports.updateTexts();
    }
    _showPBZonesSelected() {
        this.showPB = this._showRadios.get();
        this._showCookie.set(this.showPB);
        this._refreshPBZones();
    }
    _update() {
        this._g
            .selectAll("g.pb-zones")
            .data(this._pbZonesFiltered, (d) => String(d.id))
            .join((enter) => {
            const g = enter.append("g").attr("class", "pb-zones");
            g.append("path")
                .attr("class", "pb-join-circle")
                .attr("d", (d) => drawSvgCircle(d.joinCircle[0], d.joinCircle[1], 28).concat(drawSvgCircle(d.joinCircle[0], d.joinCircle[1], 14)));
            g.append("path")
                .attr("class", "pb-circle")
                .attr("d", (d) => d.pbCircles.map((pbCircle) => drawSvgCircle(pbCircle[0], pbCircle[1], 3.5)).join(""));
            g.append("text")
                .attr("class", "pb-text pb-circle-text")
                .attr("x", (d) => d.pbCircles.map((pbCircle) => pbCircle[0]).join(","))
                .attr("y", (d) => d.pbCircles.map((pbCircle) => pbCircle[1]).join(","))
                .text((d) => d.pbCircles.map((pbCircle, i) => String.fromCharCode(65 + i)).join(""));
            return g;
        });
        this._g
            .selectAll("g.raid-zones")
            .data(this._raidZonesFiltered, (d) => String(d.id))
            .join((enter) => {
            const g = enter.append("g").attr("class", "raid-zones");
            g.append("path")
                .attr("class", "raid-join-circle")
                .attr("d", (d) => drawSvgCircle(d.joinCircle[0], d.joinCircle[1], 35));
            g.append("path")
                .attr("class", "raid-circle")
                .attr("d", (d) => d.raidCircles.map((raidCircle) => drawSvgCircle(raidCircle[0], raidCircle[1], 4.5)).join(""));
            g.append("text")
                .attr("class", "pb-text raid-circle-text")
                .attr("x", (d) => d.raidCircles.map((raidCircle) => raidCircle[0]).join(","))
                .attr("y", (d) => d.raidCircles.map((raidCircle) => raidCircle[1]).join(","))
                .text((d) => d.raidCircles.map((raidCircle, i) => String.fromCharCode(65 + i)).join(""));
            g.append("path")
                .attr("class", "raid-point")
                .attr("d", (d) => d.raidPoints.map((raidPoint) => drawSvgCircle(raidPoint[0], raidPoint[1], 1.5)).join(""));
            g.append("text")
                .attr("class", "pb-text raid-point-text")
                .attr("x", (d) => d.raidPoints.map((raidPoint) => raidPoint[0]).join(","))
                .attr("y", (d) => d.raidPoints.map((raidPoint) => raidPoint[1]).join(","))
                .text((d) => d.raidPoints.map((raidPoint, i) => String.fromCharCode(49 + i)).join(""));
            return g;
        });
        this._g
            .selectAll("g.defence")
            .data(this._defencesFiltered, (d) => String(d.id))
            .join((enter) => {
            const g = enter.append("g").attr("class", "defence");
            g.append("path")
                .attr("class", "fort")
                .attr("d", (d) => d.forts.map((fort) => drawSvgRect(fort[0], fort[1], 3)).join(""));
            g.append("text")
                .attr("class", "pb-text pb-fort-text")
                .attr("x", (d) => d.forts.map((fort) => fort[0]).join(","))
                .attr("y", (d) => d.forts.map((fort) => fort[1]).join(","))
                .text((d) => d.forts.map((fort, i) => `${i + 1}`).join(""));
            g.append("path")
                .attr("class", "tower")
                .attr("d", (d) => d.towers.map((tower) => drawSvgCircle(tower[0], tower[1], 1.5)).join(""));
            g.append("text")
                .attr("class", "pb-text pb-tower-text")
                .attr("x", (d) => d.towers.map((tower) => tower[0]).join(","))
                .attr("y", (d) => d.towers.map((tower) => tower[1]).join(","))
                .text((d) => d.towers.map((tower, i) => `${i + 1}`).join(""));
            return g;
        });
    }
    _isPortIn(d) {
        return (this.showPB === "pb-all" ||
            this.showPB === "raid-all" ||
            ((this.showPB === "pb-single" || this.showPB === "raid-single") &&
                Number(d.id) === this._ports.currentPort.id));
    }
    _setData() {
        if (this._ports.zoomLevel === "pbZone" && this.showPB !== "off") {
            if (this._isDataLoaded) {
                this._filterVisible();
            }
            else {
                this._loadData().then(() => {
                    this._isDataLoaded = true;
                    this._filterVisible();
                });
            }
        }
        else {
            this._defencesFiltered = [];
            this._pbZonesFiltered = [];
            this._raidZonesFiltered = [];
        }
    }
    _filterVisible() {
        const portsFiltered = this._pbZonesDefault
            .filter((port) => port.position[0] >= this._lowerBound[0] &&
            port.position[0] <= this._upperBound[0] &&
            port.position[1] >= this._lowerBound[1] &&
            port.position[1] <= this._upperBound[1])
            .filter((d) => this._isPortIn(d));
        this._defencesFiltered = portsFiltered.map((port) => ({ id: port.id, forts: port.forts, towers: port.towers }));
        if (this.showPB === "pb-all" || this.showPB === "pb-single") {
            this._pbZonesFiltered = portsFiltered.map((port) => ({
                id: port.id,
                pbCircles: port.pbCircles,
                joinCircle: port.joinCircle,
            }));
            this._raidZonesFiltered = [];
        }
        else {
            this._pbZonesFiltered = [];
            this._raidZonesFiltered = portsFiltered.map((port) => ({
                id: port.id,
                joinCircle: port.joinCircle,
                raidCircles: port.raidCircles,
                raidPoints: port.raidPoints,
            }));
        }
    }
    setBounds(lowerBound, upperBound) {
        this._lowerBound = lowerBound;
        this._upperBound = upperBound;
    }
    refresh() {
        this._setData();
        this._update();
    }
    transform(transform) {
        this._g.attr("transform", transform.toString());
    }
}
//# sourceMappingURL=display-pb-zones.js.map