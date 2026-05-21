import { BusinessProfile, CampaignDetails, GeneratedVariant } from "../types";

export const generateMarketingContent = async (
  profile: BusinessProfile,
  campaign: CampaignDetails
): Promise<GeneratedVariant[]> => {
  try {
    const response = await fetch("/api/marketing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile, campaign }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error("Gemini generation client proxy error:", error);
    // Fallback mock data in case of complete API failure/network issue
    return [
      {
        headline: "Error Generating Content",
        postCopy: `We couldn't reach the AI service: ${error?.message || "Internal error"}. Please check your connection or server configurations.`,
        hashtags: ["#error", "#tryagain"],
        visualIdea: "An error icon",
        engagementTips: ["Try refreshing the page or restarting the server"],
      },
    ];
  }
};

export const generateImageFromIdea = async (
  visualDescription: string,
  style: string = ""
): Promise<string> => {
  const response = await fetch("/api/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visualDescription, style }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP error ${response.status}`);
  }

  const data = await response.json();
  return data.image;
};

export const generateVeoVideo = async (
  prompt: string,
  aspectRatio: '16:9' | '9:16',
  imageBase64?: string
): Promise<string> => {
  // 1. Initiate operation
  const startRes = await fetch("/api/video-start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, aspectRatio, imageBase64 }),
  });

  if (!startRes.ok) {
    const errData = await startRes.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to initiate video generation");
  }

  const { operationName } = await startRes.json();

  // 2. Poll for completion (Vercel serverless friendly)
  let done = false;
  let attempts = 0;
  const maxAttempts = 30; // Max 5 minutes total

  while (!done && attempts < maxAttempts) {
    attempts++;
    // Wait 10 seconds between checks
    await new Promise((resolve) => setTimeout(resolve, 10000));
    
    const statusRes = await fetch("/api/video-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operationName }),
    });

    if (statusRes.ok) {
      const statusData = await statusRes.json();
      done = statusData.done;
    }
  }

  if (!done) {
    throw new Error("Video generation timed out. Please try again.");
  }

  // 3. Download
  const downloadRes = await fetch("/api/video-download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operationName }),
  });

  if (!downloadRes.ok) {
    const errData = await downloadRes.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to download your generated video file");
  }

  const blob = await downloadRes.blob();
  return URL.createObjectURL(blob);
};

export const getChatResponse = async (
  history: { role: string; parts: { text: string }[] }[],
  message: string,
  language: string = 'English (US)'
): Promise<string> => {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ history, message, language }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to process chat response");
  }

  const data = await response.json();
  return data.text;
};

export const findBusinessLocation = async (query: string): Promise<string> => {
  const response = await fetch("/api/location", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to verify location details");
  }

  const data = await response.json();
  return data.address;
};

export const suggestCampaignDetails = async (
  profile: BusinessProfile
): Promise<{ keywords: string; type: string }> => {
  const response = await fetch("/api/suggest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to compile campaign options");
  }

  return await response.json();
};
