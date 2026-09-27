import Razorpay from "razorpay";
import dotenv from "dotenv";

dotenv.config();

const key_id = process.env.RAZORPAY_KEY_ID || "dummy_key_id";
const key_secret = process.env.RAZORPAY_KEY_SECRET || "dummy_key_secret";

const razorpay = new Razorpay({
    key_id,
    key_secret
});

export default razorpay;