module.exports = {
    plugins: [require("autoprefixer")]
};

if ("prod" === process.env.NODE_ENV) {
    module.exports.plugins.push(
        require("postcss-clean")({
            level: { 1: { specialComments: 0 } },
        })
    );
}
