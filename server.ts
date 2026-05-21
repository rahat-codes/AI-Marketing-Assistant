import path from "path";
import express from "express";
import apiApp from "./api/index"; // Import our API routes dynamically

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 1. Mount API routes FIRST
  app.use(apiApp);

  // 2. Vite middleware or static delivery
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite Middleware...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server loaded and active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
