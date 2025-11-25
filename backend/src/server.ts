import express from "express";
import cors from "cors";
import { connectDb } from "./config/db";
import { PORT } from "./config/env";
import  authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";

async function main() {
    await connectDb();

    const app = express();

    app.use(cors());
    app.use(express.json());

    app.get("/", (req, res) => {
        res.send("YIS LMS is running");
    })

    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);

    app.listen(PORT, () => {
        console.log(`Server listening on PORT ${PORT}`)
    })
}

main().catch((err) => {
    console.error("Failed to start Server", err.message)
})