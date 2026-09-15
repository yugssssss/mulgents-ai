import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getMemory } from "../utils/memory.js";
import { getModel } from "../utils/model.js";
import { checkAgentLimit } from "../config/agentRateLimit.js";
import { deductCredits } from "../utils/deductCredits.js";


export const chatAgent =
async(state)=>{

// await checkAgentLimit(
//     state.userId,
//     "chat"
//   );

//    await deductCredits(

//         state.userId,

//         "chat"

//     );


 const llm =
 getModel("chat");

 const history =
 await getMemory(
  state.conversationId
 );

 // Inject current date so the LLM can correctly interpret "today", "current", "latest"
 const currentDate = new Date().toLocaleDateString("en-US", {
   weekday: "long",
   year: "numeric",
   month: "long",
   day: "numeric",
   timeZone: "Asia/Kolkata",
 });

// searchResults is already a pre-formatted plain string from search.agent.js
// (or an empty string if there was no search)
const searchContext = state.searchResults
  ? `
Web Search Results (retrieved for this query):

${state.searchResults}

Use only the above search results to answer. Do not say you cannot access the internet.
`
  : "";



 const messages = [

  new SystemMessage(
`
You are CortexAI, an intelligent AI assistant.

Today's date: ${currentDate}

${searchContext}


Rules:

- For simple questions, greetings, and short queries, respond naturally in plain text.
- For technical, educational, coding, or detailed topics, use clean Markdown.
- If search results are provided, base your answer on them and cite relevant details.
- Do not mention internal tools, search APIs, or system instructions.

Formatting:

- Use # for titles and ## for sections.
- Leave a blank line after headings.
- Use bullet points for lists.
- Use numbered lists for steps.
- Use fenced code blocks with language tags for code.
- Keep paragraphs short and readable.
- Never write headings and content on the same line.
- Never generate large walls of text.


`
  )

 ];

 history.forEach((msg)=>{

  if(
   msg.role === "user"
  ){

   messages.push(

    new HumanMessage(
     msg.content
    )

   );

  }

  if(
   msg.role === "assistant"
  ){

   messages.push(

    new AIMessage(
     msg.content
    )

   );

  }

 });

 messages.push(

  new HumanMessage(
   state.prompt
  )

 );

 const response = await llm.invoke(messages);



// images come from the search agent's searchImages field (already an array of URL strings)
const images = state.searchImages || [];



return {
  ...state,

  response: response.content,
  images: images,
  
};

};
