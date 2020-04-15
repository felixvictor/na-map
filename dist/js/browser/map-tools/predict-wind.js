/*!
 * This file is part of na-map.
 *
 * @file      Predict wind.
 * @module    map-tools/predict-wind
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import "bootstrap/js/dist/util";
import "bootstrap/js/dist/modal";
import { select as d3Select } from "d3-selection";
import { line as d3Line } from "d3-shape";
import moment from "moment";
import "moment/locale/en-gb";
import "round-slider/src/roundslider";
import "round-slider/src/roundslider.css";
import "../../../scss/roundslider.scss";
import "tempusdominus-bootstrap-4/build/js/tempusdominus-bootstrap-4";
import "tempusdominus-core/build/js/tempusdominus-core";
import { registerEvent } from "../analytics";
import { degreesPerSecond, insertBaseModal } from "../../common/common-browser";
import { compassDirections, compassToDegrees, degreesToCompass, degreesToRadians } from "../../common/common-math";
import { displayCompass, displayCompassAndDegrees, getUserWind, printCompassRose } from "../util";
export default class PredictWind {
    constructor() {
        this._height = 300;
        this._width = 260;
        this._windArrowWidth = 3;
        this._baseName = "Predict wind";
        this._baseId = "predict-wind";
        this._buttonId = `button-${this._baseId}`;
        this._modalId = `modal-${this._baseId}`;
        this._formId = `form-${this._baseId}`;
        this._sliderId = `slider-${this._baseId}`;
        this._timeGroupId = `input-group-${this._baseId}`;
        this._timeInputId = `input-${this._baseId}`;
        this._setupSvg();
        this._setupArrow();
        this._setupListener();
    }
    _setupSvg() {
        this._svg = d3Select("#wind svg");
    }
    _setupArrow() {
        const width = this._windArrowWidth;
        const doubleWidth = this._windArrowWidth * 2;
        d3Select("#na-svg defs")
            .append("marker")
            .attr("id", "wind-arrow")
            .attr("viewBox", `0 -${width} ${doubleWidth} ${doubleWidth}`)
            .attr("refX", width)
            .attr("refY", 0)
            .attr("markerWidth", width)
            .attr("markerHeight", width)
            .attr("orient", "auto")
            .append("path")
            .attr("d", `M0,-${width}L${doubleWidth},0L0,${width}`)
            .attr("class", "wind-predict-arrow-head");
    }
    _navbarClick(event) {
        registerEvent("Menu", this._baseName);
        event.stopPropagation();
        this._windSelected();
    }
    _setupListener() {
        var _a;
        (_a = document.querySelector(`#${this._buttonId}`)) === null || _a === void 0 ? void 0 : _a.addEventListener("click", (event) => this._navbarClick(event));
    }
    _setupWindInput() {
        const _getTooltipPos = $.fn.roundSlider.prototype._getTooltipPos;
        $.fn.roundSlider.prototype._getTooltipPos = function () {
            if (!this.tooltip.is(":visible")) {
                $("body").append(this.tooltip);
            }
            const pos = _getTooltipPos.call(this);
            this.container.append(this.tooltip);
            return pos;
        };
        window.tooltip = (arguments_) => `${displayCompass(arguments_.value)}<br>${String(arguments_.value)}°`;
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
        });
    }
    _injectModal() {
        moment.locale("en-gb");
        insertBaseModal({ id: this._modalId, title: this._baseName, size: "sm" });
        const body = d3Select(`#${this._modalId} .modal-body`);
        const form = body.append("form").attr("id", this._formId);
        const formGroupA = form.append("div").attr("class", "form-group");
        const slider = formGroupA.append("div").classed("alert alert-primary", true);
        slider.append("label").attr("for", this._sliderId).text("Current in-game wind");
        slider.append("div").attr("id", this._sliderId).attr("class", "rslider");
        const formGroupB = form.append("div").attr("class", "form-group");
        const block = formGroupB.append("div").attr("class", "alert alert-primary");
        block.append("label").attr("for", this._timeInputId).text("Predict time (server time)");
        const inputGroup = block
            .append("div")
            .classed("input-group date", true)
            .attr("id", this._timeGroupId)
            .attr("data-target-input", "nearest");
        inputGroup
            .append("input")
            .classed("form-control datetimepicker-input", true)
            .attr("type", "text")
            .attr("id", this._timeInputId)
            .attr("data-target", `#${this._timeGroupId}`)
            .attr("aria-label", this._timeGroupId)
            .attr("required", "");
        inputGroup
            .append("div")
            .classed("input-group-append", true)
            .attr("data-target", `#${this._timeGroupId}`)
            .attr("data-toggle", "datetimepicker")
            .append("span")
            .attr("class", "input-group-text")
            .append("i")
            .attr("class", "icon icon-clock");
        $(`#${this._timeGroupId}`).datetimepicker({
            defaultDate: moment.utc(),
            format: "LT",
        });
    }
    _initModal() {
        this._injectModal();
        this._setupWindInput();
    }
    _windSelected() {
        if (!document.querySelector(`#${this._modalId}`)) {
            this._initModal();
        }
        $(`#${this._modalId}`)
            .modal("show")
            .one("hidden.bs.modal", () => {
            this._useUserInput();
        });
    }
    _useUserInput() {
        const currentWind = getUserWind(this._sliderId);
        const time = $(`#${this._timeInputId}`).val().trim();
        this._predictWind(currentWind, time);
    }
    _predictWind(currentUserWind, predictUserTime) {
        moment.locale("en-gb");
        const timeFormat = "H.mm";
        let currentWindDegrees;
        const regex = /(\d+)[\s.:](\d+)/;
        const match = regex.exec(predictUserTime);
        const predictHours = Number.parseInt(match[1], 10);
        const predictMinutes = Number.parseInt(match[2], 10);
        if (Number.isNaN(Number(currentUserWind))) {
            currentWindDegrees = compassToDegrees(String(currentUserWind));
        }
        else {
            currentWindDegrees = Number(currentUserWind);
        }
        const currentTime = moment().utc().seconds(0).milliseconds(0);
        const predictTime = moment(currentTime).hour(predictHours).minutes(predictMinutes);
        if (predictTime.isBefore(currentTime)) {
            predictTime.add(1, "day");
        }
        const timeDiffInSec = predictTime.diff(currentTime, "seconds");
        const predictedWindDegrees = 360 + ((currentWindDegrees - degreesPerSecond * timeDiffInSec) % 360);
        this._printPredictedWind(predictedWindDegrees, predictTime.format(timeFormat), degreesToCompass(currentUserWind), currentTime.format(timeFormat));
    }
    _printCompass(predictedWindDegrees) {
        const line = d3Line();
        const radius = Math.min(this._height / 1.4, this._width / 1.4) / 2;
        const xCompass = this._width / 2;
        const yCompass = this._height / 2.8;
        const radians = degreesToRadians(predictedWindDegrees);
        const length = radius * 0.6;
        const dx = length * Math.cos(radians);
        const dy = length * Math.sin(radians);
        const lineData = [
            [Math.round(xCompass + dx), Math.round(yCompass + dy)],
            [Math.round(xCompass - dx), Math.round(yCompass - dy)],
        ];
        this._svg.attr("height", this._height).attr("width", this._width);
        const compassElem = this._svg.append("svg").attr("class", "compass").attr("x", xCompass).attr("y", yCompass);
        printCompassRose({ element: compassElem, radius });
        this._svg.append("path").datum(lineData).attr("d", line).attr("marker-end", "url(#wind-arrow)");
    }
    _printText(predictedWindDegrees, predictTime, currentWind, currentTime) {
        var _a, _b;
        const compass = degreesToCompass(predictedWindDegrees);
        const lineHeight = Number.parseInt(window.getComputedStyle(document.querySelector("#wind")).getPropertyValue("line-height"), 10);
        const textSvg = this._svg.append("svg");
        const text1 = textSvg
            .append("text")
            .attr("x", "50%")
            .attr("y", "33%")
            .html(`From ${displayCompassAndDegrees(compass, true)} at ${predictTime}`);
        const text2 = textSvg
            .append("text")
            .attr("x", "50%")
            .attr("y", "66%")
            .attr("class", "text-light-separation")
            .html(`Currently at ${currentTime} from ${displayCompassAndDegrees(currentWind, true)}`);
        const bbox1 = (_a = text1.node()) === null || _a === void 0 ? void 0 : _a.getBoundingClientRect();
        const bbox2 = (_b = text2.node()) === null || _b === void 0 ? void 0 : _b.getBoundingClientRect();
        const textHeight = Math.max(Number(bbox1 === null || bbox1 === void 0 ? void 0 : bbox1.height), Number(bbox2 === null || bbox2 === void 0 ? void 0 : bbox2.height)) * 2 + lineHeight;
        const textWidth = Math.max(Number(bbox1 === null || bbox1 === void 0 ? void 0 : bbox1.width), Number(bbox2 === null || bbox2 === void 0 ? void 0 : bbox2.width)) + lineHeight;
        textSvg
            .attr("x", (this._width - textWidth) / 2)
            .attr("y", "72%")
            .attr("height", textHeight)
            .attr("width", textWidth);
    }
    _addBackground() {
        this._svg
            .insert("rect", ":first-child")
            .attr("x", 0)
            .attr("y", 0)
            .attr("height", this._height)
            .attr("width", this._width);
    }
    _printPredictedWind(predictedWindDegrees, predictTime, currentWind, currentTime) {
        this.clearMap();
        this._svg.classed("d-none", false);
        this._printCompass(predictedWindDegrees);
        this._printText(predictedWindDegrees, predictTime, currentWind, currentTime);
        this._addBackground();
    }
    setPosition(topMargin, leftMargin) {
        this._svg.style("margin-left", `${leftMargin}px`).style("margin-top", `${topMargin}px`);
    }
    clearMap() {
        this._svg.selectAll("*").remove();
        this._svg.classed("d-none", true);
    }
}
//# sourceMappingURL=predict-wind.js.map