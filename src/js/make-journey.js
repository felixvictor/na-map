/**
 * This file is part of na-map.
 *
 * @file      Make a journey.
 * @module    make-journey
 * @author    iB aka Felix Victor
 * @copyright 2018
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { layoutTextLabel, layoutAnnealing, layoutLabel } from "d3fc-label-layout";
import { range as d3Range } from "d3-array";
import { drag as d3Drag } from "d3-drag";
import { scaleLinear as d3ScaleLinear } from "d3-scale";
import { event as d3Event, select as d3Select } from "d3-selection";
import { line as d3Line } from "d3-shape";
import { zoomIdentity as d3ZoomIdentity, zoomTransform as d3ZoomTransform } from "d3-zoom";
import moment from "moment";
import "moment/locale/en-gb";
import "round-slider/src/roundslider";

import { compassDirections, degreesToCompass, rotationAngleInDegrees, formatF11 } from "./util";
import { registerEvent } from "./analytics";
import ShipCompare from "./ship-compare";
import WoodCompare from "./wood-compare";
import { convertInvCoordX, convertInvCoordY, getDistance, insertBaseModal, speedFactor } from "./common";

/**
 * Journey
 */
export default class Journey {
    /**
     * @param {object} shipData - Ship data
     * @param {object} woodData - Wood data
     * @param {number} fontSize - Font size
     * @param {number} topMargin - Top margin
     * @param {number} rightMargin - Right margin
     */
    constructor(shipData, woodData, fontSize, topMargin, rightMargin) {
        this._shipData = shipData;
        this._woodData = woodData;
        this._fontSize = fontSize;
        this._topMargin = topMargin;
        this._rightMargin = rightMargin;

        this._compassSize = 100;
        this._line = d3Line()
            .x(d => d[0])
            .y(d => d[1]);
        this._drag = d3Drag()
            .on("start", (d, i, nodes) => {
                this._removeLabels();
                d3Select(nodes[i]).classed("drag-active", true);
            })
            .on("drag", (d, i, nodes) => {
                // Set compass position
                if (i === 0) {
                    this._compass.attr("x", d.position[0] + d3Event.dx).attr("y", d.position[1] + d3Event.dy);
                }
                d3Select(nodes[i])
                    .attr("cx", d3Event.x)
                    .attr("cy", d3Event.y);
                // eslint-disable-next-line no-param-reassign
                d.position = [d.position[0] + d3Event.dx, d.position[1] + d3Event.dy];
                this._printLines();
            })
            .on("end", (d, i, nodes) => {
                d3Select(nodes[i]).classed("drag-active", false);
                //  this._journey.segment[i].position = [d.position[0] + d3Event.x, d.position[1] + d3Event.y];
                this._printJourney();
            });

        this._labelPadding = 20;

        this._minutesForFullCircle = 48;
        this._fullCircle = 360;
        this._degreesPerMinute = this._fullCircle / this._minutesForFullCircle;
        this._degreesSegment = 15;
        this._minOWSpeed = 2;
        this._owSpeedFactor = 2;

        this._speedScale = d3ScaleLinear().domain(d3Range(0, this._fullCircle, this._degreesSegment));

        this._defaultShipName = "None";
        this._defaultShipSpeed = 19;
        this._defaultStartWindDegrees = 0;
        this._setupSummary();
        this._setupSvg();

        this._baseName = "Make journey";
        this._baseId = "make-journey";
        this._buttonId = `button-${this._baseId}`;
        this._modalId = `modal-${this._baseId}`;
        this._shipId = "ship-journey";
        this._woodId = "wood-journey";
        this._initJourney();
        this._setupListener();
    }

