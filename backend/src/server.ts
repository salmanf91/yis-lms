import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { connectDb } from "./config/db";
import { PORT } from "./config/env";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import lookupRoutes from "./routes/lookup.routes";
import curriculumRoutes from "./routes/curriculum.routes";
import lessonPlanRoutes from "./routes/lessonPlan.routes";
import roasterRoutes from "./routes/roaster.routes";
import timetableRoutes from "./routes/timetable.routes";
import reportRoutes from "./routes/report.routes";
import academicYearRoutes from "./routes/academicYear.routes";

// Auth endpoints: stricter limit (30 req / 15 min per IP)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' },
});

// General API: 300 req / 15 min per IP
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
});

async function main() {
    await connectDb();

    const app = express();

    // Security headers (CSP disabled — this is an API server, not serving HTML)
    app.use(helmet({ contentSecurityPolicy: false }));

    // CORS – allow all origins (internal/school network app)
    // Set ALLOWED_ORIGIN env var to lock down in production
    const allowedOrigin = process.env.ALLOWED_ORIGIN;
    app.use(cors(allowedOrigin ? { origin: allowedOrigin, credentials: true } : undefined));

    // Gzip compression for all responses
    app.use(compression());

    // Tighter body size limits (XML import needs more headroom; everything else is small)
    app.use('/api/roaster/import', express.json({ limit: '5mb' }));
    app.use('/api/curriculum/', express.json({ limit: '5mb' }));
    app.use('/api/lesson-plans/import', express.json({ limit: '10mb' }));
    app.use(express.json({ limit: '100kb' }));
    app.use(express.urlencoded({ extended: true, limit: '100kb' }));

    // Apply rate limiting
    app.use('/api/auth', authLimiter);
    app.use('/api', apiLimiter);

    app.get("/", (req, res) => {
        res.send("YIS LMS is running");
    });

    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/lookup', lookupRoutes);
    app.use('/api/curriculum', curriculumRoutes);
    app.use('/api/lesson-plans', lessonPlanRoutes);
    app.use('/api/roaster', roasterRoutes);
    app.use('/api/timetable', timetableRoutes);
    app.use('/api/reports', reportRoutes);
    app.use('/api/academic-years', academicYearRoutes);

    app.listen(PORT, () => {
        console.log(`Server listening on PORT ${PORT}`);
    });
}

main().catch((err) => {
    console.error("Failed to start Server", err.message);
});
