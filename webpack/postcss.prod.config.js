const purgecssSafelistDeep = [
    /active/,
    /bootstrap-select/,
    /bs-/,
    /btn/,
    /collaps/,
    /disabled/,
    /dropdown-backdrop/,
    /fade/,
    /^flag-icon/,
    /focus/,
    /^icon-/,
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
    content: ["./src/**/*.{ejs,ts,mts}"],
    safelist: { standard: purgecssSafelistStandard, deep: purgecssSafelistDeep },
    variables: true,
}

// eslint-disable-next-line unicorn/prefer-module
module.exports = () => ({
    plugins: {
        "@fullhuman/postcss-purgecss": purgecssOpt,
        autoprefixer: true,
    },
})
