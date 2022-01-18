export default class Checkbox {
    // Checkbox button id
    readonly #id: string

    constructor(id: string) {
        this.#id = id
    }

    #getElement(): HTMLInputElement | undefined {
        return (document.querySelector(`#${this.#id}`) as HTMLInputElement) ?? undefined
    }

    /**
     * Set checkbox
     */
    set(value: boolean): void {
        const element = this.#getElement()

        if (element) {
            element.checked = value
        }
    }

    /**
     * Get checkbox value
     */
    get(): boolean {
        const element = this.#getElement()

        if (element) {
            return element.checked
        }

        return false
    }
}
