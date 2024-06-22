import type { IRequest } from "itty-router";

import googleTrends from './trends';

const trendySystemPrompt = "You are an SEO specialist and you are tasked with finding related ideas for for a given topic. The user will specify a topic and the type of content they want to create. You will also be given some trending searches from the user's region. You will use this information to generate a list of related ideas for the user. Output using your given tools.";
const systemPrompt = "You are an SEO specialist and you are tasked with finding related ideas for for a given topic. The user will specify a topic and the type of content they want to create. You will use this information to generate a list of related ideas for the user. Output using your given tools.";
const model = "@hf/nousresearch/hermes-2-pro-mistral-7b"

const formHandler = async (request: IRequest, env: Env, ctx: ExecutionContext): Promise<Response> => {
  const formData = await request.formData();
  const body = Object.fromEntries(formData);

  const { topic, region, project_type, use_trending } = body as { topic: string; region: string, project_type: string, use_trending: string };

  const query: {
    geo?: string;
  } = {
    geo: region || "US"
  }

  // check the cache for hourly trends for the region.
  let results: any;
  const key = `trends-${region || "global"}`;
  const cached = await env.TRENDS.get(key);
  if (cached) {
    results = cached;
  } else {
    results = await googleTrends.dailyTrends(query);
    await env.TRENDS.put(key, results, { expirationTtl: 3600 * 2 });
  }

  results = JSON.parse(results);

  const words: string[] = results.default.trendingSearchesDays[0].trendingSearches.map((item: any) => {
    // console.log(item);
    return item.title.query;
  });
  const dedupedWords = [...new Set(words)];

  const trendingPhrase = ` Trending searches in ${region}: ${dedupedWords.join(", ")}`

  // @ts-expect-error incorrect overload
  const response = await env.AI.run(model, {
    messages: [{ content: region.length ? trendySystemPrompt : systemPrompt, role: "system" }, { content: `I'm making a ${project_type}. My topic is ${topic}.${use_trending === "on" ? trendingPhrase : ""}`, role: "user" }],
    tools: [
      {
        name: "returnIdeas",
        description: "responds with the list of related ideas",
        parameters: {
          type: "object",
          properties: {
            ideas: {
              type: "array",
              description: "list of related ideas",
              items: {
                type: "string",
              },
            },
          },
          required: ["ideas"],
        },
      },
    ],
  });

  // @ts-expect-error incorrect overload
  const { tool_calls } = response;

  const ideas = tool_calls[0].arguments.ideas as string[];

  const responseHTML = ideas.map((idea) => `<tr><td>${idea}</td></tr>`).join("");

  return new Response(responseHTML, {
    headers: {
      "content-type": "text/html;charset=UTF-8",
    },
  });
}

export default formHandler;
