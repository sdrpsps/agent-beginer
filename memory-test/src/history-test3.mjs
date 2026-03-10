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

  const restoredMessages = await history.getMessages();
  console.log(`从文件恢复了 ${restoredMessages.length} 条历史消息`);

  restoredMessages.forEach((msg, i) => {
    const type = msg.type === "human" ? "用户" : "助手";
    console.log(`${i + 1}. [${type}] ${msg.content}`);
  });

  // 第三轮对话
  console.log("[第三轮对话]");
  const userMessage3 = new HumanMessage("需要哪些食材");
  await history.addMessage(userMessage3);
  const message3 = [systemMessage, ...(await history.getMessages())];
  const response3 = await model.invoke(message3);
  await history.addMessage(response3);

  console.log(`用户: ${userMessage3.content}`);
  console.log(`助手: ${response3.content}`);
  console.log(`✓ 对话已更新到文件\n`);
}

fileMemoryDemo().catch(console.error);
