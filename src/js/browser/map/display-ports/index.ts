/*!
 * This file is part of na-map.
 *
 * @file      Display ports.
 * @module    map/display-ports
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2022
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { select as d3Select, Selection } from "d3-selection"

import { loadJsonFiles } from "common/common-browser"
import { Extent, Point } from "common/common-math"
import { minMapScale } from "common/common-var"

import { PortBattlePerServer, PortBasic, PortPerServer, PortWithTrades } from "common/gen-json"
import { DataSource, PortJsonData, SVGGDatum, ZoomLevel } from "common/interface"

import Cookie from "util/cookie"
import RadioButton from "util/radio-button"
import { NAMap } from "../na-map"
import ShowF11 from "../show-f11"

import PortCircles from "./circles"
import Counties from "./counties"
import Flags from "./flags"
import PatrolZones from "./patrol-zones"
import PortIcons from "./port-icons"
import PortNames, { CurrentPort } from "./port-names"
import Regions from "./regions"
import Summary from "./summary"

interface ReadData {
    [index: string]: PortBasic[] | PortPerServer[] | PortBattlePerServer[]
    ports: PortBasic[]
    server: PortPerServer[]
    pb: PortBattlePerServer[]
}

export default class DisplayPorts {
    #counties!: Counties
    #gPort = {} as Selection<SVGGElement, SVGGDatum, HTMLElement, unknown>
    #lowerBound = {} as Point
    #patrolZones!: PatrolZones
    #portCircles!: PortCircles
    #portData = {} as PortWithTrades[]
    #portDataDefault!: PortWithTrades[]
    #portDataFiltered!: PortWithTrades[]
    #portNames!: PortNames
    #regions!: Regions
    #scale = 0
    #showCurrentGood = false
    #showRadius = ""
    #showTradePortPartners = false
    #summary!: Summary
    #upperBound = {} as Point
    #zoomLevel: ZoomLevel = "initial"
    portIcons!: PortIcons
    readonly #baseId = "show-radius"
    readonly #cookie: Cookie
    readonly #f11: ShowF11
    readonly #radioButtonValues: string[]
    readonly #radios: RadioButton
    readonly #serverName: string

    constructor(readonly map: NAMap) {
        this.#serverName = this.map.serverName
        this.#scale = minMapScale
        this.#f11 = this.map.f11

        /**
         * Possible values for show radius (first is default value)
         */
        this.#radioButtonValues = ["attack", "county", "points", "position", "tax", "net", "off"]

        /**
         * Show radius cookie
         */
        this.#cookie = new Cookie({ id: this.#baseId, values: this.#radioButtonValues })

        /**
         * Show radius radio buttons
         */
        this.#radios = new RadioButton(this.#baseId, this.#radioButtonValues)

        /**
         * Get showRadius setting from cookie or use default value
         */
        this.showRadius = this._getShowRadiusSetting()
    }

    async init(): Promise<void> {
        await this._loadAndSetupData()
    }

    async _setupData(data: ReadData): Promise<void> {
        // Combine port data with port battle data
        this.#portDataDefault = data.ports.map((port: PortBasic) => {
            const serverData = data.server.find((d: PortPerServer) => d.id === port.id) ?? ({} as PortPerServer)
            const pbData = data.pb.find((d: PortBattlePerServer) => d.id === port.id) ?? ({} as PortBattlePerServer)
            const combinedData = { ...port, ...serverData, ...pbData } as PortWithTrades

            return combinedData
        })
        this.#portData = this.#portDataDefault

        this._setupListener()
        this._setupSvg()
        this.#summary = new Summary()
        this.#portCircles = new PortCircles(this.#portDataDefault)
        this.portIcons = new PortIcons(this.#serverName)
        await this.portIcons.loadData()
        this.#portNames = new PortNames()
        this.#counties = new Counties()
        this.#regions = new Regions()
        this.#patrolZones = new PatrolZones(this.#serverName)
        void new Flags()
    }

    async _loadData(): Promise<ReadData> {
        const dataSources: DataSource[] = [
            {
                fileName: `${this.#serverName}-ports.json`,
                name: "server",
            },
            {
                fileName: `${this.#serverName}-pb.json`,
                name: "pb",
            },
        ]

        const readData = {} as ReadData
        readData.ports = (
            await import(/* webpackChunkName: "data-ports" */ "../../../../../lib/gen-generic/ports.json")
        ).default as PortBasic[]
        await loadJsonFiles<PortJsonData>(dataSources, readData)

        return readData
    }

    async _loadAndSetupData(): Promise<void> {
        const readData = await this._loadData()
        await this._setupData(readData)
    }

    _setupListener(): void {
        document.querySelector("#show-radius")?.addEventListener("change", () => {
            this._showRadiusSelected()
        })
    }

    /**
     * Get show setting from cookie or use default value
     * @returns Show setting
     */
    _getShowRadiusSetting(): string {
        let r = this.#cookie.get()

        // Radius "position" after reload is useless
        if (r === "position") {
            ;[r] = this.#radioButtonValues
            this.#cookie.set(r)
        }

        this.#radios.set(r)

        return r
    }

    _showRadiusSelected(): void {
        this.showRadius = this.#radios.get()
        this.#cookie.set(this.showRadius)
        this.update()
    }

    _setupSvg(): void {
        this.#gPort = d3Select<SVGGElement, SVGGDatum>("#map")
            .insert("g", "g.f11")
            .attr("data-ui-component", "ports")
            .attr("id", "ports")
    }

    portNamesUpdate() {
        this.#portNames.update(this.zoomLevel, this.#scale, this.#portDataFiltered)
    }

    update(scale?: number): void {
        this.#scale = scale ?? this.#scale

        this._filterVisible()
        this.portIcons.update(this.#scale, this.showRadius, this.#portDataFiltered)
        this.#portCircles.update(this.#scale, this.#portDataFiltered, this.showRadius, this.portIcons.tradePort.id)
        this.portNamesUpdate()
        this.#counties.update(this.zoomLevel, this.#lowerBound, this.#upperBound, this.showRadius)
        this.#regions.update(this.zoomLevel, this.#lowerBound, this.#upperBound)
        this.#patrolZones.update(this.zoomLevel)
        this.#summary.update(this.#portData)
    }

    _filterVisible(): void {
        if (this.showRadius === "position") {
            this.#portDataFiltered = this.#portData
        } else {
            this.#portDataFiltered = this.#portData.filter(
                (port) =>
                    port.coordinates[0] >= this.#lowerBound[0] &&
                    port.coordinates[0] <= this.#upperBound[0] &&
                    port.coordinates[1] >= this.#lowerBound[1] &&
                    port.coordinates[1] <= this.#upperBound[1]
            )
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

    setShowRadiusSetting(showRadius = this.#radioButtonValues[0]): void {
        this.showRadius = showRadius
        this.#radios.set(this.showRadius)
        this.#cookie.set(this.showRadius)
    }

    clearMap(scale?: number): void {
        this.#summary.show()
        this.#portData = this.#portDataDefault
        this.setShowRadiusSetting()
        this.update(scale)
    }

    get currentPort(): CurrentPort {
        return this.#portNames.currentPort
    }

    set currentPort(newCurrentPort: CurrentPort) {
        this.#portNames.currentPort = newCurrentPort
    }

    get portData(): PortWithTrades[] {
        return this.#portData
    }

    set portData(newPortData: PortWithTrades[]) {
        this.#portData = newPortData
    }

    get portDataDefault(): PortWithTrades[] {
        return this.#portDataDefault
    }

    get showRadius(): string {
        return this.#showRadius
    }

    set showRadius(newShowRadius: string) {
        this.#showRadius = newShowRadius
    }

    get showTradePortPartners(): boolean {
        return this.#showCurrentGood
    }

    set showTradePortPartners(newShowTradePortPartners: boolean) {
        this.#showTradePortPartners = newShowTradePortPartners
    }

    get zoomLevel(): ZoomLevel {
        return this.#zoomLevel
    }

    set zoomLevel(newZoomLevel: ZoomLevel) {
        this.#zoomLevel = newZoomLevel
    }
}
