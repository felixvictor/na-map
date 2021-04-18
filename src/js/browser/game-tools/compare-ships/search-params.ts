import { hashids } from "common/common-game-tools"
import { appVersion } from "common/common-browser"

export class ShipCompareSearchParams {
    #VERSION = "v"
    #SHIPANDWOODS = "cmp"
    #shipCompareUrl = new URL(window.location.href)

    constructor(urlParams: URLSearchParams | undefined = undefined) {
        if (urlParams) {
            this._setSearchParams(urlParams)
        }
    }

    static _getDecodedValue(codedValue: string | null): number[] {
        const value = codedValue ? (hashids.decode(codedValue) as number[]) : ([] as number[])

        return value
    }

    static _getCodedValue(value: number[]): string {
        const codedValue = hashids.encode(value)

        return codedValue
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

    _getModuleIndex(columnIndex: number, moduleTypeIndex: number): string {
        return `${columnIndex}${moduleTypeIndex}`
    }

    getModuleIds(columnIndex: number, moduleTypeIndex: number): number[] {
        const param = this._getModuleIndex(columnIndex, moduleTypeIndex)
        const codedValue = this.#shipCompareUrl.searchParams.get(param)

        const value = ShipCompareSearchParams._getDecodedValue(codedValue)

        return value
    }

    setModuleIds(columnIndex: number, moduleTypeIndex: number, moduleIds: number[]): void {
        const param = this._getModuleIndex(columnIndex, moduleTypeIndex)
        const codedValue = ShipCompareSearchParams._getCodedValue(moduleIds)

        this.#shipCompareUrl.searchParams.set(param, codedValue)
    }

    getShipsAndWoodIds(): number[] {
        const codedValue = this.#shipCompareUrl.searchParams.get(this.#SHIPANDWOODS)

        const value = ShipCompareSearchParams._getDecodedValue(codedValue)

        return value
    }

    setShipsAndWoodIds(ids: number[]): void {
        const codedValue = ShipCompareSearchParams._getCodedValue(ids)

        this.#shipCompareUrl.searchParams.set(this.#SHIPANDWOODS, codedValue)
    }

    setVersion(): void {
        const codedVersion = encodeURIComponent(appVersion)

        this.#shipCompareUrl.searchParams.set(this.#VERSION, codedVersion)
    }

    _hasShipWoods(): boolean {
        return this.#shipCompareUrl.searchParams.has(this.#VERSION)
    }

    _getVersion(): string | undefined {
        if (this._hasVersion()) {
            const codedVersion = this.#shipCompareUrl.searchParams.get(this.#VERSION) as string
            const version = decodeURIComponent(codedVersion)

            return version
        }

        return undefined
    }

    _hasVersion(): boolean {
        return this.#shipCompareUrl.searchParams.has(this.#VERSION)
    }

    _setSearchParams(urlParams: URLSearchParams): void {
        for (const pair of urlParams.entries()) {
            console.log("set searchParams", pair[0], pair[1])
            this.#shipCompareUrl.searchParams.set(pair[0], pair[1])
        }
    }
}
