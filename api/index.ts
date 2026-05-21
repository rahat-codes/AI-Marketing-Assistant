import express, { Request, Response } from "express";
import cors from "cors";
import {
  backendGenerateMarketingContent,
  backendGenerateImageFromIdea,
  backendGenerateVeoVideo,
  backendGetVideoStatus,
  backendDownloadVideoUrl,
  backendGetChatResponse,
  backendFindBusinessLocation,
  backendSuggestCampaignDetails
} from "../services/backendGemini";

const app = express();

// Increase JSON payload limit to handle base64 image uploads for video studio
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

app.use(cors());

// API healthcheck
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// 1. Generate marketing content
app.post("/api/marketing", async (req: Request, res: Response) => {
  try {
    const { profile, campaign } = req.body;
    if (!profile || !campaign) {
      res.status(400).json({ error: "Missing business profile or campaign details" });
      return;
    }
    const result = await backendGenerateMarketingContent(profile, campaign);
    res.json(result);
  } catch (error: any) {
    console.error("Marketing generation error:", error);
    res.status(500).json({ error: error.message || "Failed to generate marketing content" });
  }
});

// 2. Generate image
app.post("/api/image", async (req: Request, res: Response) => {
  try {
    const { visualDescription, style } = req.body;
    if (!visualDescription) {
      res.status(400).json({ error: "Missing visual description" });
      return;
    }
    const result = await backendGenerateImageFromIdea(visualDescription, style || "");
    res.json({ image: result });
  } catch (error: any) {
    console.error("Image generation error:", error);
    res.status(500).json({ error: error.message || "Failed to generate image" });
  }
});

// 3. Start Video operation
app.post("/api/video-start", async (req: Request, res: Response) => {
  try {
    const { prompt, aspectRatio, imageBase64 } = req.body;
    const operationName = await backendGenerateVeoVideo(prompt, aspectRatio || "16:9", imageBase64);
    res.json({ operationName });
  } catch (error: any) {
    console.error("Video start error:", error);
    res.status(500).json({ error: error.message || "Failed to initiate video generation" });
  }
});

// 4. Poll Video status
app.post("/api/video-status", async (req: Request, res: Response) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
      res.status(400).json({ error: "Missing operation name" });
      return;
    }
    const done = await backendGetVideoStatus(operationName);
    res.json({ done });
  } catch (error: any) {
    console.error("Video status error:", error);
    res.status(500).json({ error: error.message || "Failed to inspect video status" });
  }
});

// 5. Download Video content
app.post("/api/video-download", async (req: Request, res: Response) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
      res.status(400).json({ error: "Missing operation name" });
      return;
    }
    const uri = await backendDownloadVideoUrl(operationName);
    
    // Fetch from Google endpoint using the server-side API Key
    const fetchUrl = uri.includes("&key=") ? uri : `${uri}&key=${process.env.GEMINI_API_KEY}`;
    const videoRes = await fetch(fetchUrl);
    
    if (!videoRes.ok) {
      throw new Error(`Failed to download original video resource: ${videoRes.statusText}`);
    }

    const arrayBuffer = await videoRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (error: any) {
    console.error("Video download error:", error);
    res.status(500).json({ error: error.message || "Failed to download video file" });
  }
});

// 6. Chat bot Q&A
app.post("/api/chat", async (req: Request, res: Response) => {
  try {
    const { history, message, language } = req.body;
    if (!message) {
      res.status(400).json({ error: "Missing chat user message" });
      return;
    }
    const responseText = await backendGetChatResponse(history || [], message, language || "English (US)");
    res.json({ text: responseText });
  } catch (error: any) {
    console.error("Chatbot processing error:", error);
    res.status(500).json({ error: error.message || "Failed to process chat response" });
  }
});

// 7. Grounding Maps location search
app.post("/api/location", async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    if (!query) {
      res.status(400).json({ error: "Missing search query" });
      return;
    }
    const address = await backendFindBusinessLocation(query);
    res.json({ address });
  } catch (error: any) {
    console.error("Location search error:", error);
    res.status(500).json({ error: error.message || "Failed to verify location details" });
  }
});

// 8. Grounding profile details campaign suggests
app.post("/api/suggest", async (req: Request, res: Response) => {
  try {
    const { profile } = req.body;
    if (!profile) {
      res.status(400).json({ error: "Missing profile context" });
      return;
    }
    const result = await backendSuggestCampaignDetails(profile);
    res.json(result);
  } catch (error: any) {
    console.error("Campaign suggestions error:", error);
    res.status(500).json({ error: error.message || "Failed to compile campaign options" });
  }
});

export default app;
