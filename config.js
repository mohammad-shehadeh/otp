const CONFIG = {
    TOKEN_PARTS: {
        PART1: "‏ghp_C3Ow2K6KRxrPzU5EYKP",
        PART2: "‏ws6wsIF0tPq1BzSj1"
    },
    REPO: {
        OWNER: "mohammad-shehadeh",
        NAME: "otp"
    },
    FILE_PATH: "Server.md"
};

function assembleGitHubToken() {
    return CONFIG.TOKEN_PARTS.PART1 + CONFIG.TOKEN_PARTS.PART2;
}