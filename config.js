// بيانات التكوين
const CONFIG = {
    TOKEN_PART1: "ghp_UCTgHQsAY5MjZ9AFye5",
    TOKEN_PART2: "NPKty4Z4nt62H5cta",
    REPO_OWNER: "YOUR_GITHUB_USERNAME", // استبدل باسم مستخدم GitHub الخاص بك
    REPO_NAME: "YOUR_REPO_NAME", // استبدل باسم المستودع الخاص بك
    FILE_PATH: "Server.md"
};

// دالة للحصول على التوكن الكامل
function getGitHubToken() {
    return CONFIG.TOKEN_PART1 + CONFIG.TOKEN_PART2;
}