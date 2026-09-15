import { QdrantVectorStore } from "@langchain/qdrant";
import { embeddings } from "./embedding.js";

const createFallbackVectorStore = (docs) => {
  return {
    similaritySearch: async (query, k = 5) => {
      const stopWords = new Set([
        "a", "an", "the", "and", "or", "but", "if", "because", "as", "what", "which",
        "who", "whom", "this", "that", "these", "those", "am", "is", "are", "was",
        "were", "be", "been", "being", "have", "has", "had", "do", "does", "did",
        "to", "from", "in", "out", "on", "off", "over", "under", "again", "further",
        "then", "once", "here", "there", "when", "where", "why", "how", "all", "any",
        "both", "each", "few", "more", "most", "other", "some", "such", "no", "nor",
        "not", "only", "own", "same", "so", "than", "too", "very", "can", "will",
        "just", "should", "now", "rate", "rating", "score", "evaluate", "out", "of", "10"
      ]);

      const queryTerms = query.toLowerCase().split(/\W+/).filter(t => t.length > 1 && !stopWords.has(t));
      const termsToUse = queryTerms.length > 0 ? queryTerms : query.toLowerCase().split(/\W+/).filter(t => t.length > 2);

      const scored = docs.map(doc => {
        const text = doc.pageContent.toLowerCase();
        let score = 0;
        for (const term of termsToUse) {
          if (text.includes(term)) {
            score += 1;
          }
        }
        return { doc, score };
      });
      scored.sort((a, b) => b.score - a.score);
      const topDocs = scored.slice(0, k).map(s => s.doc);
      return topDocs.length > 0 ? topDocs : docs.slice(0, k);
    }
  };
};

export const createVectorStore = async (collectionName, docs) => {
  try {
    return await QdrantVectorStore.fromDocuments(
      docs,
      embeddings,
      {
        url: process.env.QDRANT_URL,
        apiKey: process.env.QDRANT_API_KEY,
        collectionName,
        clientOptions: {
          checkCompatibility: false
        }
      }
    );
  } catch (error) {
    console.warn("Qdrant vector store connection failed, using local document store fallback:", error.message);
    return createFallbackVectorStore(docs);
  }
};