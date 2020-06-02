const postcssCleanOpt = {
    level: { 1: { specialComments: 0 }, 2: {} },
}

module.exports = ({ options }) => ({
    plugins: {
        "postcss-import": true,
        autoprefixer: true,
        "postcss-clean": options.isProduction ? postcssCleanOpt : false,
    },
})
