const cssnanoOpt = {
    preset: ["default", { discardComments: { removeAll: true } }],
}

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
    safelist: { standard: purgecssSafelistStandard, deep: purgecssSafelistDeep },
    content: ["./src/**/*.{ejs,ts}"],
}

module.exports = (api) => ({
    plugins: {
        "@fullhuman/postcss-purgecss": purgecssOpt,
        autoprefixer: true,
        cssnano: api.mode === "production" ? cssnanoOpt : false,
    },
})
