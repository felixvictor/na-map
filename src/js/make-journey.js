/**
 * This file is part of na-map.
 *
 * @file      Make a journey.
 * @module    make-journey
 * @author    iB aka Felix Victor
 * @copyright 2018
 * @license   http://www.gnu.org/licenses/gpl.html
 */

/* global d3 : false
 */

import moment from "moment";
import "moment/locale/en-gb";
import "round-slider/src/roundslider";

import { compassDirections, compassToDegrees, degreesToCompass, rotationAngleInDegrees, formatF11 } from "./util";
import { registerEvent } from "./analytics";
import ShipCompare from "./ship-compare";
import WoodCompare from "./wood-compare";
import { convertInvCoordX, convertInvCoordY, getDistance, initMultiDropdownNavbar, speedFactor } from "./common";

/**
 * Journey
 */
export default class Journey {
    /**
     * @param {Object} shipData - Ship data
     * @param {Object} woodData - Wood data
     */
    constructor(shipData, woodData, fontSize) {
        this._shipData = shipData;
        this._woodData = woodData;
        this._fontSize = fontSize;

        this._bFirstCoord = true;
        this._compassSize = 100;
        this._line = d3
            .line()
            .x(d => d.x)
            .y(d => d.y);
        this._lineData = [];

        this._minutesForFullCircle = 48;
        this._fullCircle = 360;
        this._degreesPerMinute = this._fullCircle / this._minutesForFullCircle;
        this._degreesSegment = 15;
        this._minOWSpeed = 2;
        this._owSpeedFactor = 2;

        this._totalDistance = 0;
        this._totalMinutes = 0;
        this._currentWindDegrees = null;

        this._speedScale = d3.scaleLinear().domain(d3.range(0, this._fullCircle, this._degreesSegment));

        this._setupSvg();

        this._shipId = "ship-journey";
        this._woodId = "wood-journey";
        this._selected = false;
        this._setupListener();
    }

    _navbarClick(event) {
        registerEvent("Menu", "Journey");
        event.preventDefault();
        // event.stopPropagation();
        this._journeySelected();
    }

    /**
     * Setup menu item listener
     * @returns {void}
     */
    _setupListener() {
        document
            .getElementById("journeyNavbar")
            .addEventListener("click", event => this._navbarClick(event), { once: true });
    }

    _setupWindInput() {
        // workaround from https://github.com/soundar24/roundSlider/issues/71
        // eslint-disable-next-line func-names,no-underscore-dangle
        const { _getTooltipPos } = $.fn.roundSlider.prototype;
        // eslint-disable-next-line func-names,no-underscore-dangle
        $.fn.roundSlider.prototype._getTooltipPos = function() {
            if (!this.tooltip.is(":visible")) {
                $("body").append(this.tooltip);
            }
            const pos = _getTooltipPos.call(this);
            this.container.append(this.tooltip);
            return pos;
        };

        window.tooltip = args => degreesToCompass(args.value);

        $("#journey-wind-direction").roundSlider({
            sliderType: "default",
            handleSize: "+1",
            startAngle: 90,
            width: 20,
            radius: 110,
            min: 0,
            max: 359,
            step: 360 / compassDirections.length,
            editableTooltip: false,
            tooltipFormat: "tooltip",
            create() {
                this.control.css("display", "block");
            },
            change() {
                this._currentWind = $("#journey-wind-direction").roundSlider("getValue");
            }
        });
    }

    /**
     * Action when selected
     * @returns {void}
     */
    _journeySelected() {
        if (!this._selected) {
            this._selected = true;

            this._injectInputs();
            this._setupWindInput();

            this._shipCompare = new ShipCompare(this._shipData, this._woodData, this._shipId);
            this._woodCompare = new WoodCompare(this._woodData, this._woodId);

            initMultiDropdownNavbar("journeyNavbar");
        }
    }

