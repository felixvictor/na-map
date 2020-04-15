const postcssCleanOpt = {
    level: { 1: { specialComments: 0 }, 2: {} },
}

module.exports = (ctx) => ({
    plugins: {
        autoprefixer: true,
        "postcss-clean": ctx.env === "production" ? postcssCleanOpt : false,
    },
})
