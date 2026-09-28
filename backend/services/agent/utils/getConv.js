import axios from "axios";

const resolveUrl = (raw) => {
  if (!raw) return "http://localhost:8002";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.includes(".onrender.com")) return `https://${raw}`;
  if (raw.includes(":")) return `https://mulgents-chat-service.onrender.com`;
  return `http://${raw}`;
};

export const getConversationHistory =
async(conversationId)=>{

 const chatServiceUrl = resolveUrl(process.env.CHAT_SERVICE);

 const response =
 await axios.get(

 `${chatServiceUrl}/get-messages/${conversationId}`

 );

 return response.data;

};