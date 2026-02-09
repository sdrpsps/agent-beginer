import "dotenv/config";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { ChatOpenAI } from "@langchain/openai";
import {
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import chalk from "chalk";

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
    "amap-maps-streamableHTTP": {
      url: `https://mcp.amap.com/mcp?key=${process.env.AMAP_API_KEY}`,
    },
    filesystem: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", "./"],
    },
    "chrome-devtools": {
      command: "npx",
      args: ["-y", "chrome-devtools-mcp@latest"],
    },
  },
});

const res = await mcpClient.listResources();
let resourceContent = "";
for (const [serverName, resources] of Object.entries(res)) {
  for (const resource of resources) {
    const content = await mcpClient.readResource(serverName, resource.uri);
    resourceContent += content[0].text;
  }
}

const tools = await mcpClient.getTools();
const modelWithTools = model.bindTools(tools);

async function runWithTools(query, maxIterations = 30) {
  const message = [new SystemMessage(resourceContent), new HumanMessage(query)];

  for (let i = 0; i < maxIterations; i++) {
    console.log(chalk.bgGreen(`⏳ 正在等待 AI 思考...`));
    const response = await modelWithTools.invoke(message);
    message.push(response);

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
        `🔍 工具调用: ${response.tool_calls.map((t) => t.name).join(", ")}`,
      ),
    );

    // 执行工具调用
    for (let toolCall of response.tool_calls) {
      const tool = tools.find((t) => t.name === toolCall.name);
      if (tool) {
        const toolResult = await tool.invoke(toolCall.args);
        // 确保 content 是字符串类型
        let contentStr = "";
        if (typeof toolResult === "string") {
          contentStr = toolResult;
        } else if (
          toolResult &&
          toolResult.content &&
          Array.isArray(toolResult.content)
        ) {
          contentStr = toolResult.content
            .map((c) => (c.type === "text" ? c.text : ""))
            .join("\n");
        } else if (toolResult && toolResult.text) {
          contentStr = toolResult.text;
        } else {
          contentStr = JSON.stringify(toolResult);
        }
        message.push(
          new ToolMessage({ content: contentStr, tool_call_id: toolCall.id }),
        );
      }
    }
  }

  return message[message.length - 1].content;
}

// await runWithTools(
//   "广州南站附近的5个酒店，以及去的路线，生成路线规划文档保存文件到当前目录下",
// );
await runWithTools(
  "广州南站最近的3个酒店，拿到酒店图片，打开浏览器，展示每个酒店的图片，一个tab一个url展示，并且把对应的标题改为酒店名称",
);
await mcpClient.close();
