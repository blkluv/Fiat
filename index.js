import { clientErrorHandler, errorHandler, logErrors } from "./middlewares/errorHandlers.js";
import express from "express";
import amqp from "./controllers/amqp/index.js";
import cookieParser from "cookie-parser";
import cookieSession from "cookie-session";
import mongoose from "mongoose";
import passport from "passport";
import "./models/Artist.js";
import "./models/Favourite.js";
import "./models/Release.js";
import "./models/Sale.js";
import "./models/Play.js";
import "./models/StreamSession.js";
import "./models/User.js";
import "./models/Wishlist.js";
import "./controllers/passport.js";
import artists from "./routes/artistRoutes.js";
import artwork from "./routes/artworkRoutes.js";
import auth from "./routes/authRoutes.js";
import catalogue from "./routes/catalogueRoutes.js";
import { createServer } from "http";
import download from "./routes/downloadRoutes.js";
import email from "./routes/emailRoutes.js";
import socketio from "./controllers/socket.io.js";
import release from "./routes/releaseRoutes.js";
import track from "./routes/trackRoutes.js";
import user from "./routes/userRoutes.js";

const { COOKIE_KEY, MONGO_URI } = process.env;

const app = express();
const server = createServer(app);

// Socket.io
const io = socketio(server);
app.set("socketio", io);

// RabbitMQ
await amqp(io).catch(console.error);

// Mongoose
const db = mongoose.connection;
db.once("open", async () => console.log("[Mongoose] Connection open."));
db.on("disconnected", () => console.log("[Mongoose] Disconnected."));
db.on("close", () => console.log("[Mongoose] Connection closed."));
db.on("error", error => {
  console.log(`[Mongoose] Error: ${error.message}`);
  io.emit("error", { message: "Database connection error!" });
});

await mongoose.connect(MONGO_URI).catch(console.error);

// Express
app.use(express.json());
app.use(cookieParser(COOKIE_KEY));
app.use(cookieSession({ name: "gridFireSession", keys: [COOKIE_KEY], maxAge: 28 * 24 * 60 * 60 * 1000 }));
app.use(clientErrorHandler);
app.use(errorHandler);
app.use(logErrors);
app.use(passport.initialize());
app.use(passport.session());
app.use("/api/artists", artists);
app.use("/api/artwork", artwork);
app.use("/api/auth", auth);
app.use("/api/catalogue", catalogue);
app.use("/api/download", download);
app.use("/api/email", email);
app.use("/api/release", release);
app.use("/api/track", track);
app.use("/api/user", user);

process.on("SIGINT", () => {
  console.log("[Node] Gracefully shutting down from SIGINT (Ctrl-C)…");
  mongoose.connection.close(false, () => {
    io.close(() => {
      server.close(() => {
        console.log("[Express] Server closed.");
        process.exit(0);
      });
    });
  });
});

const port = process.env.PORT || 5000;
server.listen(port, () => console.log(`[Express] Server running on port ${port || 5000}.`));