    _injectInputs() {
        if (d3.select("#journeyMenu form").empty()) {
            const div = d3
                .select("#journeyMenu")
                .append("div")
                .attr("class", "p-2");
            const slider = div
                .append("form")
                .append("div")
                .attr("class", "form-group");
            slider
                .append("p")
                .attr("class", "form-text")
                .text("1. Set current in-game wind");
            slider
                .append("div")
                .attr("id", "journey-wind-direction")
                .attr("class", "rslider");

            div.append("p")
                .attr("class", "form-text")
                .text("2. Set ship");
            const shipId = `${this._shipId}-Base-select`;
            div.append("label")
                .append("select")
                .attr("name", shipId)
                .attr("id", shipId);
            ["frame", "trim"].forEach(type => {
                const woodId = `${this._woodId}-${type}-Base-select`;
                div.append("label")
                    .append("select")
                    .attr("name", woodId)
                    .attr("id", woodId);
            });
        }
    }

    /* private */
    _setupSvg() {
        this._g = d3
            .select("#na-svg")
            .append("g")
            .classed("coord", true);

        d3.select("#na-svg defs")
            .append("marker")
            .attr("id", "course-arrow")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 8)
            .attr("refY", 0)
            .attr("markerWidth", 5)
            .attr("markerHeight", 5)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("class", "course-head");
    }

    _printCompass() {
        const pos = this._lineData.length - 1,
            x = this._lineData[pos].x,
            y = this._lineData[pos].y;
        this._g
            .append("image")
            .classed("compass", true)
            .attr("x", x)
            .attr("y", y)
            .attr("transform", `translate(${-this._compassSize / 2},${-this._compassSize / 2})`)
            .attr("height", this._compassSize)
            .attr("width", this._compassSize)
            .attr("xlink:href", "icons/compass.svg");
        this.gCompass = this._g.append("path");
    }

    _getSpeedAtDegrees(degrees) {
        return Math.max(this._speedScale(degrees), this._minOWSpeed);
    }

    _calculateDistanceForSection(degreesCourse, degreesCurrentWind) {
        const degreesForSpeedCalc = (this._fullCircle - degreesCourse + degreesCurrentWind) % this._fullCircle,
            speedCurrentSection = this._getSpeedAtDegrees(degreesForSpeedCalc) * this._owSpeedFactor,
            distanceCurrentSection = speedCurrentSection * speedFactor;
        console.log(
            { degreesCourse },
            { degreesCurrentWind },
            { degreesForSpeedCalc },
            { speedCurrentSection },
            { distanceCurrentSection }
        );
        return distanceCurrentSection;
    }

    _getStartWind() {
        const currentUserWind = $("#journey-wind-direction").roundSlider("getValue");
        let currentWindDegrees;
        // Current wind in degrees
        if (!$("#journey-wind-direction").length) {
            currentWindDegrees = 0;
        } else {
            currentWindDegrees = +currentUserWind;
        }
        return currentWindDegrees;
    }

    _setShipSpeed() {
        // Dummy ship speed of 19 knots
        let speedDegrees = Array.from(Array(24).fill(19 / 2));

        if (typeof this._shipCompare !== "undefined") {
            ({ speedDegrees } = this._shipCompare._singleShipData);
        }
        this._speedScale.range(speedDegrees);
        console.log(this._speedScale.range());
    }

    _calculateMinutesForCourse(courseDegrees, startWindDegrees, distanceTotal) {
        let distanceRemaining = distanceTotal,
            currentWindDegrees = startWindDegrees,
            totalMinutes = 0;
        while (distanceRemaining > 0) {
            const distanceCurrentSection = this._calculateDistanceForSection(courseDegrees, currentWindDegrees);
            if (distanceRemaining > distanceCurrentSection) {
                distanceRemaining -= distanceCurrentSection;
                totalMinutes += 1;
            } else {
                totalMinutes += distanceRemaining / distanceCurrentSection;
                distanceRemaining = 0;
            }
            currentWindDegrees = (this._fullCircle + currentWindDegrees - this._degreesPerMinute) % this._fullCircle;

            console.log({ distanceCurrentSection }, { totalMinutes });
        }
        this._currentWindDegrees = currentWindDegrees;

        return totalMinutes;
    }

    _getShipName() {
        let text = "";
        if (typeof this._shipCompare !== "undefined") {
            text += ` \u2606 ${
                this._shipCompare._woodCompare._woodsSelected.Base.frame
            }/${this._shipCompare._woodCompare._woodsSelected.Base.trim.toLowerCase()} ${
                this._shipCompare._singleShipData.name
            }`;
        }
        return text;
    }

    _printLine() {
        this._setShipSpeed();
        const pos1 = this._lineData.length - 1,
            pos2 = this._lineData.length - 2,
            pt1 = this._lineData[pos1],
            pt2 = this._lineData[pos2],
            courseDegrees = rotationAngleInDegrees(pt1, pt2),
            startWindDegrees = this._currentWindDegrees || this._getStartWind(),
            distanceK = getDistance(pt1, pt2),
            courseCompass = degreesToCompass(courseDegrees);
        console.log("*** start", { startWindDegrees }, { distanceK }, { courseCompass });

        const minutes = this._calculateMinutesForCourse(courseDegrees, startWindDegrees, distanceK * 1000);
        this._totalDistance += distanceK;
        this._totalMinutes += minutes;
        const duration = moment.duration(minutes, "minutes").humanize(true),
            totalDuration = moment.duration(this._totalMinutes, "minutes").humanize(true),
            textDirection = `${courseCompass} (${Math.round(courseDegrees)}°) \u2606 F11: ${formatF11(
                convertInvCoordX(pt1.x, pt1.y)
            )}\u202f/\u202f${formatF11(convertInvCoordY(pt1.x, pt1.y))}${this._getShipName()}`;
        let textDistance = `${Math.round(distanceK)}k ${duration}`;
        const textLines = 2;
        if (this._lineData.length > 2) {
            textDistance += ` \u2606 total ${Math.round(this._totalDistance)}k ${totalDuration}`;
        }

        this.gCompass
            .datum(this._lineData)

            .attr("marker-end", "url(#course-arrow)")
            .attr("d", this._line);

        const svg = this._g
            .append("svg")
            .attr("x", pt1.x)
            .attr("y", pt1.y);
        const textBackgroundBox = svg.append("rect");
        const textDirectionBox = svg
            .append("text")
            .attr("x", "10%")
            .attr("y", "33%")
            .text(textDirection);

        const textDistanceBox = svg
            .append("text")
            .attr("x", "10%")
            .attr("y", "66%")
            .text(textDistance);

        const bbTextDirectionBox = textDirectionBox.node().getBBox(),
            bbTextDistanceBox = textDistanceBox.node().getBBox();

        const height = (bbTextDirectionBox.height + this._fontSize) * textLines * 1.1,
            width = (Math.max(bbTextDirectionBox.width, bbTextDistanceBox.width) + this._fontSize) * 1.1;
        textBackgroundBox
            .attr("x", 0)
            .attr("y", 0)
            .attr("height", height)
            .attr("width", width);
        svg.attr("height", height).attr("width", width);
    }

    /* public */
    plotCourse(x, y) {
        if (this._bFirstCoord) {
            this.clearMap();
        }
        this._lineData.push({ x, y });
        if (this._bFirstCoord) {
            this._printCompass();
            this._bFirstCoord = !this._bFirstCoord;
        } else {
            this._printLine();
        }
    }

    transform(transform) {
        this._g.attr("transform", transform);
    }

    clearMap() {
        this._bFirstCoord = true;
        this._currentWindDegrees = null;
        this._totalDistance = 0;
        this._totalMinutes = 0;
        if (typeof this._lineData !== "undefined") {
            this._lineData.splice(0, this._lineData.length);
        }

        this._g.selectAll("*").remove();
    }
}
