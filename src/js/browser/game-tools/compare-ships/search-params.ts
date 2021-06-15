import { hashids } from "common/common-game-tools"
import { appVersion } from "common/common-browser"
import { ModuleType } from "compare-ships"

export class ShipCompareSearchParams {
    #VERSION = "v"
    #SHIPANDWOODS = "cmp"

    #moduleTypes = {} as Set<ModuleType>
    #shipCompareUrl = new URL(window.location.href)

    constructor(urlParams: URLSearchParams | undefined = undefined) {
        if (urlParams) {
            this._setSearchParams(urlParams)
        }
    }

    static getDecodedValue(codedValue: string | null): number[] {
        const value = codedValue ? (hashids.decode(codedValue) as number[]) : ([] as number[])

        return value
    }

    static _getCodedValue(value: number[]): string {
        const codedValue = hashids.encode(value)

        return codedValue
    }

    get moduleTypes(): Set<ModuleType> {
        return this.#moduleTypes
    }

    set moduleTypes(moduleTypes: Set<ModuleType>) {
        this.#moduleTypes = moduleTypes
    }

    get searchParams(): URLSearchParams {
        return this.#shipCompareUrl.searchParams
    }

    getUrl(): string {
        return this.#shipCompareUrl.href
    }

    // True if main versions of current app and searchParam are the same
    isCurrentVersion(): boolean {
        if (this._hasVersion() && this._hasShipWoods()) {
            const version = this._getVersion()
            // Compare main versions
            if (version && version.split(".")[0] === appVersion.split(".")[0]) {
                return true
            }
        }

        return false
    }

    getModuleIds(columnIndex: number, moduleTypeIndex: number): [string, number[]] {
        const param = this._getModuleIndex(columnIndex, moduleTypeIndex)
        const codedValue = this.#shipCompareUrl.searchParams.get(param)

        const value = ShipCompareSearchParams.getDecodedValue(codedValue)

        return [param, value]
    }

    setModuleIds(columnIndex: number, moduleTypeIndex: number, moduleIds: number[]): void {
        const param = this._getModuleIndex(columnIndex, moduleTypeIndex)
        const codedValue = ShipCompareSearchParams._getCodedValue(moduleIds)

        this.#shipCompareUrl.searchParams.set(param, codedValue)
    }

    getShipsAndWoodIds(): number[] {
        const codedValue = this._getParam(this.#SHIPANDWOODS)
        if (codedValue) {
            this._deleteParam(this.#SHIPANDWOODS)
            const value = ShipCompareSearchParams.getDecodedValue(codedValue)

            return value
        }

        return []
    }

    setShipsAndWoodIds(ids: number[]): void {
        const codedValue = ShipCompareSearchParams._getCodedValue(ids)

        this.#shipCompareUrl.searchParams.set(this.#SHIPANDWOODS, codedValue)
    }

    setVersion(): void {
        const codedVersion = encodeURIComponent(appVersion)

        this.#shipCompareUrl.searchParams.set(this.#VERSION, codedVersion)
    }

    _deleteParam(key: string): void {
        this.#shipCompareUrl.searchParams.delete(key)
    }

    _getModuleIndex(columnIndex: number, moduleTypeIndex: number): string {
        return `${columnIndex}${moduleTypeIndex}`
    }

    _getParam(key: string): string | undefined {
        return this.#shipCompareUrl.searchParams.get(key) ?? undefined
    }

    _getVersion(): string | undefined {
        if (this._hasVersion()) {
            const codedVersion = this._getParam(this.#VERSION)
            if (codedVersion) {
                this._deleteParam(this.#VERSION)
                const version = decodeURIComponent(codedVersion)

                return version
            }
        }

        return undefined
    }

    _hasShipWoods(): boolean {
        return this.#shipCompareUrl.searchParams.has(this.#VERSION)
    }

    _hasVersion(): boolean {
        return this.#shipCompareUrl.searchParams.has(this.#VERSION)
    }

    _setSearchParams(urlParams: URLSearchParams): void {
        for (const [key, value] of urlParams.entries()) {
            this.#shipCompareUrl.searchParams.set(key, value)
        }
    }
}
