import { OpenAIEmbeddings } from "@langchain/openai";
import { MetricType, MilvusClient } from "@zilliz/milvus2-sdk-node";
import "dotenv/config";

const COLLECTION_NAME = "ai_daily";
const VECTOR_DIM = 1024;

const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.EMBEDDINGS_MODEL_NAME,
  configuration: {
    baseURL: process.env.OPENAI_API_BASE_URL,
  },
  dimensions: VECTOR_DIM,
});

const client = new MilvusClient({
  username: process.env.MILVUS_USERNAME,
  password: process.env.MILVUS_PASSWORD,
  address: process.env.MILVUS_ADDRESS,
});

async function getEmbedding(text) {
  const result = await embeddings.embedQuery(text);
  return result;
}

async function main() {
  try {
    console.log("Connecting to Milvus...");
    await client.connectPromise;
    console.log("Connected\n");

    // 向量搜索
    console.log("Searching for similar daily entires...");
    const query = "我想看看关于学习的日记";
    // const query = "我想看看关于做饭的日记";
    // const query = "我想看看关于户外活动的日记";
    console.log(`Querying: "${query}"\n`);

    const queryVector = await getEmbedding(query);
    const searchResults = await client.search({
      collection_name: COLLECTION_NAME,
      vector: queryVector,
      limit: 2,
      metric_type: MetricType.COSINE,
      output_fields: ["id", "content", "date", "mood", "tags"],
    });

    console.log(`Found ${searchResults.results.length} results:\n`);
    searchResults.results.forEach((item, index) => {
      console.log(`${index + 1}. [Score: ${item.score.toFixed(4)}]`);
      console.log(`   ID: ${item.id}`);
      console.log(`   Content: ${item.content}`);
      console.log(`   Date: ${item.date}`);
      console.log(`   Mood: ${item.mood}`);
      console.log(`   Tags: ${item.tags.join(", ")}`);
      console.log("");
    });
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main();
