/*
    pbzone.js
*/

/* global d3 : false
 */

import Cookies from "js-cookie";

export default class PBZone {
    constructor(pbZoneData, fortData, towerData, ports) {
        this._pbZoneDataDefault = pbZoneData;
        this._fortDataDefault = fortData;
        this._towerDataDefault = towerData;
        this._pbZoneData = pbZoneData;
        this._fortData = fortData;
        this._towerData = towerData;
        this._ports = ports;

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
        this.pbZones = this._g.append("path").classed("pb-zone", true);
        this.towers = this._g.append("path").classed("tower", true);
        this.forts = this._g.append("path").classed("fort", true);
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
        this.pbZones.datum(this._pbZoneData).attr("d", d3.geoPath().pointRadius(4));
        this.towers.datum(this._towerData).attr("d", d3.geoPath().pointRadius(1.5));
        this.forts.datum(this._fortData).attr("d", d3.geoPath().pointRadius(2));
    }

    _setData() {
        if (this._ports.zoomLevel === "pbZone" && this._showPB !== "noShow") {
            this._pbZoneData = {
                type: "FeatureCollection",
                features: this._pbZoneDataDefault.filter(
                    d => this._showPB === "all" || (this._showPB === "single" && d.id === this._ports.currentPort.id)
                )
            };
            this._fortData = {
                type: "FeatureCollection",
                features: this._fortDataDefault.filter(
                    d => this._showPB === "all" || (this._showPB === "single" && d.id === this._ports.currentPort.id)
                )
            };
            this._towerData = {
                type: "FeatureCollection",
                features: this._towerDataDefault.filter(
                    d => this._showPB === "all" || (this._showPB === "single" && d.id === this._ports.currentPort.id)
                )
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
