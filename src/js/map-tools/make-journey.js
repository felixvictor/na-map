/**
 * This file is part of na-map.
 *
 * @file      Make a journey.
 * @module    map-tools/make-journey
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import "bootstrap/js/dist/util";
import "bootstrap/js/dist/modal";

import { layoutTextLabel, layoutAnnealing, layoutLabel } from "@d3fc/d3fc-label-layout";
import { range as d3Range } from "d3-array";
import { drag as d3Drag } from "d3-drag";
import { scaleLinear as d3ScaleLinear } from "d3-scale";
import { event as d3Event, select as d3Select } from "d3-selection";
import { line as d3Line } from "d3-shape";
import { zoomIdentity as d3ZoomIdentity, zoomTransform as d3ZoomTransform } from "d3-zoom";
import moment from "moment";
import "moment/locale/en-gb";

import "round-slider/src/roundslider";
import "round-slider/src/roundslider.css";
import "../../scss/roundslider.scss";

import { registerEvent } from "../analytics";
import {
    convertInvCoordX,
    convertInvCoordY,
    degreesPerSecond,
    fullCircle,
    getDistance,
    insertBaseModal,
    speedFactor
} from "../common";
import {
    compassDirections,
    degreesToCompass,
    displayCompass,
    displayCompassAndDegrees,
    formatF11,
    printCompassRose,
    rotationAngleInDegrees
} from "../util";

import CompareShips from "../game-tools/compare-ships";

/**
 * Journey
 */
export default class Journey {
    /**
     * @param {number} fontSize - Font size
     */
    constructor(fontSize) {
        this._fontSize = fontSize;

        this._compassRadius = 90;
        this._courseArrowWidth = 5;
        this._line = d3Line()
            .x(d => d[0])
            .y(d => d[1]);

        this._labelPadding = 20;

        this._degreesPerMinute = degreesPerSecond / 60;
        this._degreesSegment = 15;
        this._minOWSpeed = 2;
        this._owSpeedFactor = 2;

        this._speedScale = d3ScaleLinear().domain(d3Range(0, fullCircle, this._degreesSegment));

        this._defaultShipName = "None";
        this._defaultShipSpeed = 19;
        this._defaultStartWindDegrees = 0;

        this._baseName = "Make journey";
        this._baseId = "make-journey";
        this._buttonId = `button-${this._baseId}`;
        this._compassId = `compass-${this._baseId}`;
        this._deleteLastLegButtonId = `button-delete-leg-${this._baseId}`;
        this._modalId = `modal-${this._baseId}`;
        this._sliderId = `slider-${this._baseId}`;
        this._shipId = "ship-journey";
        this._woodId = "wood-journey";

        this._setupSummary();
        this._setupDrag();
        this._setupSvg();
        this._initJourneyData();
        this._setupListener();
    }

    _setupDrag() {
        // eslint-disable-next-line unicorn/consistent-function-scoping
        const dragStart = (d, i, nodes) => {
            this._removeLabels();
            d3Select(nodes[i]).classed("drag-active", true);
        };

        // eslint-disable-next-line unicorn/consistent-function-scoping
        const dragged = (d, i, nodes) => {
            // Set compass position
            if (i === 0) {
                this._compass.attr("x", d.position[0] + d3Event.dx).attr("y", d.position[1] + d3Event.dy);
            }

            d3Select(nodes[i])
                .attr("cx", d3Event.x)
                .attr("cy", d3Event.y);
            d.position = [d.position[0] + d3Event.dx, d.position[1] + d3Event.dy];
            this._printLines();
        };

        // eslint-disable-next-line unicorn/consistent-function-scoping
        const dragEnd = (d, i, nodes) => {
            d3Select(nodes[i]).classed("drag-active", false);
            //  this._journey.segment[i].position = [d.position[0] + d3Event.x, d.position[1] + d3Event.y];
            this._printJourney();
        };

        this._drag = d3Drag()
            .on("start", dragStart)
            .on("drag", dragged)
            .on("end", dragEnd);
    }

    _setupSvg() {
        const width = this._courseArrowWidth;
        const doubleWidth = this._courseArrowWidth * 2;

        this._g = d3Select("#na-svg")
            .insert("g", "g.pb")
            .attr("class", "journey");

        d3Select("#na-svg defs")
            .append("marker")
            .attr("id", "journey-arrow")
            .attr("viewBox", `0 -${width} ${doubleWidth} ${doubleWidth}`)
            .attr("refX", width)
            .attr("refY", 0)
            .attr("markerWidth", width)
            .attr("markerHeight", width)
            .attr("orient", "auto")
            .append("path")
            .attr("class", "journey-arrow-head")
            .attr("d", `M0,-${width}L${doubleWidth},0L0,${width}`);
    }

