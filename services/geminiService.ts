

import { GoogleGenAI, Type } from "@google/genai";
import { BusinessProfile, CampaignDetails, GeneratedVariant } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateMarketingContent = async (
  profile: BusinessProfile,
  campaign: CampaignDetails
): Promise<GeneratedVariant[]> => {
  const modelId = "gemini-2.5-flash";

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

  try {
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
  } catch (error) {
    console.error("Gemini generation error:", error);
    // Fallback mock data in case of API failure or rate limit for demo purposes
    return [
      {
        headline: "Error Generating Content",
        postCopy: "We couldn't reach the AI service. Please check your connection or API key.",
        hashtags: ["#error", "#tryagain"],
        visualIdea: "An error icon",
        engagementTips: ["Try refreshing the page"],
      },
    ];
  }
};

export const generateImageFromIdea = async (visualDescription: string, style: string = ''): Promise<string> => {
  try {
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
      console.error("Image generation failed: No candidates returned.", { response });
      throw new Error("The AI did not return any image candidates.");
    }
    
    const candidate = response.candidates[0];
    
    // Check if generation was stopped for a reason other than success.
    if (candidate.finishReason && candidate.finishReason !== "STOP" && candidate.finishReason !== "MAX_TOKENS") {
       console.error(`Image generation stopped. Reason: ${candidate.finishReason}`, { candidate });
       throw new Error(`Image generation was blocked. Reason: ${candidate.finishReason}. Please try a different prompt.`);
    }

    if (!candidate.content || !candidate.content.parts) {
       console.error("Image generation failed: Candidate has no content parts.", { candidate });
       throw new Error("The generated content is empty.");
    }

    // Find the image data in the response parts.
    for (const part of candidate.content.parts) {
      if (part.inlineData && part.inlineData.data) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    
    // If the loop completes without finding image data, the response structure is unexpected.
    console.error("Image generation failed: No image data found in the response parts.", { response });
    throw new Error("No image was generated. The response did not contain image data.");

  } catch (error) {
    // Log the underlying error and re-throw for the UI to handle.
    console.error("An error occurred during image generation:", error);
    throw error;
  }
};

export const generateVeoVideo = async (
  prompt: string,
  aspectRatio: '16:9' | '9:16',
  imageBase64?: string
): Promise<string> => {
  // Create a fresh instance to pick up the latest API key if selected dynamically
  const freshAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    let operation;
    const model = 'veo-3.1-fast-generate-preview';
    
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

    if (imagePart) {
      operation = await freshAi.models.generateVideos({
        model,
        prompt: prompt || "Animate this image",
        image: imagePart,
        config
      });
    } else {
      operation = await freshAi.models.generateVideos({
        model,
        prompt,
        config
      });
    }

    // Poll for completion
    while (!operation.done) {
      // Fix: Adjusted polling delay to 10 seconds as recommended in the guidelines.
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await freshAi.operations.getVideosOperation({operation: operation});
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("No video URI returned");

    // Fetch the video content
    const response = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);

  } catch (error) {
    console.error("Veo video generation error:", error);
    throw error;
  }
};

export const getChatResponse = async (
  history: {role: string, parts: {text: string}[]}[], 
  message: string,
  language: string = 'English (US)'
): Promise<string> => {
  try {
    const chat = ai.chats.create({
      model: 'gemini-3-pro-preview',
      history: history,
      config: {
        systemInstruction: `You are a helpful AI marketing assistant. You must always reply in ${language}.`
      }
    });
    
    const result = await chat.sendMessage({ message });
    return result.text || "I'm not sure how to respond to that.";
  } catch (error) {
    console.error("Chat error:", error);
    throw error;
  }
};

export const findBusinessLocation = async (query: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Find the precise address and location details for: "${query}". If you find a business, return its full address. If you find a city/area, return that. Return ONLY the address/location string.`,
      config: {
        tools: [{ googleMaps: {} }],
      },
    });
    
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Location search error:", error);
    throw error;
  }
};

export const suggestCampaignDetails = async (profile: BusinessProfile): Promise<{ keywords: string, type: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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
  } catch (error) {
    console.error("Suggestion error:", error);
    return { keywords: "Sale, Limited Time, Exclusive", type: "Promotion" };
  }
};