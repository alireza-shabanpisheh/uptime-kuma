const { describe, test } = require("node:test");
const assert = require("node:assert");

/**
 * @param openRouterResponseData
 */
/**
 * Filters OpenRouter response content and detects system messages or truncation.
 * @param {object} openRouterResponseData - The OpenRouter API response data.
 * @returns {{ aiMessage: string|null, aiWarning: string|null }} Filtered message and optional warning.
 */
function filterOpenRouterContent(openRouterResponseData) {
    const choice = openRouterResponseData?.choices?.[0];
    const content = choice?.message?.content?.trim();

    const systemKeywords = ["user safety", "content filtered", "moderation", "safety check"];
    const isSystemMessage = content && systemKeywords.some((keyword) => content.toLowerCase().includes(keyword));

    if (content && !isSystemMessage) {
        const finishReason = choice?.finish_reason;
        const warning = finishReason === "length"
            ? "AI analysis may be incomplete due to length limits. Stats are still available below."
            : null;
        return { aiMessage: content, aiWarning: warning };
    } else {
        return { aiMessage: null, aiWarning: "AI analysis returned empty content. Stats are still available below." };
    }
}

describe("OpenRouter AI Report Content Filter", () => {
    test("should return normal content when AI generates valid analysis", () => {
        const responseData = {
            choices: [
                {
                    message: {
                        content: "## Weekly Report\n\nAll systems are running smoothly."
                    }
                }
            ]
        };

        const result = filterOpenRouterContent(responseData);
        assert.strictEqual(result.aiMessage, "## Weekly Report\n\nAll systems are running smoothly.");
        assert.strictEqual(result.aiWarning, null);
    });

    test("should filter out 'User Safety: safe' system message", () => {
        const responseData = {
            choices: [
                {
                    message: {
                        content: "User Safety: safe"
                    }
                }
            ]
        };

        const result = filterOpenRouterContent(responseData);
        assert.strictEqual(result.aiMessage, null);
        assert.ok(result.aiWarning.includes("empty content"));
    });

    test("should filter out 'Content filtered' system message", () => {
        const responseData = {
            choices: [
                {
                    message: {
                        content: "Content filtered by safety system"
                    }
                }
            ]
        };

        const result = filterOpenRouterContent(responseData);
        assert.strictEqual(result.aiMessage, null);
        assert.ok(result.aiWarning.includes("empty content"));
    });

    test("should filter out 'safety check' system message", () => {
        const responseData = {
            choices: [
                {
                    message: {
                        content: "This request triggered a safety check"
                    }
                }
            ]
        };

        const result = filterOpenRouterContent(responseData);
        assert.strictEqual(result.aiMessage, null);
        assert.ok(result.aiWarning.includes("empty content"));
    });

    test("should handle empty content gracefully", () => {
        const responseData = {
            choices: [
                {
                    message: {
                        content: ""
                    }
                }
            ]
        };

        const result = filterOpenRouterContent(responseData);
        assert.strictEqual(result.aiMessage, null);
        assert.ok(result.aiWarning.includes("empty content"));
    });

    test("should handle null content gracefully", () => {
        const responseData = {
            choices: [
                {
                    message: {
                        content: null
                    }
                }
            ]
        };

        const result = filterOpenRouterContent(responseData);
        assert.strictEqual(result.aiMessage, null);
        assert.ok(result.aiWarning.includes("empty content"));
    });

    test("should handle undefined content gracefully", () => {
        const responseData = {
            choices: [
                {
                    message: {}
                }
            ]
        };

        const result = filterOpenRouterContent(responseData);
        assert.strictEqual(result.aiMessage, null);
        assert.ok(result.aiWarning.includes("empty content"));
    });

    test("should handle empty choices array", () => {
        const responseData = {
            choices: []
        };

        const result = filterOpenRouterContent(responseData);
        assert.strictEqual(result.aiMessage, null);
        assert.ok(result.aiWarning.includes("empty content"));
    });

    test("should handle completely null response", () => {
        const result = filterOpenRouterContent(null);
        assert.strictEqual(result.aiMessage, null);
        assert.ok(result.aiWarning.includes("empty content"));
    });

    test("should pass through content with 'safe' in normal context", () => {
        const responseData = {
            choices: [
                {
                    message: {
                        content: "The system is safe and all monitors are up."
                    }
                }
            ]
        };

        const result = filterOpenRouterContent(responseData);
        assert.strictEqual(result.aiMessage, "The system is safe and all monitors are up.");
        assert.strictEqual(result.aiWarning, null);
    });

    test("should warn when response is truncated due to token limit", () => {
        const responseData = {
            choices: [
                {
                    message: {
                        content: "## Weekly Report\n\nAll systems are running smoothly. But this response is cut off..."
                    },
                    finish_reason: "length"
                }
            ]
        };

        const result = filterOpenRouterContent(responseData);
        assert.strictEqual(result.aiMessage, "## Weekly Report\n\nAll systems are running smoothly. But this response is cut off...");
        assert.ok(result.aiWarning.includes("incomplete"));
    });

    test("should not warn when response is complete (finish_reason: stop)", () => {
        const responseData = {
            choices: [
                {
                    message: {
                        content: "## Weekly Report\n\nAll systems are running smoothly."
                    },
                    finish_reason: "stop"
                }
            ]
        };

        const result = filterOpenRouterContent(responseData);
        assert.strictEqual(result.aiMessage, "## Weekly Report\n\nAll systems are running smoothly.");
        assert.strictEqual(result.aiWarning, null);
    });

    test("should not warn when finish_reason is missing", () => {
        const responseData = {
            choices: [
                {
                    message: {
                        content: "## Weekly Report\n\nAll systems are running smoothly."
                    }
                }
            ]
        };

        const result = filterOpenRouterContent(responseData);
        assert.strictEqual(result.aiMessage, "## Weekly Report\n\nAll systems are running smoothly.");
        assert.strictEqual(result.aiWarning, null);
    });
});
