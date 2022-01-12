import Modal from "util/modal"
import { displayClan } from "../../util"
import { appDescription, appTitle, appVersion } from "common/common-browser"

export default class About {
    #modal: Modal | undefined = undefined

    constructor() {
        this.#setupListener()
    }

    #setupListener(): void {
        document.querySelector("#about")?.addEventListener("click", () => {
            this.#showAbout()
        })
    }

    #initModal(): void {
        this.#modal = new Modal(`${appTitle} <span class="text-primary small">v${appVersion}</span>`, "lg")
        const body = this.#modal.bodySel

        body.html(
            `<p>${appDescription} Please check the <a href="https://forum.game-labs.net/topic/23980-yet-another-map-naval-action-map/">Game-Labs forum post</a> for further details. Feedback is very welcome.</p>
                    <p>Designed by iB aka Felix Victor, <em>Bastards</em> clan ${displayClan("(BASTD)")}</a>.</p>
                    <div class="alert alert-secondary" role="alert"><h5 class="alert-heading">Did you know?</h5><p class="mb-0">My clan mate, Aquillas, wrote a most comprehensive <a href="https://drive.google.com/file/d/1PGysQwYg6aCQKq1dJQWtlc443IdO_drG/view">user guide</a>.</p></div>`
        )
    }

    #showAbout(): void {
        if (this.#modal) {
            this.#modal.show()
        } else {
            this.#initModal()
        }
    }
}
