require("dotenv-safe").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const authRouter = require("./route/userRoute");
const courseRoute = require("./route/courseRoute");
const connectDb = require("./utils/connectDb");
const routeNotFound = require("./middleware/notFound");
const cloudinary = require("cloudinary").v2;
const fileUpload = require("express-fileupload");



const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = process.env.CORS_ORIGIN.split(",");

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.use(fileUpload({ useTempFiles: true })); 

// Routes
app.use("/api", authRouter);
app.use("/api", courseRoute);

app.get("/health", (req, res) => res.status(200).send("OK"));

const startServer = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in environment variables.");
    }

    await connectDb(process.env.MONGO_URI);

    app.use(routeNotFound);

    const server = app.listen(PORT, () => {
      console.log(`Listening on port ${PORT}`);
    });

    const shutdown = (signal) => {
      console.log(`Received ${signal}. Shutting down...`);
      server.close(() => {
        console.log("Server closed. Exiting process.");
        mongoose.connection.close();
        process.exit(0);
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error("Error starting server:", error);
  }
};

startServer();
