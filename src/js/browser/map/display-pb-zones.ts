/*!
 * This file is part of na-map.
 *
 * @file      Display port battle zones.
 * @module    map/display-pb-zones
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2022
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { select as d3Select, Selection } from "d3-selection"

import { getServerType, ServerId, ServerType } from "common/servers"
import { drawSvgCircle, drawSvgRect } from "../util"
import Cookie from "util/cookie"
import RadioButton from "util/radio-button"

import DisplayPorts from "./display-ports"

import { PbZone, PbZoneBasic, PbZoneDefence, PbZoneRaid } from "common/gen-json"
import { Extent, Point } from "common/common-math"

export default class DisplayPbZones {
    readonly #fortRangeRadius = 12
    readonly #towerRangeRadius = 10
    showPB: string
    #serverType: ServerType
    #lowerBound = {} as Point
    #upperBound = {} as Point
    private readonly _ports!: DisplayPorts
    private readonly _showId: string
    private readonly _showValues: string[]
    private readonly _showCookie: Cookie
    private readonly _showRadios: RadioButton
    private _isDataLoaded: boolean
    private _pbZonesDefault!: PbZone[]
    private _defencesFiltered!: PbZoneDefence[]
    private _pbZonesFiltered!: PbZoneBasic[]
    private _raidZonesFiltered!: PbZoneRaid[]
    private _g!: Selection<SVGGElement, unknown, HTMLElement, unknown>

    constructor(ports: DisplayPorts, serverId: ServerId) {
        this._ports = ports
        this.#serverType = getServerType(serverId)

        this._showId = "show-zones"

        /**
         * Possible values for show port battle zones radio buttons (first is default value)
         */
        this._showValues = ["pb-all", "pb-single", "raid-all", "raid-single", "off"]

        /**
         * Show port battle zones cookie
         */
        this._showCookie = new Cookie({ id: this._showId, values: this._showValues })

        /**
         * Show port battle zones radio buttons
         */
        this._showRadios = new RadioButton(this._showId, this._showValues)

        /**
         * Get showLayer setting from cookie or use default value
         */
        this.showPB = this._getShowPBSetting()

        this._isDataLoaded = false

        this._setupSvg()
        this._setupListener()
    }

    _setupSvg(): void {
        this._g = d3Select<SVGSVGElement, unknown>("#map").insert<SVGGElement>("g", "#ports").attr("class", "pb")
    }

    async _loadData(): Promise<void> {
        this._pbZonesDefault = (
            await import(/* webpackChunkName: "data-pb-zones" */ "../../../../lib/gen-generic/pb-zones.json")
        ).default as PbZone[]
    }

    _setupListener(): void {
        document.querySelector(`#${this._showId}`)?.addEventListener("change", () => {
            this._showPBZonesSelected()
        })
    }

    /**
     * Get show setting from cookie or use default value
     * @returns Show setting
     */
    _getShowPBSetting(): string {
        const r = this._showCookie.get()

        this._showRadios.set(r)

        return r
    }

    _refreshPBZones(): void {
        void this.refresh()
        this._ports.portNamesUpdate()
    }

    _showPBZonesSelected(): void {
        this.showPB = this._showRadios.get()

        this._showCookie.set(this.showPB)
        this._refreshPBZones()
    }

    _update(): void {
        this._g
            .selectAll<SVGGElement, PbZoneBasic>("g.pb-zones")
            .data(this._pbZonesFiltered, (d) => String(d.id))
            .join((enter): Selection<SVGGElement, PbZoneBasic, SVGGElement, unknown> => {
                const g = enter.append("g").attr("class", "pb-zones text-tiny")

                // Port battle join circles
                g.append("path")
                    .attr("class", "stroke-primary-light")
                    .attr(
                        "d",
                        (d) =>
                            drawSvgCircle(d.joinCircle[0], d.joinCircle[1], 28) +
                            drawSvgCircle(d.joinCircle[0], d.joinCircle[1], 14)
                    )

                // Port battle circles
                g.append("path")
                    .attr("class", "fill-primary-dark")
                    .attr("d", (d) =>
                        d.pbCircles.map((pbCircle) => drawSvgCircle(pbCircle[0], pbCircle[1], 3.5)).join("")
                    )
                g.append("text")
                    .attr("class", "svg-text-center fill-white")
                    .attr("x", (d) => d.pbCircles.map((pbCircle) => pbCircle[0]).join(","))
                    .attr("y", (d) => d.pbCircles.map((pbCircle) => pbCircle[1]).join(","))
                    .text((d) => d.pbCircles.map((pbCircle, i) => String.fromCodePoint(65 + i)).join(""))

                // Spawn points
                if (this.#serverType === "PVP") {
                    g.append("path")
                        .attr("class", "fill-primary-light")
                        .attr("d", (d) =>
                            d.spawnPoints.map((spawnPoint) => drawSvgCircle(spawnPoint[0], spawnPoint[1], 3.5)).join("")
                        )
                    g.append("text")
                        .attr("class", "svg-text-center fill-text")
                        .attr("x", (d) => d.spawnPoints.map((spawnPoint) => spawnPoint[0]).join(","))
                        .attr("y", (d) => d.spawnPoints.map((spawnPoint) => spawnPoint[1]).join(","))
                        .text((d) => d.spawnPoints.map((spawnPoint, i) => String.fromCodePoint(88 + i)).join(""))
                }

                return g
            })

        const fortSize = 3
        const towerSize = 1.5
        this._g
            .selectAll<SVGGElement, PbZoneDefence>("g.defence")
            .data(this._defencesFiltered, (d) => String(d.id))
            .join((enter): Selection<SVGGElement, PbZoneDefence, SVGGElement, unknown> => {
                const g = enter.append("g").attr("class", "defence svg-text-center fill-white text-tiny")

                // Shooting ranges
                g.selectAll<SVGPathElement, Point[]>("path.tower-range")
                    .data((d) => d.towers)
                    .join((enter) =>
                        enter
                            .append("path")
                            .attr("class", "tower-range background-primary-light")
                            .attr("d", (d) => drawSvgCircle(d[0], d[1], this.#towerRangeRadius))
                    )
                g.selectAll<SVGPathElement, Point[]>("path.fort-range")
                    .data((d) => d.forts)
                    .join((enter) =>
                        enter
                            .append("path")
                            .attr("class", "fort-range background-red")
                            .attr("d", (d) => drawSvgCircle(d[0], d[1], this.#fortRangeRadius))
                    )

                // Forts
                g.append("path")
                    .attr("class", "fort fill-red")
                    .attr("d", (d) => d.forts.map((fort) => drawSvgRect(fort[0], fort[1], fortSize)).join(""))
                g.append("text")
                    .attr("class", "svg-text-center fill-white")
                    .attr("x", (d) => d.forts.map((fort) => fort[0]).join(","))
                    .attr("y", (d) => d.forts.map((fort) => fort[1]).join(","))
                    .text((d) => d.forts.map((fort, i) => `${i + 1}`).join(""))

                // Towers
                g.append("path")
                    .attr("class", "tower fill-dark")
                    .attr("d", (d) => d.towers.map((tower) => drawSvgCircle(tower[0], tower[1], towerSize)).join(""))
                g.append("text")
                    .attr("class", "svg-text-center fill-white")
                    .attr("x", (d) => d.towers.map((tower) => tower[0]).join(","))
                    .attr("y", (d) => d.towers.map((tower) => tower[1]).join(","))
                    .text((d) => d.towers.map((tower, i) => `${i + 1}`).join(""))

                return g
            })

        this._g
            .selectAll<SVGGElement, PbZoneRaid>("g.raid-zones")
            .data(this._raidZonesFiltered, (d) => String(d.id))
            .join((enter): Selection<SVGGElement, PbZoneRaid, SVGGElement, unknown> => {
                const g = enter.append("g").attr("class", "raid-zones text-tiny")

                // Raid join circles
                g.append("path")
                    .attr("class", "stroke-primary-light")
                    .attr("d", (d) => drawSvgCircle(d.joinCircle[0], d.joinCircle[1], 35))

                // Raid circles
                g.append("path")
                    .attr("class", "fill-primary-dark")
                    .attr("d", (d) =>
                        d.raidCircles.map((raidCircle) => drawSvgCircle(raidCircle[0], raidCircle[1], 4.5)).join("")
                    )
                g.append("text")
                    .attr("class", "svg-text-center fill-white")
                    .attr("x", (d) => d.raidCircles.map((raidCircle) => raidCircle[0]).join(","))
                    .attr("y", (d) => d.raidCircles.map((raidCircle) => raidCircle[1]).join(","))
                    .text((d) => d.raidCircles.map((raidCircle, i) => String.fromCodePoint(65 + i)).join(""))

                // Raid points
                g.append("path")
                    .attr("class", "fill-primary-light")
                    .attr("d", (d) =>
                        d.raidPoints.map((raidPoint) => drawSvgCircle(raidPoint[0], raidPoint[1], 1.5)).join("")
                    )
                g.append("text")
                    .attr("class", "svg-text-center fill-text")
                    .attr("x", (d) => d.raidPoints.map((raidPoint) => raidPoint[0]).join(","))
                    .attr("y", (d) => d.raidPoints.map((raidPoint) => raidPoint[1]).join(","))
                    .text((d) => d.raidPoints.map((raidPoint, i) => String.fromCodePoint(49 + i)).join(""))
                return g
            })
    }

    _isPortIn(d: PbZone): boolean {
        return (
            this.showPB === "pb-all" ||
            this.showPB === "raid-all" ||
            ((this.showPB === "pb-single" || this.showPB === "raid-single") &&
                Number(d.id) === this._ports.currentPort.id)
        )
    }

    async _setData(): Promise<void> {
        if (this._ports.zoomLevel === "pbZone" && this.showPB !== "off") {
            if (!this._isDataLoaded) {
                await this._loadData()
                this._isDataLoaded = true
            }

            this._filterVisible()
        } else {
            this._defencesFiltered = []
            this._pbZonesFiltered = []
            this._raidZonesFiltered = []
        }
    }

    _filterVisible(): void {
        const portsFiltered = this._pbZonesDefault
            .filter(
                (port) =>
                    port.position[0] >= this.#lowerBound[0] &&
                    port.position[0] <= this.#upperBound[0] &&
                    port.position[1] >= this.#lowerBound[1] &&
                    port.position[1] <= this.#upperBound[1]
            )
            .filter((d) => this._isPortIn(d))

        this._defencesFiltered = portsFiltered.map((port) => ({ id: port.id, forts: port.forts, towers: port.towers }))

        if (this.showPB === "pb-all" || this.showPB === "pb-single") {
            this._pbZonesFiltered = portsFiltered.map((port) => ({
                id: port.id,
                pbCircles: port.pbCircles,
                joinCircle: port.joinCircle,
                spawnPoints: port.spawnPoints,
            }))
            this._raidZonesFiltered = []
        } else {
            this._pbZonesFiltered = []
            this._raidZonesFiltered = portsFiltered.map((port) => ({
                id: port.id,
                joinCircle: port.joinCircle,
                raidCircles: port.raidCircles,
                raidPoints: port.raidPoints,
            }))
        }
    }

    /**
     * Set bounds of current viewport
     * @param viewport - Current viewport
     */
    setBounds(viewport: Extent): void {
        this.#lowerBound = viewport[0]
        this.#upperBound = viewport[1]
    }

    async refresh(): Promise<void> {
        await this._setData()
        this._update()
    }
}
