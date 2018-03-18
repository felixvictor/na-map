/*
    pbzone.js
*/

/* global d3 : false
 */

export default class PBZone {
    constructor(pbZoneData, fortData, towerData, ports) {
        this._pbZoneDataDefault = pbZoneData;
        this._fortDataDefault = fortData;
        this._towerDataDefault = towerData;
        this._pbZoneData = pbZoneData;
        this._fortData = fortData;
        this._towerData = towerData;
        this._ports = ports;

        this._setupSvg();
        this._setupListener();
    }

    _setupSvg() {
        this._g = d3
            .select("#na-svg")
            .append("g")
            .classed("pb", true);
        this.pbZones = this._g.append("path").classed("pb-zone", true);
        this.towers = this._g.append("path").classed("tower", true);
        this.forts = this._g.append("path").classed("fort", true);
    }

    _setupListener() {
        $("#show-pb")
            .on("click", event => {
                event.stopPropagation();
            })
            .on("change", () => this._showPBZonesSelected());
    }

    _showPBZonesSelected() {
        const $input = $("#show-pb");

        this.setShowPBZones($input.is(":checked"));
        this.refresh();
        this._ports.updateTexts();
    }

    setShowPBZones(showPBZones) {
        this._showPBZones = showPBZones;
        this._ports._showPBZones = showPBZones;
    }

    _update() {
        this.pbZones.datum(this._pbZoneData).attr("d", d3.geoPath().pointRadius(4));
        this.towers.datum(this._towerData).attr("d", d3.geoPath().pointRadius(1.5));
        this.forts.datum(this._fortData).attr("d", d3.geoPath().pointRadius(2));
    }

    _setData() {
        if (this._showPBZones && this._ports._zoomLevel === "pbZone") {
            this._pbZoneData = {
                type: "FeatureCollection",
                features: this._pbZoneDataDefault.features.filter(d => d.id === this._ports.currentPort.id).map(d => ({
                    type: "Feature",
                    id: d.id,
                    geometry: d.geometry
                }))
            };
            this._fortData = {
                type: "FeatureCollection",
                features: this._fortDataDefault.features.filter(d => d.id === this._ports.currentPort.id).map(d => ({
                    type: "Feature",
                    id: d.id,
                    geometry: d.geometry
                }))
            };
            this._towerData = {
                type: "FeatureCollection",
                features: this._towerDataDefault.features.filter(d => d.id === this._ports.currentPort.id).map(d => ({
                    type: "Feature",
                    id: d.id,
                    geometry: d.geometry
                }))
            };
        } else {
            this._pbZoneData = {};
            this._fortData = {};
            this._towerData = {};
        }
    }

    refresh() {
        this._setData();
        this._update();
    }

    transform(transform) {
        this._g.attr("transform", transform);
    }
}
