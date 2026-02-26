import "dotenv/config";
import { parse } from "path";
import {
  MilvusClient,
  DataType,
  MetricType,
  IndexType,
} from "@zilliz/milvus2-sdk-node";
import { OpenAIEmbeddings } from "@langchain/openai";
import { EPubLoader } from "@langchain/community/document_loaders/fs/epub";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const COLLECTION_NAME = "ebook_collection";
const VECTOR_DIM = 1024;
const CHUNK_SIZE = 500; // 拆分到 500 个字符
const EPUB_FILE = "./天龙八部.epub";
// 从文件名提取书名（去掉扩展名）
const BOOK_NAME = parse(EPUB_FILE).name;

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

async function insertChunkBatch(chunks, bookId, chapterNum) {
  try {
    if (chunks.length === 0) {
      return 0;
    }

    // 为每个文档块生成向量并插入数据
    const insertData = await Promise.all(
      chunks.map(async (chunk, chunkIndex) => {
        const vector = await getEmbedding(chunk);
        return {
          id: `${bookId}_${chapterNum}_${chunkIndex}`,
          book_id: bookId,
          book_name: BOOK_NAME,
          chapter_num: chapterNum,
          index: chunkIndex,
          content: chunk,
          vector,
        };
      }),
    );

    const insertResult = await client.insert({
      collection_name: COLLECTION_NAME,
      data: insertData,
    });

    return Number(insertResult.insert_cnt) || 0;
  } catch (error) {
    console.error(`插入章节 ${chapterNum} 的数据时出错:`, error.message);
    console.error("错误详情:", error);
    throw error;
  }
}

async function loadAndProcessEPUBStreaming(bookId) {
  try {
    console.log(`开始加载 EPUB 文件：${EPUB_FILE}`);

    // 使用 epub loader 加载文件，按章节区分
    const loader = new EPubLoader(EPUB_FILE, { splitChapters: true });
    const documents = await loader.load();
    console.log(`加载完成，共 ${documents.length} 个章节`);

    // 创建文本拆分器
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: CHUNK_SIZE,
      chunkOverlap: 50,
    });

    let totalInsert = 0;

    for (
      let chapterIndex = 0;
      chapterIndex < documents.length;
      chapterIndex++
    ) {
      const chapter = documents[chapterIndex];
      const chapterContent = chapter.pageContent;

      console.log(`处理第 ${chapterIndex + 1}/${documents.length} 章`);
      const chunks = await textSplitter.splitText(chapterContent);
      console.log(`拆分成 ${chunks.length} 个片段`);

      if (chunks.length === 0) {
        console.log("跳过空章节");
        continue;
      }

      console.log("生成向量并插入中");
      const insertedCount = await insertChunkBatch(
        chunks,
        bookId,
        chapterIndex + 1,
      );
      totalInsert += insertedCount;
      console.log(`已插入 ${insertedCount} 个向量，累计 ${totalInsert} 个向量`);
    }

    console.log(`插入完成，共插入 ${totalInsert} 个向量`);
    return totalInsert;
  } catch (error) {
    console.error("加载 EPUB 文件时出错:", error.message);
    throw error;
  }
}

async function ensureCollection(bookId) {
  try {
    // 检查集合是否存在
    const hasCollection = await client.hasCollection({
      collection_name: COLLECTION_NAME,
    });

    if (!hasCollection.value) {
      console.log("创建集合");
      await client.createCollection({
        collection_name: COLLECTION_NAME,
        fields: [
          {
            name: "id",
            data_type: DataType.VarChar,
            max_length: 100,
            is_primary_key: true,
          },
          {
            name: "book_id",
            data_type: DataType.VarChar,
            max_length: 100,
          },
          {
            name: "book_name",
            data_type: DataType.VarChar,
            max_length: 200,
          },
          {
            name: "chapter_num",
            data_type: DataType.Int32,
          },
          {
            name: "index",
            data_type: DataType.Int32,
          },
          {
            name: "content",
            data_type: DataType.VarChar,
            max_length: 10000,
          },
          {
            name: "vector",
            data_type: DataType.FloatVector,
            dim: VECTOR_DIM,
          },
        ],
      });

      console.log("创建索引");
      await client.createIndex({
        collection_name: COLLECTION_NAME,
        field_name: "vector",
        index_type: IndexType.IVF_FLAT,
        metric_type: MetricType.COSINE,
        params: { nlist: 1024 },
      });
      console.log("索引创建成功");

      try {
        await client.loadCollection({ collection_name: COLLECTION_NAME });
        console.log("集合加载成功");
      } catch (error) {
        console.error("集合已加载", error.message);
      }
    }
  } catch (error) {
    console.error("创建集合Error:", error.message);
  }
}

async function main() {
  try {
    console.log("=".repeat(80));
    console.log("电子书处理");
    console.log("=".repeat(80));

    // 连接 milvus
    console.log("Connecting Milvus");
    await client.connectPromise;
    console.log("Connected to Milvus");

    const bookId = 1;
    // 确保集合存在
    await ensureCollection(bookId);
    // 加载并处理 EPUB 文件，流式处理
    await loadAndProcessEPUBStreaming(bookId);

    console.log("=".repeat(80));
    console.log("处理完成！");
    console.log("=".repeat(80));
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main();
