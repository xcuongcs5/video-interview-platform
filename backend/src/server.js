import express from 'express';
import path from 'path';
import {ENV} from './lib/env.js'
import { connectDB } from './lib/db.js';
import {serve} from 'inngest/express';
import cors from 'cors';
import { inngest, functions } from './lib/inngest.js';
import { clerkMiddleware } from '@clerk/express'
import chatRoutes from './routes/chatRoutes.js';
import sessionRoutes from './routes/sessionRoute.js';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: ENV.CLIENT_URL,
        credentials: true
    }
});

io.on("connection", (socket) => {
    console.log("Client connected to socket:", socket.id);

    socket.on("join_room", (sessionId) => {
        socket.join(sessionId);
        console.log(`Socket ${socket.id} joined room ${sessionId}`);
    });

    socket.on("code_change", ({ sessionId, code }) => {
        socket.to(sessionId).emit("code_update", { code });
    });

    socket.on("language_change", ({ sessionId, language }) => {
        socket.to(sessionId).emit("language_update", { language });
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });
});

const __dirname = path.resolve()

// middleware
app.use(express.json());

app.use(cors({origin:ENV.CLIENT_URL, credentials:true}));

app.use(clerkMiddleware());

app.use("/api/inngest", serve({ client: inngest, functions }));

app.use("/api/chat", chatRoutes);

app.use("/api/sessions", sessionRoutes)

app.get("/health", (req, res) => {
    res.status(200).json({mes: "api is up and running"});
});

if (ENV.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname,"../frontend/dist")));

    app.get("/{*any}", (req, res) => {
        res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
    })
}



const startServer = async() => {
    try {
        await connectDB();
        httpServer.listen(ENV.PORT, () => {
            console.log(`Server is running on port: ${ENV.PORT}`);
        });
    } catch (error) {
        console.error("Error starting the server!", error)
    }
}

startServer();