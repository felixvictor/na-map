/*
    pbzone.js
*/

/* global d3 : false
 */

export default class PBZone {
    constructor(pbZoneData, fortData, towerData, ports) {
        this.pbZoneDataDefault = pbZoneData;
        this.fortDataDefault = fortData;
        this.towerDataDefault = towerData;
        this.pbZoneData = pbZoneData;
        this.fortData = fortData;
        this.towerData = towerData;
        this.ports = ports;

        this.setupSvg();
        this.setupListener();
    }

    setupSvg() {
        this.g = d3.select("#na-svg")
            .append("g")
            .classed("pb", true);
        this.pbZones = this.g.append("path").classed("pb-zone", true);
        this.towers = this.g.append("path").classed("tower", true);
        this.forts = this.g.append("path").classed("fort", true);
    }

    setupListener() {
        $("#show-pb")
            .on("click", event => event.stopPropagation())
            .on("change", () => this.showPBZonesSelected());
    }

    showPBZonesSelected() {
        const $input = $("#show-pb");

        this.setShowPBZones($input.is(":checked"));
        this.setData();
        this.update();
        this.ports.updateTexts();
    }

    setShowPBZones(showPBZones) {
        this.showPBZones = showPBZones;
        this.ports.showPBZones = showPBZones;
    }

    update() {
        this.pbZones.datum(this.pbZoneData).attr("d", d3.geoPath().pointRadius(4));
        this.towers.datum(this.towerData).attr("d", d3.geoPath().pointRadius(1.5));
        this.forts.datum(this.fortData).attr("d", d3.geoPath().pointRadius(2));
    }

    setData() {
        if (this.showPBZones && this.ports.zoomLevel === "pbZone") {
            this.pbZoneData = {
                type: "FeatureCollection",
                features: this.pbZoneDataDefault.features.filter(d => d.id === this.ports.currentPort.id).map(d => ({
                    type: "Feature",
                    id: d.id,
                    geometry: d.geometry
                }))
            };
            this.fortData = {
                type: "FeatureCollection",
                features: this.fortDataDefault.features.filter(d => d.id === this.ports.currentPort.id).map(d => ({
                    type: "Feature",
                    id: d.id,
                    geometry: d.geometry
                }))
            };
            this.towerData = {
                type: "FeatureCollection",
                features: this.towerDataDefault.features.filter(d => d.id === this.ports.currentPort.id).map(d => ({
                    type: "Feature",
                    id: d.id,
                    geometry: d.geometry
                }))
            };
        } else {
            this.pbZoneData = {};
            this.fortData = {};
            this.towerData = {};
        }
    }

    refresh() {
        this.setData();
        this.update();
    }

    transform(transform) {
        this.g.attr("transform", transform);
    }
}
