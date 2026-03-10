import { FileSystemChatMessageHistory } from "@langchain/community/stores/message/file_system";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import "dotenv/config";
import path from "node:path";

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

async function fileMemoryDemo() {
  // 指定文件路径
  const filePath = path.join(process.cwd(), "chat_history.json");
  const sessionId = "user_session_001";

  const history = new FileSystemChatMessageHistory({
    filePath,
    sessionId,
  });

  const systemMessage = new SystemMessage(
    "你是一个友好、幽默的做菜助手，喜欢分享美食和烹饪技巧。",
  );

  // 第一轮对话
  console.log("[第一轮对话]");
  const userMessage1 = new HumanMessage("红烧肉怎么做");
  await history.addMessage(userMessage1);
  const message1 = [systemMessage, ...(await history.getMessages())];
  const response1 = await model.invoke(message1);
  await history.addMessage(response1);

  console.log(`用户: ${userMessage1.content}`);
  console.log(`助手: ${response1.content}`);
  console.log(`✓ 对话已保存到文件: ${filePath}\n`);

  // 第二轮对话，基于历史记录
  console.log("\n[第二轮对话]");
  const userMessage2 = new HumanMessage("好吃吗？");
  await history.addMessage(userMessage2);
  const message2 = [systemMessage, ...(await history.getMessages())];
  const response2 = await model.invoke(message2);
  await history.addMessage(response2);

  console.log(`用户: ${userMessage2.content}`);
  console.log(`助手: ${response2.content}`);
  console.log(`✓ 对话已更新到文件\n`);

  // 展示所有历史消息
  const allMessages = await history.getMessages();
  console.log(`共保存了 ${allMessages.length} 条消息:`);
  allMessages.forEach((msg, i) => {
    const type = msg.type === "human" ? "用户" : "助手";
    console.log(`${i + 1}. [${type}] ${msg.content}`);
  });
}

fileMemoryDemo().catch(console.error);
