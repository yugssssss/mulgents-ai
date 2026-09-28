import redis from "../../../shared/redis/redis.js";
import { graph } from "../graph/supervisor.graph.js";
import { addMessage } from "../utils/memory.js";
import axios from "axios";
import fs from "fs/promises";
import { uploadToS3 } from "../utils/uploadToS3.js";
import { getDownloadUrl } from "../utils/getDownloadUrl.js";

const resolveUrl = (raw) => {
  if (!raw) return "http://localhost:8002";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.includes(".onrender.com")) return `https://${raw}`;
  if (raw.includes(":")) return `https://mulgents-chat-service.onrender.com`;
  return `http://${raw}`;
};

export const chat =
async(req,res,next)=>{

 try{

  const {

   prompt,

   conversationId,

   agent

} = req.body;

console.log(req.body)
console.log(req.file)

let userImages = [];
if (req.file && req.file.mimetype && req.file.mimetype.startsWith("image/")) {
  try {
    const fileBuffer = await fs.readFile(req.file.path);
    const fileName = `upload-${Date.now()}-${req.file.originalname}`;
    await uploadToS3(fileBuffer, fileName, req.file.mimetype);
    const imageUrl = await getDownloadUrl(fileName, 7 * 24 * 60 * 60);
    userImages.push(imageUrl);
  } catch (err) {
    console.error("Failed to upload user image to S3:", err);
  }
}

await addMessage(
 conversationId,
 "user",
 prompt
);

const chatServiceUrl = resolveUrl(process.env.CHAT_SERVICE);

await axios.post(`${chatServiceUrl}/save-message`,{
  conversationId,
  role:"user",
  content:prompt,
  images: userImages
});

  const result =
  await graph.invoke({

   prompt,

   conversationId,

   userId:
   req.headers[
    "x-user-id"
   ],
   agent,
   file:req.file

  });


  console.log("after res",result)


  await addMessage(
 conversationId,
 "assistant",
 result.response
);
await axios.post(
 `${chatServiceUrl}/save-message`,
 {
  conversationId,
  role:"assistant",
  content:result.response,
  images:result.images,
  artifacts:
  result.artifacts || []
 }
)

  return res.json({

 success:true,

 answer:
 result.response,
 images:result.images,
 artifacts:
 result.artifacts || []

});

 }catch(error){

  next(error)

 }

}