import api from "../utils/axios";


export const getMessages = async (conversationId) => {
  if (!conversationId || conversationId === "undefined") {
    return [];
  }

  const { data } = await api.get(`/api/chat/get-messages/${conversationId}`);
  console.log(data);
  return data;
};