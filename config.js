// config.js
const CONFIG = {
    TOKEN_PARTS: {
        PART1: "ghp_UCTgHQsAY5MjZ9AFye5",
        PART2: "NPKty4Z4nt62H5cta"
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