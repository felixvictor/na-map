const purgecssSafelistDeep = [
    /active/,
    /bootstrap-select/,
    /bs-/,
    /btn/,
    /collaps/,
    /col-4/,
    /disabled/,
    /dropdown-backdrop/,
    /fade/,
    /focus/,
    /list-unstyled/,
    /modal/,
    /^rs-/,
    /show/,
    /slide/,
    /tooltip/,
]
const portBonusType = ["crew", "gunnery", "hull", "mast", "sailing"]
const purgecssSafelistStandard = portBonusType.map((bonus) => `icon-${bonus}`)

const purgecssOpt = {
    content: ["./src/**/*.{ejs,ts}"],
    safelist: { standard: purgecssSafelistStandard, deep: purgecssSafelistDeep },
    variables: true,
}

module.exports = () => ({
    plugins: {
        "@fullhuman/postcss-purgecss": purgecssOpt,
        autoprefixer: true,
    },
})
