import mongoose from "mongoose";

 const connectDB = async () => {
    if (!process.env.MONGODB_URL) {
        console.error("❌ CRITICAL ERROR: MONGODB_URL is not set in environment variables!");
        return;
    }
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log("✅ DB Connected");
    } catch (error) {
        console.log("❌ Db Error", error);
    }
};

export default connectDB