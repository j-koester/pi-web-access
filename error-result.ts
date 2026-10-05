// A tool result that reports a failure without throwing. Pi 1.0 introduced
// `isError` on AgentToolResult, and the shared WebToolResult contract carries
// the same optional flag for the MCP server: a result flagged as an error is
// rendered as a failed call, and providers that support error tool results,
// such as Anthropic, receive one, which helps models recover instead of
// retrying the same broken arguments. The flag is additive: older hosts
// ignore it and show `content` as they always did, so the text must stay
// self-explanatory. No Pi imports here: web-tool-core.ts must stay free of
// them, and the shape is structurally compatible with both result types.
export function errorResult<T extends Record<string, unknown>>(text: string, details: T) {
	return {
		content: [{ type: "text" as const, text }],
		details,
		isError: true as const,
	};
}
