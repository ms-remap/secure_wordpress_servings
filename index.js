require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const fetch = require('node-fetch');

const app = express();

app.use(express.json());

// ===== CONFIGURATION =====

// List of allowed frontend domains
const allowedOrigins = [
    "https://remap.ai",
    "https://busi.chat",
    "https://useprivate.ai",
];

// API Key from env
const API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL =  process.env.GEMINI_MODEL;

if (!API_KEY) {
    console.error("❌ ERROR: GEMINI_API_KEY missing from .env file");
    process.exit(1);
}

// ===== SECURITY: CORS CONTROL =====

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) === -1) {
            return callback(
                new Error("CORS policy: This origin is not allowed"),
                false
            );
        }

        return callback(null, true);
    }
}));

// ===== RATE LIMITING =====

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // max 100 requests per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: "Too many requests, please try again later."
    }
});

app.use("/api/", apiLimiter);

// ===== VALIDATION FUNCTION =====

function validatePrompt(prompt) {
    if (!prompt) return "Prompt is required";
    if (typeof prompt !== "string") return "Prompt must be a string";
    if (prompt.length < 5) return "Prompt too short";
    if (prompt.length > 8000) return "Prompt too long (max 8000 characters)";
    return null;
}

// ===== MAIN AI ENDPOINT =====

app.post('/api/generate', async (req, res) => {
    try {
        const { prompt } = req.body;

        // Validate input
        const validationError = validatePrompt(prompt);
        if (validationError) {
            return res.status(400).json({
                error: validationError
            });
        }

        // Forward request to Gemini API
        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                { text: prompt }
                            ]
                        }
                    ]
                })
            }
        );

        const data = await geminiResponse.json();

        // Basic error handling from Gemini
        if (!geminiResponse.ok) {
            console.error("Gemini API Error:", data);
            return res.status(500).json({
                error: "AI service error",
                details: data
            });
        }

        // Return raw Gemini response back to WordPress
        res.json(data);

    } catch (error) {
        console.error("Server Error:", error);

        res.status(500).json({
            error: "Internal server error"
        });
    }
});

// ===== SIMPLE ROOT ROUTE =====
app.get('/', (req, res) => {
    res.send("✅ AI Middleware Server Started!");
});

// ===== HEALTH CHECK =====
app.get('/api/health', (req, res) => {
    res.json({
        status: "ok",
        message: "AI Middleware is running"
    });
});

// ===== START SERVER =====

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 AI Middleware running on port ${PORT}`);
});
