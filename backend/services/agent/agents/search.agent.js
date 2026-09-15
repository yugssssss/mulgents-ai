import { checkAgentLimit } from "../config/agentRateLimit.js";
import { deductCredits } from "../utils/deductCredits.js";
import { searchTool } from "../utils/tavily.js";



export const searchAgent =
async(state)=>{
// await checkAgentLimit(
//     state.userId,
//     "search"
//   );
  // await deductCredits(

  //       state.userId,

  //       "search"

  //   ); 
 try{

  const tavilyResponse =
  await searchTool.invoke({

 query:state.prompt

} );

console.log("Tavily raw response:", JSON.stringify(tavilyResponse, null, 2));

  // Extract images from top-level images array
  const images = tavilyResponse.images || [];

  // Build a clean text context for the LLM from the results array.
  // Each result has: url, title, content (scraped page text), score.
  const resultItems = (tavilyResponse.results || [])
    .map((r, i) =>
      `[Result ${i + 1}]\nTitle: ${r.title}\nURL: ${r.url}\nContent:\n${r.content}`
    )
    .join("\n\n---\n\n");

  // Tavily sometimes returns a direct answer field; use it if present.
  const tavilyAnswer = tavilyResponse.answer
    ? `Tavily Direct Answer: ${tavilyResponse.answer}\n\n`
    : "";

  const searchContext = tavilyAnswer + resultItems;

  return {

   ...state,

   // searchResults is now a plain string the LLM can read without any serialization issues
   searchResults: searchContext || "",

   // Pass images separately so the controller can forward them to the frontend
   searchImages: images,

  };

 }catch(error){

  console.log(error);

  return {

   ...state,

   searchResults: "",
   searchImages: [],

  };

 }

};
