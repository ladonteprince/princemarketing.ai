import { NextRequest } from "next/server";
import { z } from "zod";
import { success, badRequest, serverError } from "@/lib/apiResponse";

// ---------------------------------------------------------------------------
// Production Brain Query — /api/v1/brain/query
// WHY: Standalone RAG endpoint the .com chat layer (AI Strategist) can hit
// to consult the 125-vector research corpus. Same Pinecone index + embedding
// model as the Gemini Director, but exposed as a general-purpose tool so
// Claude can cite research when making creative/strategic decisions.
// ---------------------------------------------------------------------------

const GEMINI_MODEL_UNUSED = null; // brain query doesn't call Gemini — pure RAG
void GEMINI_MODEL_UNUSED;

const PINECONE_HOST =
  "https://prince-production-brain-ya8e9us.svc.aped-4627-b74a.pinecone.io";
const PINECONE_NS = "production-research";

const schema = z.object({
  query: z.string().min(5).max(500),
  topK: z.number().int().min(1).max(10).optional(),
  minScore: z.number().min(0).max(1).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid request", parsed.error.flatten());
    }

    const { query, topK = 5, minScore = 0.35 } = parsed.data;

    const openaiKey = process.env.OPENAI_API_KEY;
    const pineconeKey = process.env.PINECONE_API_KEY;

    if (!openaiKey || !pineconeKey) {
      return serverError("Brain not configured (missing API keys)");
    }

    // Embed the query
    const embedRes = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-large",
        input: query,
      }),
    });

    if (!embedRes.ok) {
      return serverError(`Embedding failed: ${embedRes.status}`);
    }

    const embedData = (await embedRes.json()) as {
      data: Array<{ embedding: number[] }>;
    };
    const vector = embedData.data[0]?.embedding;
    if (!vector) {
      return serverError("Embedding returned no vector");
    }

    // Query Pinecone
    const searchRes = await fetch(`${PINECONE_HOST}/query`, {
      method: "POST",
      headers: {
        "Api-Key": pineconeKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        namespace: PINECONE_NS,
        vector,
        topK,
        includeMetadata: true,
      }),
    });

    if (!searchRes.ok) {
      return serverError(`Pinecone query failed: ${searchRes.status}`);
    }

    const searchData = (await searchRes.json()) as {
      matches?: Array<{
        id: string;
        score: number;
        metadata?: {
          content?: string;
          source?: string;
          section?: string;
        };
      }>;
    };

    const matches = (searchData.matches ?? [])
      .filter((m) => m.score >= minScore)
      .map((m) => ({
        id: m.id,
        score: m.score,
        content: m.metadata?.content ?? "",
        source: m.metadata?.source ?? "unknown",
        section: m.metadata?.section ?? "",
      }));

    return success({
      query,
      count: matches.length,
      matches,
    });
  } catch (err) {
    console.error("[Brain/Query] Error:", err);
    return serverError(
      err instanceof Error ? err.message : "Brain query failed",
    );
  }
}
