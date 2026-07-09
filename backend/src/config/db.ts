import mongoose from "mongoose";
import { MONGODB_URI } from "./env";

export async function connectDb() {
    if(!MONGODB_URI) {
        throw new Error("MONGO DB URI is not set")
    }

    mongoose.connection.on("connected", () => {
        console.log("✅ Mongoose connected to MongoDB");
    });

    mongoose.connection.on("error", (err) => {
        console.error("❌ Mongoose connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
        console.warn("⚠️ Mongoose disconnected");
    });


    await mongoose.connect(MONGODB_URI, {
        maxPoolSize: 20,          // Allow up to 20 concurrent connections
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
    });
    console.log("Connected to MongoDB")
}