const cssnanoOpt = {
    preset: ["default", { discardComments: { removeAll: true } }],
}

module.exports = (api) => ({
    plugins: {
        autoprefixer: true,
        cssnano: api.mode === "production" ? cssnanoOpt : false,
    },
})
