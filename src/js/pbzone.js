/*
    pbzone.js
*/

/* global d3 : false
 */

import Cookies from "js-cookie";

export default class PBZone {
    constructor(pbData, ports) {
        function getFeature(d) {
            return {
                type: "Feature",
                id: d.id,
                geometry: d.geometry
            };
        }

        this._ports = ports;

        // Port ids of capturable ports
        const portIds = this._ports.portData.filter(port => !port.properties.nonCapturable).map(port => port.id);
console.log(pbData);
        this._pbCircleDataDefault = pbData.pbCircles.features
            .filter(port => portIds.includes(port.id))
            .map(d => getFeature(d));
        this._pbCircleData = this._pbCircleDataDefault;

        this._fortDataDefault = pbData.forts.features.filter(port => portIds.includes(port.id)).map(d => getFeature(d));
        this._fortData = this._fortDataDefault;

        this._towerDataDefault = pbData.towers.features
            .filter(port => portIds.includes(port.id))
            .map(d => getFeature(d));
        this._towerData = this._towerDataDefault;

        this._joinCircleDataDefault = pbData.joinCircles.features
            .filter(port => portIds.includes(port.id))
            .map(d => getFeature(d));
        this._joinCircleData = this._joinCircleDataDefault;

        /**
         * showLayer cookie name
         * @type {string}
         * @private
         */
        this._showPBCookieName = "na-map--show-pb";

        /**
         * Default showLayer setting
         * @type {string}
         * @private
         */
        this._showPBDefault = "all";

        /**
         * Get showLayer setting from cookie or use default value
         * @type {string}
         * @private
         */
        this._showPB = this._getShowPBSetting();

        this._setupSvg();
        this._setupListener();
    }

    _setupSvg() {
        this._g = d3
            .select("#na-svg")
            .append("g")
            .classed("pb", true);
        this._gPBCircles = this._g.append("path").classed("pb-circle", true);
        this._gTowers = this._g.append("path").classed("tower", true);
        this._gForts = this._g.append("path").classed("fort", true);
        this._gJoinCirclesInner = this._g.append("path").classed("join-circle", true);
        this._gJoinCirclesOuter = this._g.append("path").classed("join-circle", true);
    }

    _setupListener() {
        $("#show-pb").change(() => this._showPBZonesSelected());
    }

    /**
     * Get show setting from cookie or use default value
     * @returns {string} - Show setting
     * @private
     */
    _getShowPBSetting() {
        let r = Cookies.get(this._showPBCookieName);
        // Use default value if cookie is not stored
        r = typeof r !== "undefined" ? r : this._showPBDefault;
        $(`#show-pb-${r}`).prop("checked", true);
        return r;
    }

    /**
     * Store show setting in cookie
     * @return {void}
     * @private
     */
    _storeShowPBSetting() {
        if (this._showPB !== this._showPBDefault) {
            Cookies.set(this._showPBCookieName, this._showPB);
        } else {
            Cookies.remove(this._showPBCookieName);
        }
    }

    _refreshPBZones() {
        this.refresh();
        this._ports.updateTexts();
    }

    _showPBZonesSelected() {
        this._showPB = $("input[name='showPB']:checked").val();
        this._storeShowPBSetting();
        this._refreshPBZones();
    }

    _update() {
        this._gPBCircles.datum(this._pbData).attr("d", d3.geoPath().pointRadius(4));
        this._gTowers.datum(this._towerData).attr("d", d3.geoPath().pointRadius(1.5));
        this._gForts.datum(this._fortData).attr("d", d3.geoPath().pointRadius(2));
        this._gJoinCirclesInner.datum(this._joinCircleData).attr("d", d3.geoPath().pointRadius(8));
        this._gJoinCirclesOuter.datum(this._joinCircleData).attr("d", d3.geoPath().pointRadius(16));
    }

    _isPortIn(d) {
        return this._showPB === "all" || (this._showPB === "single" && d.id === this._ports.currentPort.id);
    }

    _setData() {
        if (this._ports.zoomLevel === "pbZone" && this._showPB !== "noShow") {
            this._pbCircleData = {
                type: "FeatureCollection",
                features: this._pbCircleDataDefault.filter(d => this._isPortIn(d))
            };
            this._fortData = {
                type: "FeatureCollection",
                features: this._fortDataDefault.filter(d => this._isPortIn(d))
            };
            this._towerData = {
                type: "FeatureCollection",
                features: this._towerDataDefault.filter(d => this._isPortIn(d))
            };
            this._joinCircleData = {
                type: "FeatureCollection",
                features: this._joinCircleDataDefault.filter(d => this._isPortIn(d))
            };
        } else {
            this._pbCircleData = {};
            this._fortData = {};
            this._towerData = {};
            this._joinCircleData = {};
        }
    }

    refresh() {
        console.log("pbData refresh (sollte nicht zu häufig passieren");
        this._setData();
        this._update();
    }

    transform(transform) {
        this._g.attr("transform", transform);
    }
}