    _setupSvg() {
        this._g = d3Select("#na-svg")
            .insert("g", "g.pb")
            .classed("coord", true);

        d3Select("#na-svg defs")
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

    _initJourney() {
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

    _resetJourney() {
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
        document.getElementById("journeyNavbar").addEventListener("click", event => this._navbarClick(event));
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

    _injectModal() {
        insertBaseModal(this._modalId, this._baseName, "sm");

        const body = d3Select(`#${this._modalId} .modal-body`);
        const slider = body
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

        body.append("p")
            .attr("class", "form-text")
            .text("2. Set ship");
        const shipId = `${this._shipId}-Base-select`;
        const div = body.append("div").attr("class", "d-flex flex-column");
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

    /**
     * Init modal
     * @returns {void}
     */
    _initModal() {
        this._injectModal();
        this._setupWindInput();
        this._shipCompare = new ShipCompare(this._shipData, this._woodData, this._shipId);
        this._woodCompare = new WoodCompare(this._woodData, this._woodId);
    }

    _useUserInput() {
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
            .on("hidden.bs.modal", () => {
                this._useUserInput();
            });
    }

    _printCompass() {
        const x = this._journey.segment[0].position[0],
            y = this._journey.segment[0].position[1];
        this._compass = this._g
            .append("image")
            .classed("compass", true)
            .attr("x", x)
            .attr("y", y)
            .attr("transform", `translate(${-this._compassSize / 2},${-this._compassSize / 2})`)
            .attr("height", this._compassSize)
            .attr("width", this._compassSize)
            .attr("xlink:href", "icons/compass.svg");
        this._gJourneyPath = this._g.append("path");
    }

    _getSpeedAtDegrees(degrees) {
        return Math.max(this._speedScale(degrees), this._minOWSpeed);
    }

    _calculateDistanceForSection(degreesCourse, degreesCurrentWind) {
        const degreesForSpeedCalc = (this._fullCircle - degreesCourse + degreesCurrentWind) % this._fullCircle,
            speedCurrentSection = this._getSpeedAtDegrees(degreesForSpeedCalc) * this._owSpeedFactor,
            distanceCurrentSection = speedCurrentSection * speedFactor;
        /*
        console.log(
            { degreesCourse },
            { degreesCurrentWind },
            { degreesForSpeedCalc },
            { speedCurrentSection },
            { distanceCurrentSection }
        );
        */
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
        let speedDegrees = [];

        if (this._journey.shipName === this._defaultShipName) {
            // Dummy ship speed
            speedDegrees = Array.from(Array(24).fill(this._defaultShipSpeed / 2));
        } else {
            ({ speedDegrees } = this._shipCompare._singleShipData);
        }
        this._speedScale.range(speedDegrees);
        console.log(this._speedScale.range());
    }

    /**
     * Segregate each segment into sections, calculate per section speed and distance (each section takes one minute)
     * @param {number} courseDegrees - Ship course in degrees
     * @param {number} startWindDegrees - Wind at start of segment
     * @param {number} distanceSegment - Distance of segment
     * @return {number} - Minutes needed to travel the segment
     * @private
     */
    _calculateMinutesForSegment(courseDegrees, startWindDegrees, distanceSegment) {
        let distanceRemaining = distanceSegment,
            currentWindDegrees = startWindDegrees,
            totalMinutesSegment = 0;

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
            currentWindDegrees = (this._fullCircle + currentWindDegrees - this._degreesPerMinute) % this._fullCircle;

            // console.log({ distanceCurrentSection }, { totalMinutesSegment });
        }
        this._journey.currentWindDegrees = currentWindDegrees;

        return totalMinutesSegment;
    }

    _setShipName() {
        if (
            typeof this._shipCompare !== "undefined" &&
            typeof this._shipCompare._singleShipData !== "undefined" &&
            typeof this._shipCompare._singleShipData.name !== "undefined"
        ) {
            this._journey.shipName = `${this._shipCompare._singleShipData.name}`;
            this._journey.woodNames = `${this._shipCompare._woodCompare._woodsSelected.Base.frame}/${
                this._shipCompare._woodCompare._woodsSelected.Base.trim
            }`;
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
        const label = this._g.selectAll("g.coord g.label");
        label.select("text").remove();
        label.select("rect").remove();
    }

    _correctJourney() {
        const defaultTranslate = 20,
            currentTransform = d3ZoomTransform(d3Select("#na-svg").node()),
            // Don't scale on higher zoom level
            scale = Math.max(1, currentTransform.k),
            fontSize = this._fontSize / scale,
            compassSize=this._compassSize/scale,
            textTransform = d3ZoomIdentity.translate(defaultTranslate / scale, defaultTranslate / scale),
            textPadding = this._labelPadding / scale,
            circleRadius = 10 / scale,
            pathWidth = 5 / scale;

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
            const node = d3Select(nodes[i]),
                text = node.select("text"),
                lines = d.label.split("|"),
                lineHeight = fontSize * 1.3;

            text.text("")
                .attr("dy", 0)
                .attr("transform", textTransform)
                .style("font-size", `${fontSize}px`);
            lines.forEach((line, j) => {
                const tspan = text.append("tspan").text(line);
                if (j > 0) {
                    tspan.attr("x", 0).attr("dy", lineHeight);
                }
            });

            // Correct box width
            const bbText = text.node().getBBox(),
                width = d.label ? bbText.width + textPadding * 2 : 0,
                height = d.label ? bbText.height + textPadding : 0;
            node.select("rect")
                .attr("width", width)
                .attr("height", height);

            // Enlarge circles
            const circle = node
                .select("circle")
                .attr("r", circleRadius)
                .attr("class", "");

            // Move circles above text box
            node.append(() => circle.remove().node());

            // Remove last circle
            if (i === 0 || i === nodes.length - 1) {
                circle.attr("r", 20).attr("class", "drag-hidden");
            }
        };

        // Correct text boxes
        this._g.selectAll("g.coord g.label").each(correctTextBox);
        // Correct journey stroke width
        if (this._gJourneyPath) {
            this._gJourneyPath.style("stroke-width", `${pathWidth}px`);
        }
        if(this._compass) {
            this._compass
            .attr("transform", `translate(${-compassSize / 2},${-compassSize / 2})`)
                .attr("height", compassSize)
                .attr("width", compassSize);
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
                const lines = d.label.split("|"),
                    // Find longest line (number of characters)
                    index = lines.reduce((p, c, i, a) => (a[p].length > c.length ? p : i), 0);
                return lines[index];
            });

        // Strategy that combines simulated annealing with removal of overlapping labels
        const strategy = layoutAnnealing();

        // Create the layout that positions the labels
        const labels = layoutLabel(strategy)
            .size((d, i, nodes) => {
                // measure the label and add the required padding
                const numberLines = d.label.split("|").length,
                    bbText = nodes[i].getElementsByTagName("text")[0].getBBox();
                return [bbText.width + this._labelPadding * 2, bbText.height * numberLines + this._labelPadding * 2];
            })
            .position(d => d.position)
            .component(textLabel);

        // Render
        this._g.datum(this._journey.segment.map(segment => segment)).call(labels);
    }

    _setupSummary() {
        this._svgJourneySummary = d3Select("body")
            .append("svg")
            .attr("id", "journey-summary")
            .classed("summary", true)
            .classed("hidden", true)
            .style("position", "absolute")
            .style("top", `${this._topMargin}px`)
            .style("right", `${this._rightMargin}px`);

        // Background
        const journeySummaryRect = this._svgJourneySummary
            .insert("rect")
            .attr("x", 0)
            .attr("y", 0);

        // Wind direction
        this._journeySummaryTextWind = this._svgJourneySummary.append("text");
        const journeySummaryTextWindDes = this._svgJourneySummary
            .append("text")
            .classed("des", true)
            .text("wind direction");

        // Selected ship
        this._journeySummaryTextShip = this._svgJourneySummary.append("text");
        this._journeySummaryTextWoods = this._svgJourneySummary.append("text");
        const journeySummaryTextShipDes = this._svgJourneySummary
            .append("text")
            .classed("des", true)
            .text("selected ship");

        const bboxShipDes = journeySummaryTextShipDes.node().getBoundingClientRect(),
            bboxWindDes = journeySummaryTextWindDes.node().getBoundingClientRect(),
            lineHeight = parseInt(
                window.getComputedStyle(document.getElementById("na-svg")).getPropertyValue("line-height"),
                10
            );
        const height = lineHeight * 4,
            width = bboxShipDes.width * 2 + bboxWindDes.width + this._fontSize * 4,
            firstLine = "25%",
            secondLine = "50%",
            thirdLine = "75%",
            firstBlock = this._fontSize * 2,
            secondBlock = Math.round(firstBlock + bboxShipDes.width * 2 + firstBlock / 2);

        this._svgJourneySummary.attr("height", height).attr("width", width);
        journeySummaryRect.attr("height", height).attr("width", width);

        this._journeySummaryTextWoods.attr("x", firstBlock).attr("y", firstLine);
        this._journeySummaryTextShip.attr("x", firstBlock).attr("y", secondLine);
        journeySummaryTextShipDes.attr("x", firstBlock).attr("y", thirdLine);

        this._journeySummaryTextWind.attr("x", secondBlock).attr("y", secondLine);
        journeySummaryTextWindDes.attr("x", secondBlock).attr("y", thirdLine);
    }

    _displaySummary(toShow) {
        this._svgJourneySummary.classed("hidden", !toShow);
        d3Select("#port-summary").classed("hidden", toShow);
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
        this._journeySummaryTextWind.text(`From ${degreesToCompass(this._journey.startWindDegrees)}`);
    }

    _printSummary() {
        this._printSummaryWind();
        this._printSummaryShip();
    }

    _printLines() {
        this._gJourneyPath
            .datum(
                this._journey.segment.length > 1
                    ? this._journey.segment.map(segment => segment.position)
                    : [[null, null]]
            )
            .attr("marker-end", "url(#course-arrow)")
            .attr("d", this._line);
    }

    _getTextDirection(courseCompass, courseDegrees, pt1) {
        return `${courseCompass} (${Math.round(courseDegrees)}°) \u2606 F11: ${formatF11(
            convertInvCoordX(pt1.x, pt1.y)
        )}\u202f/\u202f${formatF11(convertInvCoordY(pt1.x, pt1.y))}`;
    }

    _getTextDistance(distanceK, minutes, addTotal) {
        const duration = moment.duration(minutes, "minutes").humanize(true);
        let textDistance = `${Math.round(distanceK)}k ${duration}`;

        if (addTotal) {
            const totalDuration = moment.duration(this._journey.totalMinutes, "minutes").humanize(true);
            textDistance += ` \u2606 total ${Math.round(this._journey.totalDistance)}k ${totalDuration}`;
        }
        return textDistance;
    }

    _setSegmentLabel(index = this._journey.segment.length - 1) {
        const pt1 = { x: this._journey.segment[index].position[0], y: this._journey.segment[index].position[1] },
            pt2 = { x: this._journey.segment[index - 1].position[0], y: this._journey.segment[index - 1].position[1] };

        const courseDegrees = rotationAngleInDegrees(pt1, pt2),
            distanceK = getDistance(pt1, pt2),
            courseCompass = degreesToCompass(courseDegrees);

        const minutes = this._calculateMinutesForSegment(
            courseDegrees,
            this._journey.currentWindDegrees,
            distanceK * 1000
        );
        console.log("*** start", this._journey.currentWindDegrees, { distanceK }, { courseCompass });
        this._journey.totalDistance += distanceK;
        this._journey.totalMinutes += minutes;
        const textDirection = this._getTextDirection(courseCompass, courseDegrees, pt1),
            textDistance = this._getTextDistance(distanceK, minutes, index > 1);

        this._journey.segment[index].label = `${textDirection}|${textDistance}`;
        console.log("*** end", this._journey);
    }

    _printSegment() {
        this._printLines();
        this._setSegmentLabel();
        this._printLabels();
        this._correctJourney();
        this._g.selectAll("g.coord g.label circle").call(this._drag);
    }

    _printJourney() {
        this._printLines();
        this._resetJourney();
        this._journey.segment.forEach((d, i) => {
            if (i < this._journey.segment.length - 1) {
                this._setSegmentLabel(i + 1);
            }
        });

        this._printLabels();
        this._correctJourney();
        this._g.selectAll("g.coord g.label circle").call(this._drag);
    }

    /* public */
    plotCourse(x, y) {
        if (!this._journey.segment[0].position[0]) {
            this.clearMap();
            this._journey.segment[0] = { position: [x, y], label: "" };
            this._resetJourney();
            this._showSummary();
            this._printSummary();
            this._printCompass();
        } else {
            this._journey.segment.push({ position: [x, y], label: "" });
            this._printSegment();
        }
    }

    transform(transform) {
        this._g.attr("transform", transform);
        this._correctJourney();
    }

    clearMap() {
        this._initJourney();
        this._hideSummary();
        this._g.selectAll("*").remove();
    }
}
