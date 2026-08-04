import "@crm/env/load";

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { type AgentDefinition, defineAgent } from "eve";
import { logCapabilities } from "./lib/capabilities";

void logCapabilities();

/**
 * The model is a provider instance, not a model-id string.
 *
 * eve routes a bare id through the Vercel AI Gateway, whose base URL is
 * hardcoded — no environment variable redirects it. A provider instance is the
 * only supported way out: eve calls that `external` routing and talks to the
 * endpoint below directly.
 *
 * Here that endpoint is a CLIProxyAPI instance presenting a ChatGPT Codex
 * subscription as an OpenAI-compatible API, so the agent draws on a
 * subscription rather than billing per token.
 */
function required(name: string): string {
	const value = process.env[name]?.trim();

	if (!value) {
		// Fail at startup rather than degrade. There is no fallback to the
		// gateway on purpose: a missing variable would otherwise mean silently
		// paying per token, and turbo drops any variable not declared in BOTH
		// turbo.json files — the root one and apps/agent's.
		throw new Error(
			`${name} is not set. The agent reaches its model through an OpenAI-compatible endpoint; set AGENT_MODEL_BASE_URL, AGENT_MODEL_ID and AGENT_MODEL_API_KEY.`,
		);
	}

	return value;
}

const provider = createOpenAICompatible({
	name: "cli-proxy",
	baseURL: required("AGENT_MODEL_BASE_URL"),
	apiKey: required("AGENT_MODEL_API_KEY"),
});

// The annotation is load-bearing, not decoration: without it TypeScript infers
// a default export naming @ai-sdk/provider through a hoisted path it cannot
// write down, and fails with TS2742.
const agent: AgentDefinition = defineAgent({
	model: provider(required("AGENT_MODEL_ID")),
});

export default agent;
