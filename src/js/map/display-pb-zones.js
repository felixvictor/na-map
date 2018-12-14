/**
 * This file is part of na-map.
 *
 * @file      Display port battle zones.
 * @module    map/display-pb-zones
 * @author    iB aka Felix Victor
 * @copyright 2018
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { geoPath as d3GeoPath } from "d3-geo";
import { select as d3Select } from "d3-selection";
import Cookies from "js-cookie";

export default class DisplayPbZones {
    constructor(pbCircles, forts, towers, joinCircles, ports) {
        this._ports = ports;

        this._pbCircleDataDefault = pbCircles;
        this._pbCircleData = pbCircles;

        this._fortDataDefault = forts;
        this._fortData = forts;

        this._towerDataDefault = towers;
        this._towerData = towers;

        this._joinCircleDataDefault = joinCircles;
        this._joinCircleData = joinCircles;

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
        this._g = d3Select("#na-svg")
            .insert("g", "g.ports")
            .classed("pb", true);
        this._gJoinCirclesInner = this._g.append("path").classed("join-circle", true);
        this._gJoinCirclesOuter = this._g.append("path").classed("join-circle", true);
        this._gPBCircles = this._g.append("path").classed("pb-circle", true);
        this._gTowers = this._g.append("path").classed("tower", true);
        this._gForts = this._g.append("path").classed("fort", true);
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
        // Use default value if cookie is not stored
        const r = Cookies.get(this._showPBCookieName) || this._showPBDefault;
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
        this._gPBCircles.datum(this._pbCircleData).attr("d", d3GeoPath().pointRadius(3.5));
        this._gTowers.datum(this._towerData).attr("d", d3GeoPath().pointRadius(1.5));
        this._gForts.datum(this._fortData).attr("d", d3GeoPath().pointRadius(2));
        this._gJoinCirclesInner.datum(this._joinCircleData).attr("d", d3GeoPath().pointRadius(14));
        this._gJoinCirclesOuter.datum(this._joinCircleData).attr("d", d3GeoPath().pointRadius(28));
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
        this._setData();
        this._update();
    }

    transform(transform) {
        this._g.attr("transform", transform);
    }
}
