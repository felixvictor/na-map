const postcssCleanOpt = {
    level: { 1: { specialComments: 0 }, 2: {} },
}

module.exports = (api) => ({
    plugins: {
        "postcss-import": true,
        autoprefixer: true,
        "postcss-clean": api.mode === "production" ? postcssCleanOpt : false,
    },
})
