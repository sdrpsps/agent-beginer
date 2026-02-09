import "dotenv/config";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { ChatOpenAI } from "@langchain/openai";
import chalk from "chalk";
import {
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";

const model = new ChatOpenAI({
  modelName: "qwen-plus",
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

const mcpClient = new MultiServerMCPClient({
  mcpServers: {
    "my-mcp-server": {
      command: "node",
      args: ["./src/my-mcp-server.mjs"],
    },
  },
});

const tools = await mcpClient.getTools();
const modelWithTools = model.bindTools(tools);

const res = await mcpClient.listResources();

let resourceContent = "";
for (const [serverName, resources] of Object.entries(res)) {
  for (const resource of resources) {
    const content = await mcpClient.readResource(serverName, resource.uri);
    resourceContent += content[0].text;
  }
}

async function runAgentWithTools(query, maxIterations = 30) {
  const messages = [
    new SystemMessage(resourceContent),
    new HumanMessage({ content: query }),
  ];

  for (let i = 0; i < maxIterations; i++) {
    console.log(chalk.bgGreen(`⏳ 正在等待 AI 思考...`));
    const response = await modelWithTools.invoke(messages);
    messages.push(response);

    // 检查是否有工具调用
    if (!response.tool_calls || response.tool_calls.length === 0) {
      console.log(`\n✨ AI 最终回复:\n${response.content}\n`);
      return response.content;
    }

    console.log(
      chalk.bgBlue(`🔍 检测到 ${response.tool_calls.length} 个工具调用`),
    );
    console.log(
      chalk.bgBlue(
        `🔍 工具调用: ${response.tool_calls.map((t) => t.name).join(", ")}`,
      ),
    );
    // 执行工具调用
    for (let toolCall of response.tool_calls) {
      const tool = tools.find((t) => t.name === toolCall.name);
      if (tool) {
        const toolResult = await tool.invoke(toolCall.args);
        messages.push(
          new ToolMessage({ content: toolResult, tool_call_id: toolCall.id }),
        );
      }
    }
  }

  return messages[messages.length - 1].content;
}

// await runAgentWithTools("查一下用户 002 的信息");
await runAgentWithTools("'my-mcp-server' MCP Server 的使用指南是什么");

await mcpClient.close();
