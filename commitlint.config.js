module.exports = {
    extends: ["@commitlint/config-conventional"],
    ignores: [(message) => message.includes("WIP")],
    rules: {
        "subject-case": [2, "never", ["start-case", "pascal-case", "upper-case"]],
        "type-enum": [
            2,
            "always",
            ["build", "chore", "ci", "docs", "feat", "fix", "perf", "refactor", "revert", "style", "test"],
        ],
    },
}
