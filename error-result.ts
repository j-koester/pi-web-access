import type { AgentToolResult } from "@earendil-works/pi-coding-agent";

// Pi 1.0 introduced `isError` on tool results: a result flagged as an error is
// rendered as a failed call and providers that support error tool results, such
// as Anthropic, receive one, which helps models recover instead of retrying the
// same broken arguments. The flag is additive: Pi versions before 1.0 ignore it
// and show `content` as they always did, so the text must stay self-explanatory.
export function errorResult<T extends Record<string, unknown>>(text: string, details: T): AgentToolResult<T> {
	return {
		content: [{ type: "text", text }],
		details,
		isError: true,
	};
}
