import { getModel } from "../utils/model.js";
import redis from "../../../shared/redis/redis.js";

export const routerNode =
async(state)=>{


if (
    state.agent &&
    state.agent !== "auto"
) {
    // For pdf_rag with no file, verify there's a cached PDF for this conversation
    if (state.agent === "pdf_rag" && !state.file) {
        const cached = await redis.get(`pdf-context:${state.conversationId}`);
        if (cached) {
            return { ...state, agent: "pdf_rag" };
        }
        // No cached PDF — fall through to let pdfRagAgent return the helpful message
        return { ...state, agent: "pdf_rag" };
    }
    return {
        ...state,
        agent: state.agent
    };
}


if(state.file){

    if(

        state.file.mimetype.startsWith("image/")

    ){

        return{

            ...state,

            agent:"vision"

        };

    }

}

if(state.file){

    if(state.file.mimetype==="application/pdf"){

        return{

            ...state,

            agent:"pdf_rag"

        };

    }

}

// Auto-mode: if a PDF was previously uploaded for this conversation, route to pdf_rag
if (!state.file) {
    const cachedPdf = await redis.get(`pdf-context:${state.conversationId}`);
    if (cachedPdf) {
        return { ...state, agent: "pdf_rag" };
    }
}


 const llm =
 getModel("router");

 const result =
 await llm.invoke(`

You are an agent router.

Available agents:

- chat
- search
- coding
- pdf
- image 

Rules:

chat:
General conversation,
explanations,
learning,
questions.

search:
Current events,
latest information,
news,
recent developments,
internet lookup.

coding:
Generate code,
debug code,
build projects,
architecture,
API design.

pdf:
Questions about generate PDFs
or document context.

Return ONLY one word:

chat
search
coding
pdf

User Query:

${state.prompt}

 `);

 return {

  ...state,

  agent:
  result.content
   .trim()
   .toLowerCase()

 };

};