module.exports = async (env, argv) => {
    const config = await import('./webpack.config.mjs')

    return config.default(env, argv)
}
