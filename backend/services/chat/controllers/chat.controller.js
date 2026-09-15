import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import mongoose from "mongoose";

export const createConversation = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    console.log("userId", userId);
    const conversation = await Conversation.create({
      userId: userId
    });

    res.json(conversation);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

export const getConversations = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const conversations = await Conversation.find({
      userId: userId
    }).sort({
      updatedAt: -1
    });

    res.json(conversations);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

export const saveMessage = async (req, res) => {
  try {
    const {
      conversationId,
      role,
      content,
      images,
      artifacts
    } = req.body;

    const message = await Message.create({
      conversationId,
      role,
      images,
      content,
      artifacts: artifacts || []
    });

    res.json(message);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || id === "undefined" || !mongoose.Types.ObjectId.isValid(id)) {
      return res.json([]);
    }

    const messages = await Message.find({
      conversationId: id
    }).sort({
      createdAt: 1
    });

    res.json(messages);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

export const updateConversation = async (req, res) => {
  try {
    const { conversationId, title } = req.body;
    if (!conversationId || conversationId === "undefined" || !mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ message: "Invalid conversation ID" });
    }
    const conversation = await Conversation.findByIdAndUpdate(conversationId, {
      title
    }, { new: true });
    res.json(conversation);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};