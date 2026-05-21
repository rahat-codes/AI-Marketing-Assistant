import { GoogleGenAI, Type, GenerateVideosOperation } from "@google/genai";
import { BusinessProfile, CampaignDetails, GeneratedVariant } from "../types";

// Keep API key server-side only
let _ai: GoogleGenAI | null = null;
const getAi = (): GoogleGenAI => {
  if (!_ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    _ai = new GoogleGenAI({
      apiKey: apiKey || "dummy-key-for-start-up",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return _ai;
};

// Shared Gemini client with required User-Agent (wrapped in a proxy for lazy evaluation)
const ai = new Proxy({} as GoogleGenAI, {
  get(_, prop) {
    const client = getAi();
    const value = (client as any)[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  }
});

export const backendGenerateMarketingContent = async (
  profile: BusinessProfile,
  campaign: CampaignDetails
): Promise<GeneratedVariant[]> => {
  const modelId = "gemini-3.5-flash"; // Use the standard, modern flash model

  const prompt = `
    Act as a world-class marketing copywriter for local small businesses.
    Create 3 distinct marketing content variants based on the following details:

    Business Name: ${profile.name}
    Business Type: ${profile.type}
    Location: ${profile.location}
    Target Audience: ${profile.audience}
    Business Description: ${profile.description}
    Brand Tone: ${profile.tone}
    Language: ${profile.language}

    Campaign Type: ${campaign.type}
    Target Platforms: ${campaign.platforms.join(", ")}
    Special Offers/Keywords: ${campaign.keywords}
    Content Length Preference: ${campaign.length < 33 ? "Short & Punchy" : campaign.length > 66 ? "Long & Detailed" : "Medium Balanced"}

    IMPORTANT: Ensure all generated text (Headlines, Post Copy, Hashtags, Visual Ideas, and Engagement Tips) is strictly written in ${profile.language}.

    For each variant, provide:
    1. A catchy headline.
    2. The main post copy (include emojis if the tone fits).
    3. A list of relevant hashtags.
    4. A visual idea (description of image/video).
    5. Tips for engagement.
  `;

  const response = await ai.models.generateContent({
    model: modelId,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING },
            postCopy: { type: Type.STRING },
            hashtags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            visualIdea: { type: Type.STRING },
            engagementTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["headline", "postCopy", "hashtags", "visualIdea", "engagementTips"],
        },
      },
    },
  });

  if (response.text) {
    return JSON.parse(response.text) as GeneratedVariant[];
  }
  throw new Error("No content generated");
};

export const backendGenerateImageFromIdea = async (
  visualDescription: string,
  style: string = ""
): Promise<string> => {
  const finalPrompt = style
    ? `${style} style image. ${visualDescription}`
    : `Professional photography, high quality, commercial marketing image: ${visualDescription}`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: finalPrompt }]
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1"
      }
    }
  });

  if (!response.candidates || response.candidates.length === 0) {
    throw new Error("The AI did not return any image candidates.");
  }

  const candidate = response.candidates[0];

  if (candidate.finishReason && candidate.finishReason !== "STOP" && candidate.finishReason !== "MAX_TOKENS") {
    throw new Error(`Image generation was blocked. Reason: ${candidate.finishReason}. Please try a different prompt.`);
  }

  if (!candidate.content || !candidate.content.parts) {
    throw new Error("The generated content is empty.");
  }

  for (const part of candidate.content.parts) {
    if (part.inlineData && part.inlineData.data) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image was generated. The response did not contain image data.");
};

export const backendGenerateVeoVideo = async (
  prompt: string,
  aspectRatio: '16:9' | '9:16',
  imageBase64?: string
): Promise<string> => {
  const model = 'veo-3.1-lite-generate-preview'; // Recommended General Video Generation Model

  const config = {
    numberOfVideos: 1,
    resolution: '720p',
    aspectRatio: aspectRatio
  };

  let imagePart;
  if (imageBase64) {
    const match = imageBase64.match(/^data:(.+);base64,(.+)$/);
    if (match) {
      imagePart = {
        mimeType: match[1],
        imageBytes: match[2]
      };
    }
  }

  const operation = imagePart
    ? await ai.models.generateVideos({
        model,
        prompt: prompt || "Animate this image",
        image: imagePart,
        config
      })
    : await ai.models.generateVideos({
        model,
        prompt,
        config
      });

  if (!operation.name) {
    throw new Error("Failed to start video operation - no operation name received");
  }

  return operation.name;
};

export const backendGetVideoStatus = async (operationName: string): Promise<boolean> => {
  const op = new GenerateVideosOperation();
  op.name = operationName;
  const updated = await ai.operations.getVideosOperation({ operation: op });
  return !!updated.done;
};

export const backendDownloadVideoUrl = async (operationName: string): Promise<string> => {
  const op = new GenerateVideosOperation();
  op.name = operationName;
  const updated = await ai.operations.getVideosOperation({ operation: op });
  const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
  if (!uri) throw new Error("No video URI returned on completed operation");
  return uri;
};

export const backendGetChatResponse = async (
  history: { role: string; parts: { text: string }[] }[],
  message: string,
  language: string = 'English (US)'
): Promise<string> => {
  const chat = ai.chats.create({
    model: 'gemini-3.5-flash', // Fully free chat model
    history: history,
    config: {
      systemInstruction: `You are a helpful AI marketing assistant. You must always reply in ${language}.`
    }
  });

  const result = await chat.sendMessage({ message });
  return result.text || "I'm not sure how to respond to that.";
};

export const backendFindBusinessLocation = async (query: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: `Find the precise address and location details for: "${query}". If you find a business, return its full address. If you find a city/area, return that. Return ONLY the address/location string.`,
    config: {
      tools: [{ googleMaps: {} }],
    },
  });

  return response.text?.trim() || "";
};

export const backendSuggestCampaignDetails = async (
  profile: BusinessProfile
): Promise<{ keywords: string; type: string }> => {
  const prompt = `
    Analyze this business profile:
    Name: ${profile.name}
    Type: ${profile.type}
    Audience: ${profile.audience}
    Description: ${profile.description}
    Tone: ${profile.tone}

    Suggest a list of 3-5 high-impact marketing keywords/phrases and the most suitable campaign type.
    Available types: Promotion, Announcement, Event, Educational.

    Return valid JSON object: { "keywords": "string (comma separated)", "type": "string (one of the types)" }
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          keywords: { type: Type.STRING },
          type: { type: Type.STRING }
        },
        required: ["keywords", "type"]
      }
    }
  });

  if (response.text) {
    return JSON.parse(response.text);
  }
  throw new Error("No suggestion generated");
};
