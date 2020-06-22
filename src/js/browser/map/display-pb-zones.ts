/*!
 * This file is part of na-map.
 *
 * @file      Display port battle zones.
 * @module    map/display-pb-zones
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { select as d3Select } from "d3-selection"
import * as d3Selection from "d3-selection"

import { putImportError } from "../../common/common"
import { drawSvgCircle, drawSvgRect } from "../util"
import Cookie from "../util/cookie"
import RadioButton from "../util/radio-button"
import DisplayPorts from "./display-ports"

import { PbZone, PbZoneBasic, PbZoneDefence, PbZoneRaid } from "../../common/gen-json"
import { Bound } from "../../common/interface"
import { Server } from "../../common/servers"

// eslint-disable-next-line @typescript-eslint/no-var-requires
const servers: Server[] = require("../../common/servers")

export default class DisplayPbZones {
    showPB: string
    #serverType: string
    private readonly _ports!: DisplayPorts
    private readonly _showId: string
    private readonly _showValues: Array<{ id: string; label: string }>
    private readonly _showCookie: Cookie
    private readonly _showRadios: RadioButton
    private _isDataLoaded: boolean
    private _pbZonesDefault!: PbZone[]
    private _lowerBound!: Bound
    private _upperBound!: Bound
    private _defencesFiltered!: PbZoneDefence[]
    private _pbZonesFiltered!: PbZoneBasic[]
    private _raidZonesFiltered!: PbZoneRaid[]
    private _g!: d3Selection.Selection<SVGGElement, unknown, HTMLElement, unknown>

    constructor(ports: DisplayPorts, serverId: string) {
        this._ports = ports
        this.#serverType = servers.find((server) => server.id === serverId)!.type

        this._showId = "show-zones"

        /**
         * Possible values for show port battle zones radio buttons (first is default value)
         */
        if (this.#serverType === "PVP") {
            this._showValues = [
                { id: "pb-all", label: "All ports" },
                { id: "pb-single", label: "Single port" },
                { id: "off", label: "Off" },
            ]
        } else {
            this._showValues = [
                { id: "pb-all", label: "All ports" },
                { id: "pb-single", label: "Single port" },
                { id: "raid-all", label: "All raid" },
                { id: "raid-single", label: "Single raid" },
                { id: "off", label: "Off" },
            ]
        }

        this._setupRadios()

        /**
         * Show port battle zones cookie
         */
        this._showCookie = new Cookie({ id: this._showId, values: this._showValues.map((item) => item.id) })

        /**
         * Show port battle zones radio buttons
         */
        this._showRadios = new RadioButton(
            this._showId,
            this._showValues.map((item) => item.id)
        )

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

    _setupRadios(): void {
        const divMain = d3Select("#show-zones")
        for (const radioItem of this._showValues) {
            const div = divMain.append("div").attr("class", "custom-control custom-radio custom-control-inline")
            div.append("input")
                .attr("type", "radio")
                .attr("class", "custom-control-input")
                .attr("name", "show-zones")
                .attr("id", `show-zones-${radioItem.id}`)
                .attr("value", radioItem.id)
            div.append("label")
                .attr("type", "radio")
                .attr("class", "custom-control-label")
                .attr("for", `show-zones-${radioItem.id}`)
                .text(radioItem.label)
        }
    }

    async _loadData(): Promise<void> {
        try {
            this._pbZonesDefault = (
                await import(/* webpackChunkName: "data-pb-zones" */ "Lib/gen-generic/pb-zones.json")
            ).default as PbZone[]
        } catch (error) {
            putImportError(error)
        }
    }

    _setupListener(): void {
        document.querySelector(`#${this._showId}`)?.addEventListener("change", (event) => {
            this._showPBZonesSelected()
            event.preventDefault()
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
        this.refresh()
        this._ports.updateTexts()
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
            .join(
                (enter): d3Selection.Selection<SVGGElement, PbZoneBasic, SVGGElement, unknown> => {
                    const g = enter.append("g").attr("class", "pb-zones")

                    // Port battle join circles
                    g.append("path")
                        .attr("class", "pb-join-circle")
                        .attr("d", (d) =>
                            drawSvgCircle(d.joinCircle[0], d.joinCircle[1], 28).concat(
                                drawSvgCircle(d.joinCircle[0], d.joinCircle[1], 14)
                            )
                        )

                    // Port battle circles
                    g.append("path")
                        .attr("class", "pb-circle")
                        .attr("d", (d) =>
                            d.pbCircles.map((pbCircle) => drawSvgCircle(pbCircle[0], pbCircle[1], 3.5)).join("")
                        )
                    g.append("text")
                        .attr("class", "pb-text pb-circle-text")
                        .attr("x", (d) => d.pbCircles.map((pbCircle) => pbCircle[0]).join(","))
                        .attr("y", (d) => d.pbCircles.map((pbCircle) => pbCircle[1]).join(","))
                        .text((d) => d.pbCircles.map((pbCircle, i) => String.fromCharCode(65 + i)).join(""))

                    // Spawn points
                    if (this.#serverType === "PVP") {
                        g.append("path")
                            .attr("class", "raid-point")
                            .attr("d", (d) =>
                                d.spawnPoints
                                    .map((spawnPoint) => drawSvgCircle(spawnPoint[0], spawnPoint[1], 3.5))
                                    .join("")
                            )
                        g.append("text")
                            .attr("class", "pb-text raid-point-text")
                            .attr("x", (d) => d.spawnPoints.map((spawnPoint) => spawnPoint[0]).join(","))
                            .attr("y", (d) => d.spawnPoints.map((spawnPoint) => spawnPoint[1]).join(","))
                            .text((d) => d.spawnPoints.map((spawnPoint, i) => String.fromCharCode(88 + i)).join(""))
                    }

                    return g
                }
            )

        this._g
            .selectAll<SVGGElement, PbZoneDefence>("g.defence")
            .data(this._defencesFiltered, (d) => String(d.id))
            .join(
                (enter): d3Selection.Selection<SVGGElement, PbZoneDefence, SVGGElement, unknown> => {
                    const g = enter.append("g").attr("class", "defence")

                    // Forts
                    g.append("path")
                        .attr("class", "fort")
                        .attr("d", (d) => d.forts.map((fort) => drawSvgRect(fort[0], fort[1], 3)).join(""))
                    g.append("text")
                        .attr("class", "pb-text pb-fort-text")
                        .attr("x", (d) => d.forts.map((fort) => fort[0]).join(","))
                        .attr("y", (d) => d.forts.map((fort) => fort[1]).join(","))
                        .text((d) => d.forts.map((fort, i) => `${i + 1}`).join(""))

                    // Towers
                    g.append("path")
                        .attr("class", "tower")
                        .attr("d", (d) => d.towers.map((tower) => drawSvgCircle(tower[0], tower[1], 1.5)).join(""))
                    g.append("text")
                        .attr("class", "pb-text pb-tower-text")
                        .attr("x", (d) => d.towers.map((tower) => tower[0]).join(","))
                        .attr("y", (d) => d.towers.map((tower) => tower[1]).join(","))
                        .text((d) => d.towers.map((tower, i) => `${i + 1}`).join(""))
                    return g
                }
            )

        this._g
            .selectAll<SVGGElement, PbZoneRaid>("g.raid-zones")
            .data(this._raidZonesFiltered, (d) => String(d.id))
            .join(
                (enter): d3Selection.Selection<SVGGElement, PbZoneRaid, SVGGElement, any> => {
                    const g = enter.append("g").attr("class", "raid-zones")

                    // Raid join circles
                    g.append("path")
                        .attr("class", "raid-join-circle")
                        .attr("d", (d) => drawSvgCircle(d.joinCircle[0], d.joinCircle[1], 35))

                    // Raid circles
                    g.append("path")
                        .attr("class", "raid-circle")
                        .attr("d", (d) =>
                            d.raidCircles.map((raidCircle) => drawSvgCircle(raidCircle[0], raidCircle[1], 4.5)).join("")
                        )
                    g.append("text")
                        .attr("class", "pb-text raid-circle-text")
                        .attr("x", (d) => d.raidCircles.map((raidCircle) => raidCircle[0]).join(","))
                        .attr("y", (d) => d.raidCircles.map((raidCircle) => raidCircle[1]).join(","))
                        .text((d) => d.raidCircles.map((raidCircle, i) => String.fromCharCode(65 + i)).join(""))

                    // Raid points
                    g.append("path")
                        .attr("class", "raid-point")
                        .attr("d", (d) =>
                            d.raidPoints.map((raidPoint) => drawSvgCircle(raidPoint[0], raidPoint[1], 1.5)).join("")
                        )
                    g.append("text")
                        .attr("class", "pb-text raid-point-text")
                        .attr("x", (d) => d.raidPoints.map((raidPoint) => raidPoint[0]).join(","))
                        .attr("y", (d) => d.raidPoints.map((raidPoint) => raidPoint[1]).join(","))
                        .text((d) => d.raidPoints.map((raidPoint, i) => String.fromCharCode(49 + i)).join(""))
                    return g
                }
            )
    }

    _isPortIn(d: PbZone): boolean {
        return (
            this.showPB === "pb-all" ||
            this.showPB === "raid-all" ||
            ((this.showPB === "pb-single" || this.showPB === "raid-single") &&
                Number(d.id) === this._ports.currentPort.id)
        )
    }

    _setData(): void {
        if (this._ports.zoomLevel === "pbZone" && this.showPB !== "off") {
            if (this._isDataLoaded) {
                this._filterVisible()
            } else {
                void this._loadData().then(() => {
                    this._isDataLoaded = true
                    this._filterVisible()
                })
            }
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
                    port.position[0] >= this._lowerBound[0] &&
                    port.position[0] <= this._upperBound[0] &&
                    port.position[1] >= this._lowerBound[1] &&
                    port.position[1] <= this._upperBound[1]
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
     * @param lowerBound - Top left coordinates of current viewport
     * @param upperBound - Bottom right coordinates of current viewport
     */
    setBounds(lowerBound: Bound, upperBound: Bound): void {
        this._lowerBound = lowerBound
        this._upperBound = upperBound
    }

    refresh(): void {
        this._setData()
        this._update()
    }
}
