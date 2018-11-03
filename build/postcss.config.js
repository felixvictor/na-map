const postcssCrassOpt = {
    optimize: true,
    pretty: false
};

module.exports = ctx => ({
    plugins: {
        autoprefixer: true,
        "postcss-crass": ctx.env === "production" ? postcssCrassOpt : false
    }
});
