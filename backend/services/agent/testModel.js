import { getModel } from "./utils/model.js";
import { HumanMessage } from "@langchain/core/messages";

async function test() {
  const llm = getModel("chat");
  const response = await llm.invoke([new HumanMessage("What is 2+2? Think step by step.")]);
  console.log("Response content type:", typeof response.content);
  console.log("Is array?", Array.isArray(response.content));
  console.log("Response content:", response.content);
  console.log("Additional kwargs:", response.additional_kwargs);
}
test();