    _initJourneyData() {
        this._journey = {
            shipName: this._defaultShipName,
            woodNames: "",
            startWindDegrees: this._defaultStartWindDegrees,
            currentWindDegrees: this._defaultStartWindDegrees,
            totalDistance: 0,
            totalMinutes: 0,
            segment: [{ position: [null, null], label: "" }]
        };
    }

    _resetJourneyData() {
        this._journey.startWindDegrees = this._getStartWind();
        this._journey.currentWindDegrees = this._journey.startWindDegrees;
        this._journey.totalDistance = 0;
        this._journey.totalMinutes = 0;
    }

    _navbarClick(event) {
        registerEvent("Menu", "Journey");
        event.stopPropagation();
        this._journeySelected();
    }

    /**
     * Setup menu item listener
     * @returns {void}
     */
    _setupListener() {
        document.getElementById(`${this._buttonId}`).addEventListener("mouseup", event => this._navbarClick(event));
        document.getElementById(this._deleteLastLegButtonId).addEventListener("mouseup", () => this._deleteLastLeg());
    }

    _setupWindInput() {
        // workaround from https://github.com/soundar24/roundSlider/issues/71
        const { _getTooltipPos } = $.fn.roundSlider.prototype;
        $.fn.roundSlider.prototype._getTooltipPos = function() {
            if (!this.tooltip.is(":visible")) {
                $("body").append(this.tooltip);
            }

            const pos = _getTooltipPos.call(this);
            this.container.append(this.tooltip);
            return pos;
        };

        window.tooltip = arguments_ => `${displayCompass(arguments_.value)}<br>${arguments_.value}°`;

        $(`#${this._sliderId}`).roundSlider({
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
                this._currentWind = $(`#${this._sliderId}`).roundSlider("getValue");
            }
        });
    }

    _injectModal() {
        insertBaseModal(this._modalId, this._baseName, "sm");

        const body = d3Select(`#${this._modalId} .modal-body`);
        const formGroup = body
            .append("form")
            .append("div")
            .attr("class", "form-group");

        const slider = formGroup
            .append("div")
            .attr("class", "alert alert-primary")
            .attr("role", "alert");
        slider
            .append("label")
            .attr("for", this._sliderId)
            .text("Current in-game wind");
        slider
            .append("div")
            .attr("id", this._sliderId)
            .attr("class", "rslider");

        const shipId = `${this._shipId}-Base-select`;
        const shipAndWood = formGroup
            .append("div")
            .attr("class", "alert alert-primary")
            .attr("role", "alert");
        const div = shipAndWood.append("div").attr("class", "d-flex flex-column");
        div.append("label")
            .attr("for", shipId)
            .text("Ship and woods (optional)");
        div.append("select")
            .attr("name", shipId)
            .attr("id", shipId);
        ["frame", "trim"].forEach(type => {
            const woodId = `${this._woodId}-${type}-Base-select`;
            div.append("label").attr("for", woodId);
            div.append("select")
                .attr("name", woodId)
                .attr("id", woodId);
        });
    }

    /**
     * Init modal
     * @returns {void}
     */
    _initModal() {
        this._injectModal();
        this._setupWindInput();

        this._shipCompare = new CompareShips(this._shipId);
        this._shipCompare.CompareShipsInit();
    }

    _useUserInput() {
        this._resetJourneyData();
        this._journey.startWindDegrees = this._getStartWind();
        this._setShipName();
        this._printSummary();
        this._printJourney();
    }

    /**
     * Action when selected
     * @returns {void}
     */
    _journeySelected() {
        // If the modal has no content yet, insert it
        if (!document.getElementById(this._modalId)) {
            this._initModal();
        }

        // Show modal
        $(`#${this._modalId}`)
            .modal("show")
            .one("hidden.bs.modal", () => {
                this._useUserInput();
            });
    }

    _printCompass() {
        const x = this._journey.segment[0].position[0];
        const y = this._journey.segment[0].position[1];

        this._compass = this._g
            .append("svg")
            .attr("id", this._compassId)
            .attr("class", "compass")
            .attr("x", x)
            .attr("y", y)
            .call(this._drag);

        this._compassG = this._compass.append("g");
        printCompassRose({ element: this._compassG, radius: this._compassRadius });
    }

    _removeCompass() {
        this._compass.remove();
    }

    _getSpeedAtDegrees(degrees) {
        return Math.max(this._speedScale(degrees), this._minOWSpeed);
    }

    _calculateDistanceForSection(degreesCourse, degreesCurrentWind) {
        const degreesForSpeedCalc = (fullCircle - degreesCourse + degreesCurrentWind) % fullCircle;
        const speedCurrentSection = this._getSpeedAtDegrees(degreesForSpeedCalc) * this._owSpeedFactor;
        /*
        console.log(
            { degreesCourse },
            { degreesCurrentWind },
            { degreesForSpeedCalc },
            { speedCurrentSection },
            { speedCurrentSection * speedFactor }
        );
        */
        return speedCurrentSection * speedFactor;
    }

    _getStartWind() {
        const select$ = $(`#${this._sliderId}`);
        const currentUserWind = Number(select$.roundSlider("getValue"));
        // Current wind in correctionValueDegrees
        return select$.length ? currentUserWind : 0;
    }

    _setShipSpeed() {
        let speedDegrees = [];

        if (this._journey.shipName === this._defaultShipName) {
            // Dummy ship speed
            speedDegrees = [...new Array(24).fill(this._defaultShipSpeed / 2)];
        } else {
            ({ speedDegrees } = this._shipCompare._singleShipData);
        }

        this._speedScale.range(speedDegrees);
        // console.log(this._speedScale.range());
    }

    /**
     * Segregate each segment into sections, calculate per section speed and distance (each section takes one minute)
     * @param {number} courseDegrees - Ship course in correctionValueDegrees
     * @param {number} startWindDegrees - Wind at start of segment
     * @param {number} distanceSegment - Distance of segment
     * @return {number} - Minutes needed to travel the segment
     * @private
     */
    _calculateMinutesForSegment(courseDegrees, startWindDegrees, distanceSegment) {
        let distanceRemaining = distanceSegment;
        let currentWindDegrees = startWindDegrees;
        let totalMinutesSegment = 0;

        this._setShipSpeed();
        while (distanceRemaining > 0) {
            const distanceCurrentSection = this._calculateDistanceForSection(courseDegrees, currentWindDegrees);
            if (distanceRemaining > distanceCurrentSection) {
                distanceRemaining -= distanceCurrentSection;
                totalMinutesSegment += 1;
            } else {
                totalMinutesSegment += distanceRemaining / distanceCurrentSection;
                distanceRemaining = 0;
            }

            currentWindDegrees = (fullCircle + currentWindDegrees - this._degreesPerMinute) % fullCircle;

            // console.log({ distanceCurrentSection }, { totalMinutesSegment });
        }

        this._journey.currentWindDegrees = currentWindDegrees;

        return totalMinutesSegment;
    }

    _setShipName() {
        if (this._shipCompare && this._shipCompare._singleShipData && this._shipCompare._singleShipData.name) {
            const frameName = this._shipCompare._woodCompare.getWoodTypeData(
                "frame",
                this._shipCompare._woodCompare._woodsSelected.Base.frame
            ).name;
            const trimName = this._shipCompare._woodCompare.getWoodTypeData(
                "trim",
                this._shipCompare._woodCompare._woodsSelected.Base.trim
            ).name;
            this._journey.shipName = `${this._shipCompare._singleShipData.name}`;
            this._journey.woodNames = `${frameName}/${trimName}`;
        } else {
            this._journey.shipName = this._defaultShipName;
            this._journey.woodNames = "";
        }
    }

    /**
     * Remove label text boxes
     * @return {void}
     * @private
     */
    _removeLabels() {
        const label = this._g.selectAll("g.journey g.label");
        label.select("text").remove();
        label.select("rect").remove();
    }

    _correctJourney() {
        const defaultTranslate = 20;
        const currentTransform = d3ZoomTransform(d3Select("#na-svg").node());
        // Don't scale on higher zoom level
        const scale = Math.max(1, currentTransform.k);
        const fontSize = this._fontSize / scale;
        const textTransform = d3ZoomIdentity.translate(defaultTranslate / scale, defaultTranslate / scale);
        const textPadding = this._labelPadding / scale;
        const circleRadius = 10 / scale;
        const pathWidth = 5 / scale;

        /** Correct Text Box
         *  - split text into lines
         *  - correct box width
         *  - enlarge circles
         *  - remove last circle
         * {@link https://stackoverflow.com/a/13275930}
         * @param {object} d - Element
         * @param {number} i - Index
         * @param {object} nodes - Nodes
         * @return {void}
         */
        const correctTextBox = (d, i, nodes) => {
            // Split text into lines
            const node = d3Select(nodes[i]);
            const text = node.select("text");
            const lines = d.label.split("|");
            const lineHeight = fontSize * 1.3;

            text.text("")
                .attr("dy", 0)
                .attr("transform", textTransform)
                .style("font-size", `${fontSize}px`);
            lines.forEach((line, j) => {
                const tspan = text.append("tspan").html(line);
                if (j > 0) {
                    tspan.attr("x", 0).attr("dy", lineHeight);
                }
            });

            // Correct box width
            const bbText = text.node().getBBox();
            const width = d.label ? bbText.width + textPadding * 2 : 0;
            const height = d.label ? bbText.height + textPadding : 0;
            node.select("rect")
                .attr("width", width)
                .attr("height", height);

            // Enlarge circles
            const circle = node
                .select("circle")
                .attr("r", circleRadius)
                .attr("class", "");

            // Move circles down and visually above text box
            node.append(() => circle.remove().node());

            // Enlarge and hide first circle
            if (i === 0) {
                circle.attr("r", circleRadius * 4).attr("class", "drag-hidden");
            }

            // Hide last circle
            if (i === nodes.length - 1) {
                circle.attr("r", circleRadius).attr("class", "drag-hidden");
            }
        };

        // Correct text boxes
        this._g.selectAll("g.journey g.label").each(correctTextBox);
        // Correct journey stroke width
        if (this._gJourneyPath) {
            this._gJourneyPath.style("stroke-width", `${pathWidth}px`);
        }

        if (this._compassG) {
            this._compassG.attr("transform", `scale(${1 / scale})`);
        }
    }

    /**
     * Print labels
     * @private
     * @return {void}
     */
    _printLabels() {
        // Component used to render each label (take only single longest line)
        const textLabel = layoutTextLabel()
            .padding(this._labelPadding)
            .value(d => {
                const lines = d.label.split("|");
                // Find longest line (number of characters)
                const index = lines.reduce((p, c, i, a) => (a[p].length > c.length ? p : i), 0);
                return lines[index];
            });

        // Strategy that combines simulated annealing with removal of overlapping labels
        const strategy = layoutAnnealing();

        // Create the layout that positions the labels
        const labels = layoutLabel(strategy)
            .size((d, i, nodes) => {
                // measure the label and add the required padding
                const numberLines = d.label.split("|").length;
                const bbText = nodes[i].getElementsByTagName("text")[0].getBBox();
                return [bbText.width + this._labelPadding * 2, bbText.height * numberLines + this._labelPadding * 2];
            })
            .position(d => d.position)
            .component(textLabel);

        // Render
        this._g.datum(this._journey.segment.map(segment => segment)).call(labels);
    }

    _setupSummary() {
        // Main box
        this._divJourneySummary = d3Select("main #summary-column")
            .append("div")
            .attr("id", "journey-summary")
            .attr("class", "journey-summary d-none");

        // Selected ship
        this._journeySummaryShip = this._divJourneySummary.append("div").attr("class", "block small");
        this._journeySummaryTextWoods = this._journeySummaryShip.append("div");
        this._journeySummaryTextShip = this._journeySummaryShip.append("div");
        this._journeySummaryShip
            .append("div")
            .attr("class", "summary-des")
            .text("ship");

        // Wind direction
        this._journeySummaryWind = this._divJourneySummary.append("div").attr("class", "block small");
        this._journeySummaryTextWind = this._journeySummaryWind.append("div");
        this._journeySummaryWind
            .append("div")
            .attr("class", "summary-des")
            .text("wind");

        this._divJourneySummary
            .append("div")
            .attr("class", "block")
            .append("button")
            .attr("id", this._deleteLastLegButtonId)
            .attr("class", "btn btn-outline-primary btn-sm")
            .attr("role", "button")
            .text("Clear last leg");
    }

    _displaySummary(showJourneySummary) {
        this._divJourneySummary.classed("d-none", !showJourneySummary);
        d3Select("#port-summary").classed("d-none", showJourneySummary);
    }

    _showSummary() {
        this._displaySummary(true);
    }

    _hideSummary() {
        this._displaySummary(false);
    }

    _printSummaryShip() {
        this._journeySummaryTextWoods.text(this._journey.woodNames);
        this._journeySummaryTextShip.text(this._journey.shipName);
    }

    _printSummaryWind() {
        this._journeySummaryTextWind.html(`From ${displayCompassAndDegrees(this._journey.startWindDegrees)}`);
    }

    _printSummary() {
        this._printSummaryWind();
        this._printSummaryShip();
    }

    _printLines() {
        if (this._gJourneyPath) {
            this._gJourneyPath
                .datum(
                    this._journey.segment.length > 1
                        ? this._journey.segment.map(segment => segment.position)
                        : [[null, null]]
                )
                .attr("marker-end", "url(#journey-arrow)")
                .attr("d", this._line);
        }
    }

    _getTextDirection(courseCompass, courseDegrees, pt1) {
        return `${displayCompassAndDegrees(courseCompass, true)} \u2056 F11: ${formatF11(
            convertInvCoordX(pt1.x, pt1.y)
        )}\u202F/\u202F${formatF11(convertInvCoordY(pt1.x, pt1.y))}`;
    }

    static _pluralize(number, word) {
        return `${number} ${word + (number === 1 ? "" : "s")}`;
    }

    _getTextDistance(distanceK, minutes, addTotal) {
        function getHumanisedDuration(duration) {
            moment.locale("en-gb");

            const durationHours = Math.floor(duration / 60);
            const durationMinutes = Math.round(duration % 60);

            let s = "in ";
            if (duration < 1) {
                s += "less than a minute";
            } else {
                const hourString = durationHours === 0 ? "" : Journey._pluralize(durationHours, "hour");
                const minuteString = durationMinutes === 0 ? "" : Journey._pluralize(durationMinutes, "minute");
                s += hourString + (hourString === "" ? "" : " ") + minuteString;
            }

            return s;
        }

        let textDistance = `${Math.round(distanceK)}\u2009k ${getHumanisedDuration(minutes)}`;

        if (addTotal) {
            textDistance += ` \u2056 total ${Math.round(this._journey.totalDistance)}\u2009k ${getHumanisedDuration(
                this._journey.totalMinutes
            )}`;
        }

        return textDistance;
    }

    _setSegmentLabel(index = this._journey.segment.length - 1) {
        const pt1 = { x: this._journey.segment[index].position[0], y: this._journey.segment[index].position[1] };
        const pt2 = {
            x: this._journey.segment[index - 1].position[0],
            y: this._journey.segment[index - 1].position[1]
        };

        const courseDegrees = rotationAngleInDegrees(pt1, pt2);
        const distanceK = getDistance(pt1, pt2);
        const courseCompass = degreesToCompass(courseDegrees);

        const minutes = this._calculateMinutesForSegment(
            courseDegrees,
            this._journey.currentWindDegrees,
            distanceK * 1000
        );
        // console.log("*** start", this._journey.currentWindDegrees, { distanceK }, { courseCompass });
        this._journey.totalDistance += distanceK;
        this._journey.totalMinutes += minutes;
        const textDirection = this._getTextDirection(courseCompass, courseDegrees, pt1);
        const textDistance = this._getTextDistance(distanceK, minutes, index > 1);

        this._journey.segment[index].label = `${textDirection}|${textDistance}`;
        // console.log("*** end", this._journey);
    }

    _printSegment() {
        this._printLines();
        this._setSegmentLabel();
        this._printLabels();
        this._correctJourney();
        this._g.selectAll("g.journey g.label circle").call(this._drag);
    }

    _printJourney() {
        this._printLines();
        this._resetJourneyData();
        this._journey.segment.forEach((d, i) => {
            if (i < this._journey.segment.length - 1) {
                this._setSegmentLabel(i + 1);
            }
        });

        this._printLabels();
        this._correctJourney();
        this._g.selectAll("g.journey g.label circle").call(this._drag);
    }

    _deleteLastLeg() {
        this._journey.segment.pop();
        if (this._journey.segment.length) {
            this._printJourney();
        } else {
            this._g.selectAll("g.journey g.label").remove();
            this._gJourneyPath.remove();
            this._removeCompass();
            this._hideSummary();
            this._initJourneyData();
        }
    }

    _initJourney() {
        this._showSummary();
        this._printSummary();
        this._printCompass();
        this._gJourneyPath = this._g.append("path");
    }

    /* public */

    setSummaryPosition(topMargin, rightMargin) {
        this._divJourneySummary.style("top", `${topMargin}px`).style("right", `${rightMargin}px`);
    }

    plotCourse(x, y) {
        if (this._journey.segment[0].position[0]) {
            this._journey.segment.push({ position: [x, y], label: "" });
            this._printSegment();
        } else {
            this._journey.segment[0] = { position: [x, y], label: "" };
            this._initJourney();
        }
    }

    transform(transform) {
        this._g.attr("transform", transform);
        this._correctJourney();
    }
}
