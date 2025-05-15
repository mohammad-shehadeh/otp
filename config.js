const CONFIG = {
    TOKEN_PARTS: {
        PART1: "‏ghp_QbaD0IOUwkEduw6",
        PART2: "‏o7oQTghtOuHYJKA11hI64"
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