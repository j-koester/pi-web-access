import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const indexUrl = new URL("../index.ts", import.meta.url).href;

// Runs one registered tool with the given params and returns its result.
// All exercised paths return before any network access, so no fetch mocking
// is needed; only an isolated Pi config dir keeps real settings out.
async function runTool(toolName, params) {
	const home = await mkdtemp(join(tmpdir(), "pi-tool-error-flag-"));
	const child = spawnSync(process.execPath, ["--input-type=module"], {
		input: `
			const { default: initializeExtension } = await import(${JSON.stringify(indexUrl)});
			const tools = [];
			initializeExtension({
				registerTool(tool) { tools.push(tool); },
				registerCommand() {},
				registerShortcut() {},
				on() {},
				appendEntry() {},
				sendMessage() {},
				exec() { return { code: 0 }; },
			});
			const tool = tools.find((tool) => tool.name === ${JSON.stringify(toolName)});
			const result = await tool.execute("call", ${JSON.stringify(params)});
			console.log(JSON.stringify(result));
		`,
		encoding: "utf8",
		env: { ...process.env, PI_CODING_AGENT_DIR: home },
		maxBuffer: 2 * 1024 * 1024,
	});
	assert.equal(child.status, 0, child.stderr);
	return JSON.parse(child.stdout.trim());
}

test("fetch_content flags a missing url as an error result and names the parameter", async () => {
	const result = await runTool("fetch_content", {});
	assert.equal(result.isError, true);
	assert.equal(result.details.error, "No URL provided");
	assert.equal(result.content[0].text, "Error: No URL provided. Use the 'url' parameter, or 'urls' for parallel fetches.");
});

test("fetch_content flags invalid parameter combinations as error results", async () => {
	const result = await runTool("fetch_content", { url: "https://example.com", mode: "answer", prompt: "What is this page about?", model: "gemini-3.6-flash" });
	assert.equal(result.isError, true);
	assert.equal(result.details.error, "model is incompatible with mode answer");
	assert.equal(result.content[0].text, "Error: use answerModel, not model, with mode answer.");
});

test("web_search flags a missing query as an error result", async () => {
	const result = await runTool("web_search", { workflow: "none" });
	assert.equal(result.isError, true);
	assert.equal(result.details.error, "No query provided");
	assert.equal(result.content[0].text, "Error: No query provided. Use 'query' or 'queries' parameter.");
});

test("source_check flags a missing claim as an error result", async () => {
	const result = await runTool("source_check", {});
	assert.equal(result.isError, true);
	assert.equal(result.details.error, "Missing claim");
	assert.equal(result.content[0].text, "Error: 'claim' is required.");
});

test("get_search_content flags findMode without findText as an error result", async () => {
	const result = await runTool("get_search_content", { responseId: "nonexistent", findMode: "exact" });
	assert.equal(result.isError, true);
	assert.equal(result.details.error, "findMode requires findText");
});

test("get_search_content flags an unknown responseId as an error result", async () => {
	const result = await runTool("get_search_content", { responseId: "no-such-response-id" });
	assert.equal(result.isError, true);
	assert.equal(result.details.error, "Not found");
	assert.match(result.content[0].text, /^Error: No stored results for responseId/);
});
