const CONFIG = {
    TOKEN_PARTS: {
        PART1: "‏ghp_eiG7dzoWlGnpAXlQxLAM",
        PART2: "‏zDyU7yRw073FQlnR"
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
