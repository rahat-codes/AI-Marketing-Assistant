
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Header } from './components/Header';
import { ProgressBar } from './components/ProgressBar';
import { generateMarketingContent, generateImageFromIdea, generateVeoVideo, getChatResponse, findBusinessLocation, suggestCampaignDetails } from './services/geminiService';
import { AppView, BusinessProfile, CampaignDetails, GeneratedVariant, SavedCampaign, ChatMessage } from './types';
import { Coffee, Sparkles, ArrowRight, Save, RefreshCw, Copy, Search, LayoutGrid, List, Moon, Palette, Globe, Type as TypeIcon, Info, Mail, Flag, ChevronDown, CheckCircle, Calendar as CalendarIcon, Sun, Image as ImageIcon, Loader2, Instagram, Facebook, Twitter, MessageSquare, X, FileText, Printer, Clapperboard, Upload, Send, Bot, Download, Share2, MapPin, Rocket, ArrowUp, ArrowDown, HelpCircle } from 'lucide-react';

// --- Constants ---

const languageOptions = [
  "English (US)", "English (UK)", "Spanish", "French", "German", "Italian", "Portuguese", "Dutch", "Japanese", "Korean", "Chinese (Simplified)"
];

// --- Default States ---

const initialProfile: BusinessProfile = {
  name: '',
  type: '',
  location: '',
  audience: '',
  description: '',
  tone: '',
  language: 'English (US)'
};

const initialCampaign: CampaignDetails = {
  type: 'Promotion',
  platforms: ['Instagram'],
  keywords: '',
  startDate: '',
  endDate: '',
  length: 50
};

const mockHistory: SavedCampaign[] = [
  { 
    id: '1', 
    title: 'Weekend Coffee Special', 
    date: '2 days ago', 
    createdTimestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
    type: 'Promotion', 
    platformIcon: 'instagram',
    variant: {
      headline: "Weekend Fuel ☕️✨",
      postCopy: "Start your weekend right with our signature pour-over! Buy one get one 50% off until noon. Perfect for catching up with friends.",
      hashtags: ["#CoffeeLover", "#WeekendVibes", "#LocalBrew"],
      visualIdea: "Close up of latte art with warm sunlight hitting the table.",
      engagementTips: ["Post Saturday at 9am", "Use the 'Support Small Business' sticker"]
    }
  },
  { 
    id: '2', 
    title: 'New Summer Menu Launch', 
    date: '5 days ago', 
    createdTimestamp: Date.now() - 5 * 24 * 60 * 60 * 1000,
    type: 'Announcement', 
    platformIcon: 'instagram',
    variant: {
      headline: "Summer Tastes Like This ☀️🥗",
      postCopy: "Our new summer salad bowl is finally here! Fresh strawberries, walnuts, and goat cheese. Tastes like sunshine.",
      hashtags: ["#SummerMenu", "#FreshEats", "#HealthyLunch"],
      visualIdea: "Bright overhead shot of the salad on a colorful table.",
      engagementTips: ["Ask followers what their favorite summer fruit is"]
    }
  },
  { 
    id: '3', 
    title: 'Holiday Hours Announcement', 
    date: '1 week ago', 
    createdTimestamp: Date.now() - 7 * 24 * 60 * 60 * 1000,
    type: 'Announcement', 
    platformIcon: 'facebook' 
  },
];

// --- Helper Components ---

const Tooltip = ({ text }: { text: string }) => (
  <div className="group relative inline-flex ml-1.5 align-middle">
    <Info size={14} className="text-gray-400 hover:text-blue-500 cursor-help transition-colors" />
    <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 bg-gray-900/95 text-white text-xs leading-relaxed rounded-lg shadow-xl z-50 pointer-events-none backdrop-blur-sm border border-white/10 transform origin-bottom scale-95 group-hover:scale-100">
      {text}
      <svg className="absolute top-full left-1/2 -translate-x-1/2 -mt-px text-gray-900/95 w-2.5 h-2.5" viewBox="0 0 255 255" xmlSpace="preserve">
        <polygon className="fill-current" points="0,0 127.5,127.5 255,0" />
      </svg>
    </div>
  </div>
);

// --- Main Component ---

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.HOME);
  const [profile, setProfile] = useState<BusinessProfile>(initialProfile);
  const [campaign, setCampaign] = useState<CampaignDetails>(initialCampaign);
  const [generatedVariants, setGeneratedVariants] = useState<GeneratedVariant[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // History State with Persistence
  const [savedCampaigns, setSavedCampaigns] = useState<SavedCampaign[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('marketingAppHistory');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Failed to parse history", e);
        }
      }
    }
    return mockHistory;
  });
  const [selectedCampaign, setSelectedCampaign] = useState<SavedCampaign | null>(null);
  
  // History Filtering & Sorting State
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState('All');
  const [historySortKey, setHistorySortKey] = useState<'date' | 'title'>('date');
  const [historySortOrder, setHistorySortOrder] = useState<'desc' | 'asc'>('desc');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');


  // Image Generation State
  const [generatedImages, setGeneratedImages] = useState<{[key: number]: string}>({});
  const [generatingImgIdx, setGeneratingImgIdx] = useState<number | null>(null);
  const [imageStyles, setImageStyles] = useState<{[key: number]: string}>({});

  // Location Grounding State
  const [isLocating, setIsLocating] = useState(false);
  
  // Campaign Suggestion State
  const [isSuggesting, setIsSuggesting] = useState(false);

  // Studio (Video) State
  const [studioTab, setStudioTab] = useState<'text-to-video' | 'image-to-video'>('text-to-video');
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [videoImage, setVideoImage] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [isVideoGenerating, setIsVideoGenerating] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [hasVideoKey, setHasVideoKey] = useState(true);

  // Chatbot State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: '0', role: 'model', text: 'Hi! I am your AI marketing assistant. Ask me anything about your business strategy!', timestamp: new Date() }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatTyping, setIsChatTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const quickReplies = [
    "Suggest campaign ideas",
    "Help me choose a platform",
    "How to increase engagement?",
    "Draft a sale post"
  ];

  // --- Settings State ---
  // Initialize from localStorage or defaults
  const [settings, setSettings] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('marketingAppSettings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Ensure new fields exist if loading old settings
          return {
            darkMode: false,
            theme: 'Warm Sunset',
            language: 'English (US)',
            fontSize: 'Medium',
            bodyFont: "'Open Sans', sans-serif",
            headingFont: "'Merriweather', serif",
            ...parsed
          };
        } catch (e) {
          console.error("Failed to parse settings", e);
        }
      }
    }
    return {
      darkMode: false,
      theme: 'Warm Sunset',
      language: 'English (US)',
      fontSize: 'Medium', // Small, Medium, Large
      bodyFont: "'Open Sans', sans-serif",
      headingFont: "'Merriweather', serif"
    };
  });

  // --- Effects ---

  useEffect(() => {
    const root = document.documentElement;

    // 1. Handle Dark Mode
    if (settings.darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // 2. Handle Font Size Scaling
    switch (settings.fontSize) {
      case 'Small': 
        root.style.fontSize = '14px'; // ~87.5%
        break;
      case 'Large': 
        root.style.fontSize = '18px'; // ~112.5%
        break;
      default: 
        root.style.fontSize = '16px'; // 100%
        break;
    }

    // 3. Handle Fonts
    root.style.setProperty('--font-body', settings.bodyFont);
    root.style.setProperty('--font-heading', settings.headingFont);

    // 4. Persist Settings
    localStorage.setItem('marketingAppSettings', JSON.stringify(settings));

  }, [settings]);

  useEffect(() => {
    // Persist History
    localStorage.setItem('marketingAppHistory', JSON.stringify(savedCampaigns));
  }, [savedCampaigns]);

  useEffect(() => {
    // Sync language setting to profile when language setting changes (one-way sync from Settings to Profile)
    if (settings.language && profile.language !== settings.language) {
        setProfile(prev => ({ ...prev, language: settings.language }));
    }
  }, [settings.language]);

  useEffect(() => {
    if (isChatOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen]);

  // Check for API Key for video on Studio view load
  useEffect(() => {
    if (view === AppView.STUDIO && window.aistudio) {
      window.aistudio.hasSelectedApiKey().then(hasKey => {
        setHasVideoKey(hasKey);
      });
    }
  }, [view]);

  // --- Handlers ---

  const handleProfileChange = (field: keyof BusinessProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));

    // If language changes in profile, sync to global settings so Chatbot uses it too (Profile to Settings sync)
    if (field === 'language') {
        setSettings(prev => {
            if (prev.language !== value) {
                return { ...prev, language: value };
            }
            return prev;
        });
    }
  };

  const handleCampaignChange = (field: keyof CampaignDetails, value: any) => {
    setCampaign(prev => ({ ...prev, [field]: value }));
  };

  const handleAutoLocation = async () => {
    const queryParts = [];
    if (profile.name) queryParts.push(profile.name);
    if (profile.location) queryParts.push(profile.location);
    
    const query = queryParts.join(' ');
    
    if (!query) {
        alert("Please enter a business name or partial location first.");
        return;
    }

    setIsLocating(true);
    try {
      const result = await findBusinessLocation(query);
      if (result) {
        handleProfileChange('location', result);
      } else {
        alert("Could not verify location details with Maps.");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to find location.");
    } finally {
      setIsLocating(false);
    }
  };

  const handleAutoSuggest = async () => {
    if (!profile.name || !profile.type) {
      alert("Please fill out your Business Profile (Step 1) first to get better suggestions.");
      return;
    }

    setIsSuggesting(true);
    try {
      const suggestions = await suggestCampaignDetails(profile);
      if (suggestions) {
        setCampaign(prev => ({
          ...prev,
          keywords: suggestions.keywords,
          type: suggestions.type
        }));
      }
    } catch (error) {
      console.error("Suggestion failed", error);
      alert("Could not generate suggestions at this time.");
    } finally {
      setIsSuggesting(false);
    }
  };

  const togglePlatform = (platform: string) => {
    setCampaign(prev => {
      const current = prev.platforms;
      if (current.includes(platform)) {
        return { ...prev, platforms: current.filter(p => p !== platform) };
      } else {
        return { ...prev, platforms: [...current, platform] };
      }
    });
  };

  const generateContent = async () => {
    setIsGenerating(true);
    setView(AppView.CAMPAIGN_STEP_3);
    setGeneratedImages({}); // Clear previous images
    setImageStyles({}); // Clear styles
    try {
      // Ensure we use the latest language from settings if profile is empty (fallback)
      const finalProfile = {
        ...profile,
        language: profile.language || settings.language
      };
      const variants = await generateMarketingContent(finalProfile, campaign);
      setGeneratedVariants(variants);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateImage = async (index: number, prompt: string, style: string) => {
    setGeneratingImgIdx(index);
    try {
      const imageData = await generateImageFromIdea(prompt, style);
      setGeneratedImages(prev => ({ ...prev, [index]: imageData }));
    } catch (e: any) {
      console.error("Failed to generate image", e);
      alert(`Could not generate image: ${e.message || 'An unknown error occurred.'}`);
    } finally {
      setGeneratingImgIdx(null);
    }
  };

  const handleGenerateVideo = async () => {
    setVideoError(null);
    
    // Check API Key
    if (window.aistudio && !await window.aistudio.hasSelectedApiKey()) {
      setHasVideoKey(false);
      return;
    }

    if (studioTab === 'text-to-video' && !videoPrompt.trim()) {
      setVideoError("Please enter a description for the video.");
      return;
    }
    if (studioTab === 'image-to-video' && !videoImage) {
      setVideoError("Please upload an image first.");
      return;
    }

    setIsVideoGenerating(true);
    setGeneratedVideoUrl(null);

    try {
      const url = await generateVeoVideo(videoPrompt, videoAspectRatio, videoImage || undefined);
      setGeneratedVideoUrl(url);
    } catch (e: any) {
      console.error(e);
      if (e?.message?.includes("Requested entity was not found.")) {
        setVideoError("Your API key appears to be invalid. Please select a valid key and try again.");
        setHasVideoKey(false);
      } else {
        setVideoError("Failed to generate video. Please try again later.");
      }
    } finally {
      setIsVideoGenerating(false);
    }
  };

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasVideoKey(true);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setVideoImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChatSubmit = async (e?: React.FormEvent, textOverride?: string) => {
    e?.preventDefault();
    const textToSend = textOverride || chatInput;
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatTyping(true);

    try {
      // Prepare history for API
      const history = chatMessages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      // Pass the current language setting to the chatbot service
      const responseText = await getChatResponse(history, userMsg.text, settings.language);
      
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, botMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsChatTyping(false);
    }
  };

  const handleCopyContent = (variant: GeneratedVariant) => {
    const contentToCopy = `
${variant.headline}

${variant.postCopy}

${variant.hashtags.join(' ')}
    `.trim();
    
    navigator.clipboard.writeText(contentToCopy).then(() => {
        alert("Content copied to clipboard!");
    }).catch(() => {
        alert("Failed to copy content.");
    });
  };

  const handleShare = (platform: string, variant: GeneratedVariant) => {
    const text = `${variant.headline}\n\n${variant.postCopy}\n\n${variant.hashtags.join(' ')}`;

    if (platform === 'webshare' && navigator.share) {
      navigator.share({
        title: variant.headline,
        text: text,
      }).catch(console.error);
      return;
    }

    switch (platform) {
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
        break;
      case 'facebook':
        navigator.clipboard.writeText(text).then(() => {
           alert("Content copied! Paste it into your Facebook post.");
           window.open('https://facebook.com', '_blank');
        });
        break;
      case 'instagram':
        navigator.clipboard.writeText(text).then(() => {
           alert("Content copied! Paste it into Instagram.");
           window.open('https://instagram.com', '_blank');
        });
        break;
    }
  };

  const handleSaveCampaign = (variant: GeneratedVariant) => {
    const title = window.prompt("Enter a title for this campaign to save it to your history:");
    if (!title) return;

    const newCampaign: SavedCampaign = {
      id: Date.now().toString(),
      title,
      date: "Just now",
      createdTimestamp: Date.now(),
      type: campaign.type,
      platformIcon: campaign.platforms[0]?.toLowerCase() || 'instagram',
      variant: variant
    };

    setSavedCampaigns(prev => [newCampaign, ...prev]);
    alert("Campaign saved to History!");
  };

  const handleExportText = (campaign: SavedCampaign) => {
    if (!campaign.variant) return;
    const textContent = `
Campaign: ${campaign.title}
Date: ${campaign.date}
Type: ${campaign.type}
Platform: ${campaign.platformIcon}

--- Content ---

Headline: ${campaign.variant.headline}

Post Copy:
${campaign.variant.postCopy}

Hashtags:
${campaign.variant.hashtags.join(' ')}

Visual Idea:
${campaign.variant.visualIdea}

Engagement Tips:
${campaign.variant.engagementTips.map(t => '- ' + t).join('\n')}
    `.trim();

    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${campaign.title.replace(/\s+/g, '_')}_campaign.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = (campaign: SavedCampaign) => {
    if (!campaign.variant) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to export as PDF');
      return;
    }

    const content = `
      <html>
        <head>
          <title>${campaign.title}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #1a202c; }
            h1 { font-size: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px; }
            .meta { color: #718096; margin-bottom: 30px; font-size: 14px; }
            .section { margin-bottom: 25px; }
            .label { font-weight: bold; text-transform: uppercase; font-size: 12px; color: #718096; margin-bottom: 5px; }
            .value { font-size: 16px; white-space: pre-wrap; line-height: 1.5; }
            .hashtags { color: #dd6b20; font-weight: 500; }
            .visual { background: #ebf8ff; padding: 15px; border-radius: 8px; color: #2b6cb0; font-style: italic; }
          </style>
        </head>
        <body>
          <h1>${campaign.title}</h1>
          <div class="meta">
            Generated on ${campaign.date} • ${campaign.type} • ${campaign.platformIcon}
          </div>

          <div class="section">
            <div class="label">Headline</div>
            <div class="value"><strong>${campaign.variant.headline}</strong></div>
          </div>

          <div class="section">
            <div class="label">Post Copy</div>
            <div class="value">${campaign.variant.postCopy}</div>
          </div>

          <div class="section">
            <div class="label">Hashtags</div>
            <div class="value hashtags">${campaign.variant.hashtags.join(' ')}</div>
          </div>

          <div class="section">
            <div class="label">Visual Idea</div>
            <div class="value visual">${campaign.variant.visualIdea}</div>
          </div>

          <div class="section">
            <div class="label">Engagement Tips</div>
            <div class="value">
              <ul>
                ${campaign.variant.engagementTips.map(tip => `<li>${tip}</li>`).join('')}
              </ul>
            </div>
          </div>

          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
  };

  const getThemeBackground = () => {
    if (settings.darkMode) return 'bg-gray-900';
    switch (settings.theme) {
      case 'Cool Breeze': return 'bg-cyan-50';
      case 'Forest Whisper': return 'bg-emerald-50';
      case 'Lavender Dream': return 'bg-purple-50';
      case 'Warm Sunset':
      default: return 'bg-gray-50';
    }
  };

  // Memoized calculation for filtered and sorted history
  const displayedHistory = useMemo(() => {
    let result = savedCampaigns;

    // 1. Filter by search
    if (historySearch) {
      result = result.filter(c => c.title.toLowerCase().includes(historySearch.toLowerCase()));
    }

    // 2. Filter by category
    if (historyFilter !== 'All') {
      result = result.filter(c => c.type === historyFilter || c.platformIcon.toLowerCase().includes(historyFilter.toLowerCase()));
    }

    // 3. Filter by date range
    const startDate = historyStartDate ? new Date(historyStartDate).setHours(0, 0, 0, 0) : 0;
    const endDate = historyEndDate ? new Date(historyEndDate).setHours(23, 59, 59, 999) : Infinity;

    if (startDate || endDate !== Infinity) {
      result = result.filter(c => {
        const campaignDate = c.createdTimestamp;
        return campaignDate >= startDate && campaignDate <= endDate;
      });
    }

    // 4. Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (historySortKey === 'date') {
        comparison = b.createdTimestamp - a.createdTimestamp; // Naturally descending
      } else { // 'title'
        comparison = a.title.localeCompare(b.title);
      }
      return historySortOrder === 'asc' ? -comparison : comparison;
    });

    return result;
  }, [savedCampaigns, historySearch, historyFilter, historyStartDate, historyEndDate, historySortKey, historySortOrder]);


  // --- Helper Component for Icons ---
  const PlatformIconDisplay = ({ iconName, size = "sm" }: { iconName: string, size?: "sm" | "lg" }) => {
    const s = size === "lg" ? "w-10 h-10 text-base" : "w-8 h-8 text-xs";
    
    if (iconName.includes('instagram')) return <div className={`${s} rounded-md bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white`}><Instagram size={size === "lg" ? 20 : 14} /></div>;
    if (iconName.includes('facebook')) return <div className={`${s} rounded-md bg-blue-600 flex items-center justify-center text-white`}><Facebook size={size === "lg" ? 20 : 14} /></div>;
    if (iconName.includes('twitter')) return <div className={`${s} rounded-md bg-sky-500 flex items-center justify-center text-white`}><Twitter size={size === "lg" ? 20 : 14} /></div>;
    if (iconName.includes('sms')) return <div className={`${s} rounded-md bg-green-500 flex items-center justify-center text-white`}><MessageSquare size={size === "lg" ? 20 : 14} /></div>;
    if (iconName.includes('email')) return <div className={`${s} rounded-md bg-indigo-500 flex items-center justify-center text-white`}><Mail size={size === "lg" ? 20 : 14} /></div>;
    
    // Default
    return <div className={`${s} rounded-md bg-gray-400 flex items-center justify-center text-white`}>?</div>;
  };

  // --- Render Functions for Views ---

  const renderHome = () => (
    <div className="relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <section className="relative pt-16 pb-24 sm:pt-24 sm:pb-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
            <div className="text-center lg:text-left">
              <span className="inline-block px-4 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold rounded-full text-sm mb-4 animate-fade-in-up">
                Powered by Gemini AI
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white tracking-tighter animate-fade-in-up" style={{ animationDelay: '0.1s', textWrap: 'balance' }}>
                Effortless Marketing for Your Local Business
              </h1>
              <p className="mt-6 max-w-xl mx-auto lg:mx-0 text-lg text-gray-600 dark:text-gray-300 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                Stop guessing and start growing. Our AI-powered suite generates high-quality social media posts, promotional ideas, and stunning visuals in seconds.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                <button 
                  onClick={() => setView(AppView.CAMPAIGN_STEP_1)}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 hover:scale-105 hover:shadow-xl active:scale-95 text-white font-semibold py-4 px-8 rounded-xl shadow-lg shadow-blue-500/30 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  Start Your First Campaign
                  <ArrowRight size={18} />
                </button>
                <button 
                  onClick={() => setView(AppView.HELP)}
                  className="w-full sm:w-auto text-gray-600 dark:text-gray-300 font-medium hover:text-gray-900 dark:hover:text-white transition"
                >
                  How it works
                </button>
              </div>
              <div className="mt-10 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
                 <div className="flex justify-center lg:justify-start -space-x-2">
                   <img className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-gray-800" src="https://images.unsplash.com/photo-1491528323818-fdd1f037f42b?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="" />
                   <img className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-gray-800" src="https://images.unsplash.com/photo-1550525811-e5869dd03032?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="" />
                   <img className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-gray-800" src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2.25&w=256&h=256&q=80" alt="" />
                 </div>
                 <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                   Join over <span className="font-bold text-gray-700 dark:text-gray-200">1,000+</span> local businesses growing with us.
                 </p>
              </div>
            </div>

            <div className="relative animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <div className="relative bg-white dark:bg-gray-800 p-2 sm:p-4 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 transform lg:rotate-3 hover:rotate-0 hover:shadow-blue-500/10 dark:hover:shadow-blue-400/10 transition-all duration-500">
                 {/* Mock UI Card */}
                 <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                   <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-orange-200 dark:bg-orange-800 rounded-full flex items-center justify-center text-orange-600 dark:text-orange-300"><Coffee size={20} /></div>
                      <div>
                         <h4 className="font-bold text-gray-900 dark:text-white">The Daily Grind</h4>
                         <p className="text-xs text-gray-500 dark:text-gray-400">Coffee Shop</p>
                      </div>
                   </div>
                   <div className="h-40 bg-gray-200 dark:bg-gray-600 rounded-lg mb-4 flex items-center justify-center text-gray-400 dark:text-gray-500">
                      <ImageIcon size={32} />
                   </div>
                   <p className="text-sm text-gray-800 dark:text-gray-200">
                     <strong className="font-bold">Weekend Fuel ☕️✨</strong> Start your weekend right with our signature pour-over...
                   </p>
                   <div className="flex gap-2 mt-4">
                      <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-1 rounded-md font-medium">#CoffeeLover</span>
                      <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-1 rounded-md font-medium">#LocalBrew</span>
                   </div>
                 </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Everything you need to grow</h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">From AI-powered content to stunning video, all in one place.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div
              onClick={() => setView(AppView.CAMPAIGN_STEP_1)}
              className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group cursor-pointer"
            >
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                <Rocket size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Content Generation</h3>
              <p className="text-gray-500 dark:text-gray-400">Generate posts, hashtags, and ideas for Instagram, Facebook, and more.</p>
            </div>
            <div
              onClick={() => setView(AppView.STUDIO)}
              className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group cursor-pointer"
            >
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center text-orange-600 dark:text-orange-400 mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                <Clapperboard size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Video Studio</h3>
              <p className="text-gray-500 dark:text-gray-400">Turn text prompts and images into stunning videos using Veo AI.</p>
            </div>
            <div
              onClick={() => setView(AppView.HISTORY)}
              className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group cursor-pointer"
            >
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4 transition-transform duration-300 group-hover:scale-110">
                <LayoutGrid size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Campaign History</h3>
              <p className="text-gray-500 dark:text-gray-400">Access saved campaigns, previous drafts, and exported content.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="max-w-3xl mx-auto py-12 px-4 animate-fade-in-up">
      <ProgressBar currentStep={1} />
      
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 transition-colors duration-300 border border-gray-100 dark:border-gray-700">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Set Up Your Business Profile</h2>
          <p className="text-gray-500 dark:text-gray-400">Tell us about your business to personalize your AI marketing assistant.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Business Name
              <Tooltip text="The official name of your business as it appears to customers." />
            </label>
            <input 
              type="text" 
              value={profile.name}
              onChange={(e) => handleProfileChange('name', e.target.value)}
              placeholder="Enter your business name"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-gray-50 dark:bg-gray-700 dark:text-white focus:bg-white dark:focus:bg-gray-600"
            />
          </div>
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Business Type
              <Tooltip text="The category that best describes what your business does (e.g., Restaurant, Retail)." />
            </label>
            <div className="relative">
              <select 
                value={profile.type}
                onChange={(e) => handleProfileChange('type', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-gray-50 dark:bg-gray-700 dark:text-white focus:bg-white dark:focus:bg-gray-600 appearance-none"
              >
                <option value="" disabled>Select a type</option>
                <option value="Coffee Shop">Coffee Shop</option>
                <option value="Restaurant">Restaurant</option>
                <option value="Retail Store">Retail Store</option>
                <option value="Service Provider">Service Provider</option>
                <option value="Salon/Spa">Salon/Spa</option>
              </select>
              <ChevronDown className="absolute right-4 top-3.5 text-gray-400 pointer-events-none" size={20} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Location
              <Tooltip text="Where your business is physically located or the area you serve." />
            </label>
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <input 
                    type="text" 
                    value={profile.location}
                    onChange={(e) => handleProfileChange('location', e.target.value)}
                    placeholder="e.g., San Francisco, CA"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-gray-50 dark:bg-gray-700 dark:text-white focus:bg-white dark:focus:bg-gray-600"
                    />
                </div>
                <button
                    onClick={handleAutoLocation}
                    disabled={isLocating || (!profile.name && !profile.location)}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 rounded-xl transition shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 min-w-[100px]"
                    title="Verify with Google Maps"
                >
                    {isLocating ? <Loader2 size={18} className="animate-spin" /> : <MapPin size={18} />}
                    <span className="font-medium text-sm hidden sm:inline">Auto-Find</span>
                </button>
            </div>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <MapPin size={10} /> Powered by Gemini Maps Grounding
            </p>
          </div>
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Target Audience
              <Tooltip text="The specific group of people you want to reach (e.g., 'Parents with toddlers', 'Coffee enthusiasts')." />
            </label>
            <input 
              type="text" 
              value={profile.audience}
              onChange={(e) => handleProfileChange('audience', e.target.value)}
              placeholder="e.g., Young professionals, families"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-gray-50 dark:bg-gray-700 dark:text-white focus:bg-white dark:focus:bg-gray-600"
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Business Description
            <Tooltip text="A brief summary of what your business offers and its unique selling points." />
          </label>
          <textarea 
            value={profile.description}
            onChange={(e) => handleProfileChange('description', e.target.value)}
            placeholder="Describe what makes your business unique..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-gray-50 dark:bg-gray-700 dark:text-white focus:bg-white dark:focus:bg-gray-600 resize-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Brand Tone
              <Tooltip text="The personality and style of your communication (e.g., Professional, Friendly, Witty)." />
            </label>
            <div className="relative">
              <select 
                value={profile.tone}
                onChange={(e) => handleProfileChange('tone', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-gray-50 dark:bg-gray-700 dark:text-white focus:bg-white dark:focus:bg-gray-600 appearance-none"
              >
                 <option value="" disabled>Select a tone</option>
                 <option value="Friendly">Friendly</option>
                 <option value="Professional">Professional</option>
                 <option value="Witty">Witty</option>
                 <option value="Urgent">Urgent</option>
                 <option value="Luxury">Luxury</option>
              </select>
              <ChevronDown className="absolute right-4 top-3.5 text-gray-400 pointer-events-none" size={20} />
            </div>
          </div>
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Preferred Language
              <Tooltip text="The language you want the generated content to be in." />
            </label>
            <div className="relative">
              <select 
                value={profile.language}
                onChange={(e) => handleProfileChange('language', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-gray-50 dark:bg-gray-700 dark:text-white focus:bg-white dark:focus:bg-gray-600 appearance-none"
              >
                {languageOptions.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-3.5 text-gray-400 pointer-events-none" size={20} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 border-t border-gray-100 dark:border-gray-700 pt-6">
          <button className="text-gray-600 dark:text-gray-400 font-medium hover:text-gray-900 dark:hover:text-white transition-colors">Save Profile</button>
          <button 
            onClick={() => setView(AppView.CAMPAIGN_STEP_2)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white font-semibold py-3 px-8 rounded-xl shadow-lg shadow-blue-500/30 transition-all duration-200"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => {
    const platformOptions = [
      { name: 'Instagram', icon: Instagram, color: "text-pink-600 dark:text-pink-400" },
      { name: 'Facebook', icon: Facebook, color: "text-blue-600 dark:text-blue-400" },
      { name: 'Twitter', icon: Twitter, color: "text-sky-500 dark:text-sky-400" },
      { name: 'SMS', icon: MessageSquare, color: "text-green-600 dark:text-green-400" },
      { name: 'Email', icon: Mail, color: "text-indigo-600 dark:text-indigo-400" },
      { name: 'Other', icon: HelpCircle, color: "text-gray-600 dark:text-gray-400" },
    ];

    return (
    <div className="max-w-3xl mx-auto py-12 px-4 animate-fade-in-up">
      <ProgressBar currentStep={2} />
      
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 transition-colors duration-300 border border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Campaign Details</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Provide the specifics for this marketing push.</p>
          </div>
          
          <button 
            onClick={handleAutoSuggest}
            disabled={isSuggesting}
            className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition active:scale-95 disabled:opacity-50"
          >
            {isSuggesting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            AI Suggest
          </button>
        </div>

        <div className="mb-6">
          <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Campaign Type
            <Tooltip text="The goal of this specific marketing effort (e.g., announcing a sale, educational post)." />
          </label>
          <div className="relative">
            <select 
              value={campaign.type}
              onChange={(e) => handleCampaignChange('type', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition bg-gray-50 dark:bg-gray-700 dark:text-white focus:bg-white dark:focus:bg-gray-600 appearance-none"
            >
              <option value="Promotion">Promotion</option>
              <option value="Announcement">Announcement</option>
              <option value="Event">Event</option>
              <option value="Educational">Educational</option>
            </select>
            <ChevronDown className="absolute right-4 top-3.5 text-gray-400 pointer-events-none" size={20} />
          </div>
        </div>

        <div className="mb-6">
          <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Platform(s)
            <Tooltip text="Where you intend to post this content. We'll tailor the format accordingly." />
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
             {platformOptions.map(p => {
               const Icon = p.icon;
               const isSelected = campaign.platforms.includes(p.name);
               return (
                 <button
                   key={p.name}
                   onClick={() => togglePlatform(p.name)}
                   className={`p-4 rounded-xl border-2 text-center transition-all duration-200 relative group ${
                     isSelected
                       ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 shadow-lg' 
                       : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md'
                   }`}
                 >
                   <div className="flex justify-center mb-2">
                      <Icon size={24} className={p.color} />
                   </div>
                   <span className={`font-semibold text-sm ${
                     isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-gray-200'
                   }`}>{p.name}</span>
                   {isSelected && (
                     <div className="absolute top-2 right-2 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white animate-pop-in">
                       <CheckCircle size={14} />
                     </div>
                   )}
                 </button>
               );
             })}
          </div>
        </div>

        <div className="mb-6">
          <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Special Offers / Keywords
            <Tooltip text="Key phrases, specific deals (like '50% off'), or topics to include in the content." />
          </label>
          <input 
            type="text" 
            value={campaign.keywords}
            onChange={(e) => handleCampaignChange('keywords', e.target.value)}
            placeholder="e.g., 'BOGO deal', 'Holiday Special', 'new coffee blend'"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition bg-gray-50 dark:bg-gray-700 dark:text-white focus:bg-white dark:focus:bg-gray-600"
          />
          <p className="mt-2 text-xs text-gray-400">Enter keywords to help the AI generate relevant content.</p>
        </div>

        <div className="mb-8">
          <div className="flex justify-between mb-2">
             <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
               Post Length
               <Tooltip text="How long you want the text captions to be." />
             </label>
             <span className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase">
               {campaign.length < 33 ? 'Short' : campaign.length > 66 ? 'Long' : 'Medium'}
             </span>
          </div>
          
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={campaign.length}
            onChange={(e) => handleCampaignChange('length', parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span>Short</span>
            <span>Medium</span>
            <span>Long</span>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-6">
           <button 
            onClick={() => setView(AppView.CAMPAIGN_STEP_1)}
            className="text-gray-500 dark:text-gray-400 font-medium hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Back
          </button>
          <button 
            onClick={generateContent}
            className="bg-gradient-to-r from-orange-500 via-red-500 to-orange-500 bg-[length:200%_100%] hover:animate-shimmer active:scale-95 text-white font-semibold py-3 px-8 rounded-xl shadow-lg shadow-orange-500/30 transition-all duration-200 w-full md:w-auto"
          >
            Generate Marketing Content
          </button>
        </div>
      </div>
    </div>
    );
  };

  const renderStep3 = () => (
    <div className="max-w-6xl mx-auto py-12 px-4 animate-fade-in-up">
      <ProgressBar currentStep={3} />

      <div className="text-center mb-8">
         <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">Your AI-Generated Marketing Content</h1>
          <p className="text-lg text-gray-500 dark:text-gray-400">Review your options, generate visuals, and share your campaign.</p>
      </div>

      {isGenerating ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
           {[1, 2, 3].map(i => (
             <div key={i} className="bg-white dark:bg-gray-800 rounded-3xl p-6 h-96 shadow-lg border border-gray-100 dark:border-gray-700 flex flex-col gap-4">
               <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
               <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
               <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
               <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
               <div className="flex-1"></div>
               <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl w-full"></div>
             </div>
           ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {generatedVariants.map((variant, idx) => (
            <div key={idx} className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden flex flex-col border border-gray-100 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
              <div className="p-6 flex-1">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Variant {idx + 1}</span>
                </div>
                
                <div className="mb-4">
                   <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Headline</h3>
                   <p className="text-gray-800 dark:text-gray-200 font-medium">{variant.headline}</p>
                </div>

                <div className="mb-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase mb-1">Post Copy</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm whitespace-pre-line leading-relaxed">{variant.postCopy}</p>
                </div>

                <div className="mb-4">
                   <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Recommended Hashtags</h3>
                   <div className="flex flex-wrap gap-2">
                     {variant.hashtags.map(tag => (
                       <span key={tag} className="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 text-xs px-2 py-1 rounded-md font-medium hover:scale-105 transition-transform cursor-default">
                         {tag}
                       </span>
                     ))}
                   </div>
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl mb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                      <h3 className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase">Visual Idea</h3>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <input 
                            type="text" 
                            placeholder="Style (e.g. Cinematic)" 
                            className="text-xs px-2 py-1 rounded border border-blue-200 dark:border-blue-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 w-full sm:w-32 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={imageStyles[idx] || ''}
                            onChange={(e) => setImageStyles(prev => ({...prev, [idx]: e.target.value}))}
                        />
                        <button 
                            onClick={() => handleGenerateImage(idx, variant.visualIdea, imageStyles[idx] || '')}
                            disabled={generatingImgIdx === idx}
                            className="text-xs bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-2 py-1 rounded transition disabled:opacity-50 flex items-center gap-1 shrink-0"
                        >
                            {generatingImgIdx === idx ? <Loader2 size={12} className="animate-spin" /> : <ImageIcon size={12} />}
                            {generatingImgIdx === idx ? 'Creating...' : 'Generate'}
                        </button>
                      </div>
                    </div>
                    <p className="text-blue-700 dark:text-blue-200 text-xs italic mb-3">{variant.visualIdea}</p>
                    
                    {/* Generated Image Display */}
                    {generatedImages[idx] && (
                      <div className="mt-2 relative group rounded-lg overflow-hidden border border-blue-200 dark:border-blue-700 shadow-sm animate-pop-in">
                         <img src={generatedImages[idx]} alt="AI Generated Visual" className="w-full h-auto object-cover" />
                         <button 
                           onClick={() => {
                             const link = document.createElement('a');
                             link.href = generatedImages[idx];
                             link.download = `marketing_visual_${idx + 1}.jpg`;
                             document.body.appendChild(link);
                             link.click();
                             document.body.removeChild(link);
                           }}
                           className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                           title="Download Image"
                         >
                           <Download size={18} />
                         </button>
                      </div>
                    )}
                </div>

                 <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase mb-1">Engagement Tips</h3>
                    <ul className="list-disc list-inside text-gray-500 dark:text-gray-400 text-xs">
                      {variant.engagementTips.map((tip, i) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                </div>
              </div>
              
              {/* Social Share Buttons */}
              <div className="px-6 pb-2 flex items-center justify-end gap-2 border-t border-gray-50 dark:border-gray-700 pt-4">
                <span className="text-xs font-bold text-gray-400 uppercase mr-1">Share:</span>
                
                <button 
                  onClick={() => handleShare('twitter', variant)} 
                  className="p-2 bg-sky-50 dark:bg-sky-900/20 hover:bg-sky-100 dark:hover:bg-sky-900/40 text-sky-500 dark:text-sky-400 rounded-full transition hover:scale-110" 
                  title="Share to Twitter"
                >
                  <Twitter size={16} />
                </button>

                <button 
                  onClick={() => handleShare('facebook', variant)} 
                  className="p-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full transition hover:scale-110" 
                  title="Copy & Open Facebook"
                >
                  <Facebook size={16} />
                </button>

                <button 
                  onClick={() => handleShare('instagram', variant)} 
                  className="p-2 bg-pink-50 dark:bg-pink-900/20 hover:bg-pink-100 dark:hover:bg-pink-900/40 text-pink-600 dark:text-pink-400 rounded-full transition hover:scale-110" 
                  title="Copy & Open Instagram"
                >
                  <Instagram size={16} />
                </button>

                {typeof navigator !== 'undefined' && navigator.share && (
                   <button 
                    onClick={() => handleShare('webshare', variant)} 
                    className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full transition hover:scale-110" 
                    title="Share via..."
                  >
                     <Share2 size={16} />
                   </button>
                )}
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 flex justify-between items-center gap-2">
                <button 
                  onClick={() => handleCopyContent(variant)}
                  className="flex items-center gap-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-sm font-medium px-3 py-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition active:scale-95"
                >
                  <Copy size={16} /> Copy
                </button>
                 <button onClick={generateContent} className="flex items-center gap-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-sm font-medium px-3 py-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition active:scale-95">
                  <RefreshCw size={16} /> Regen
                </button>
                 <button 
                  onClick={() => handleSaveCampaign(variant)}
                  className="flex items-center gap-1 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-md shadow-orange-200 dark:shadow-none transition"
                 >
                  <Save size={16} /> Save
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderStudio = () => (
    <div className="max-w-4xl mx-auto py-8 px-4 animate-fade-in-up">
       <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">Creative Studio</h1>
       <p className="text-gray-500 dark:text-gray-400 mb-8">Create stunning videos for your social media using Veo AI.</p>

       {!hasVideoKey && (
         <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 p-6 rounded-2xl mb-8 flex flex-col items-center text-center animate-pop-in">
            <h3 className="text-lg font-bold text-yellow-800 dark:text-yellow-200 mb-2">API Key Required</h3>
            <p className="text-yellow-700 dark:text-yellow-300 mb-4">To use Veo video generation, you need to select a verified API key.</p>
            <button 
              onClick={handleSelectKey}
              className="bg-yellow-600 hover:bg-yellow-700 active:scale-95 text-white px-6 py-2 rounded-lg font-medium transition"
            >
              Select API Key
            </button>
            <div className="mt-4 text-xs text-yellow-600 dark:text-yellow-400">
               <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline hover:text-yellow-800 dark:hover:text-yellow-200">View billing documentation</a>
            </div>
         </div>
       )}

       <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="flex border-b border-gray-100 dark:border-gray-700">
             <button 
               onClick={() => setStudioTab('text-to-video')}
               className={`flex-1 py-4 font-semibold text-sm transition ${studioTab === 'text-to-video' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
             >
               Text to Video
             </button>
             <button 
               onClick={() => setStudioTab('image-to-video')}
               className={`flex-1 py-4 font-semibold text-sm transition ${studioTab === 'image-to-video' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
             >
               Image to Video
             </button>
          </div>

          <div className="p-8">
             {studioTab === 'image-to-video' && (
               <div className="mb-6 animate-fade-in-up">
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Upload Image</label>
                 <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-700/50 transition hover:border-blue-400 dark:hover:border-blue-500">
                   {videoImage ? (
                     <div className="relative w-full max-h-64 flex justify-center">
                       <img src={videoImage} alt="Preview" className="max-h-64 rounded-lg shadow-md" />
                       <button 
                         onClick={() => setVideoImage(null)}
                         className="absolute top-2 right-2 bg-white dark:bg-gray-800 p-1 rounded-full shadow text-gray-600 dark:text-gray-300 hover:text-red-500 transition"
                       >
                         <X size={16} />
                       </button>
                     </div>
                   ) : (
                     <label className="cursor-pointer flex flex-col items-center">
                       <Upload size={32} className="text-gray-400 mb-2" />
                       <span className="text-sm text-gray-500 dark:text-gray-400">Click to upload image</span>
                       <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                     </label>
                   )}
                 </div>
               </div>
             )}

             <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {studioTab === 'text-to-video' ? 'Prompt' : 'Prompt (Optional)'}
                </label>
                <textarea 
                  value={videoPrompt}
                  onChange={(e) => setVideoPrompt(e.target.value)}
                  placeholder={studioTab === 'text-to-video' ? "Describe the video you want to create..." : "Describe how to animate the image..."}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-gray-50 dark:bg-gray-700 dark:text-white focus:bg-white dark:focus:bg-gray-600 resize-none"
                />
             </div>

             <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Aspect Ratio</label>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setVideoAspectRatio('16:9')}
                    className={`flex-1 py-3 px-4 rounded-xl border transition active:scale-95 flex items-center justify-center gap-2 ${videoAspectRatio === '16:9' ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}
                  >
                    <div className="w-6 h-3.5 border-2 border-current rounded-sm"></div>
                    Landscape (16:9)
                  </button>
                  <button 
                    onClick={() => setVideoAspectRatio('9:16')}
                    className={`flex-1 py-3 px-4 rounded-xl border transition active:scale-95 flex items-center justify-center gap-2 ${videoAspectRatio === '9:16' ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}
                  >
                    <div className="w-3.5 h-6 border-2 border-current rounded-sm"></div>
                    Portrait (9:16)
                  </button>
                </div>
             </div>

             {videoError && (
               <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm animate-pop-in">
                 {videoError}
               </div>
             )}

             <button 
               onClick={handleGenerateVideo}
               disabled={isVideoGenerating || !hasVideoKey}
               className="w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600 bg-[length:200%_100%] hover:animate-shimmer active:scale-95 text-white font-semibold py-4 rounded-xl shadow-lg shadow-blue-500/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
             >
               {isVideoGenerating ? (
                 <>
                   <Loader2 size={20} className="animate-spin" />
                   Generating Video (this may take a minute)...
                 </>
               ) : (
                 <>
                   <Clapperboard size={20} />
                   Generate Video
                 </>
               )}
             </button>

             {generatedVideoUrl && (
               <div className="mt-8 animate-pop-in">
                 <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Generated Video</h3>
                 <div className="rounded-xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700 bg-black">
                   <video src={generatedVideoUrl} controls className="w-full max-h-[500px] mx-auto" />
                 </div>
                 <div className="mt-4 flex justify-end">
                    <a 
                      href={generatedVideoUrl} 
                      download="generated-video.mp4"
                      className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium hover:underline"
                    >
                      <Save size={18} /> Download Video
                    </a>
                 </div>
               </div>
             )}
          </div>
       </div>
    </div>
  );

  const renderHistory = () => {
    return (
    <div className="max-w-6xl mx-auto py-8 px-4 animate-fade-in-up">
       <div className="flex items-center justify-between mb-8">
         <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">Saved Campaigns</h1>
         <button onClick={() => setView(AppView.CAMPAIGN_STEP_1)} className="bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 active:scale-95 transition-all duration-200 flex items-center gap-2 shadow-lg shadow-orange-200 dark:shadow-none">
           <span className="text-xl">+</span> New Campaign
         </button>
       </div>

       <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm mb-4 flex flex-col md:flex-row gap-4 items-center justify-between border border-gray-100 dark:border-gray-700">
          <div className="relative w-full md:w-96">
             <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
             <input 
               type="text" 
               value={historySearch}
               onChange={(e) => setHistorySearch(e.target.value)}
               placeholder="Search saved campaigns..." 
               className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 border-none focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-500/50 outline-none text-gray-900 dark:text-white placeholder-gray-500 transition" 
             />
          </div>
          <div className="flex gap-2">
             <button className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg hover:scale-105 transition"><LayoutGrid size={20} /></button>
             <button className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg hover:scale-105 transition"><List size={20} /></button>
          </div>
       </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-4 mb-6 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-2">
          <CalendarIcon size={16} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">From:</span>
          <input 
            type="date"
            value={historyStartDate}
            onChange={e => setHistoryStartDate(e.target.value)}
            className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1 text-sm focus:ring-orange-500 focus:border-orange-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">To:</span>
          <input 
            type="date"
            value={historyEndDate}
            onChange={e => setHistoryEndDate(e.target.value)}
            className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1 text-sm focus:ring-orange-500 focus:border-orange-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
           <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Sort by:</label>
           <div className="relative">
              <select
                value={historySortKey}
                onChange={e => setHistorySortKey(e.target.value as any)}
                className="appearance-none bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md pl-3 pr-8 py-1 text-sm focus:ring-orange-500 focus:border-orange-500 outline-none"
              >
                <option value="date">Date</option>
                <option value="title">Title</option>
              </select>
              <ChevronDown size={14} className="absolute right-2 top-2 text-gray-400 pointer-events-none" />
           </div>
           <button 
             onClick={() => setHistorySortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
             className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
             title={`Sort ${historySortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
           >
            {historySortOrder === 'desc' ? <ArrowDown size={16} /> : <ArrowUp size={16} />}
           </button>
        </div>
        <button 
          onClick={() => { setHistoryStartDate(''); setHistoryEndDate(''); }}
          className="text-sm text-orange-600 dark:text-orange-400 hover:underline"
        >
          Clear Dates
        </button>
      </div>


       <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
         {['All', 'Instagram', 'Facebook', 'Email', 'Promotion', 'Announcement'].map((filter) => (
           <button 
            key={filter} 
            onClick={() => setHistoryFilter(filter)}
            className={`px-5 py-2 rounded-full text-sm whitespace-nowrap transition active:scale-95 ${historyFilter === filter ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 font-semibold' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'}`}>
             {filter}
           </button>
         ))}
       </div>

       {displayedHistory.length === 0 ? (
         <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
           <p className="text-gray-500 dark:text-gray-400">No campaigns found matching your criteria.</p>
           <button onClick={() => { setHistorySearch(''); setHistoryFilter('All'); }} className="mt-4 text-orange-500 font-medium hover:underline">Clear filters</button>
         </div>
       ) : (
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {displayedHistory.map(item => (
            <div 
              key={item.id} 
              onClick={() => setSelectedCampaign(item)}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group hover:-translate-y-1"
            >
               <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1 truncate">{item.title}</h3>
               <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Generated: {item.date}</p>
               
               <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-700">
                 <div className="flex gap-2">
                   <PlatformIconDisplay iconName={item.platformIcon} />
                   <span className="text-xs font-medium px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-500 dark:text-gray-400">{item.type}</span>
                 </div>
                 <div className="flex gap-3 text-gray-400 opacity-0 group-hover:opacity-100 transition">
                    <Sparkles size={18} className="hover:text-orange-500" />
                    <Copy size={18} className="hover:text-blue-500" />
                 </div>
               </div>
            </div>
          ))}
       </div>
       )}

       {/* Modal for Viewing Campaign Details */}
       {selectedCampaign && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto flex flex-col relative animate-pop-in">
              
              {/* Modal Header */}
              <div className="sticky top-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center z-10">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedCampaign.title}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Saved on {selectedCampaign.date} • {selectedCampaign.type}</p>
                </div>
                <button 
                  onClick={() => setSelectedCampaign(null)}
                  className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition active:scale-95"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                {selectedCampaign.variant ? (
                  <>
                    <div className="mb-6">
                      <h3 className="text-sm font-bold text-gray-400 uppercase mb-2">Headline</h3>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedCampaign.variant.headline}</p>
                    </div>
                    
                    <div className="mb-6">
                      <h3 className="text-sm font-bold text-gray-400 uppercase mb-2">Post Copy</h3>
                      <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">{selectedCampaign.variant.postCopy}</p>
                      </div>
                    </div>

                    <div className="mb-6">
                      <h3 className="text-sm font-bold text-gray-400 uppercase mb-2">Hashtags</h3>
                       <div className="flex flex-wrap gap-2">
                         {selectedCampaign.variant.hashtags.map(tag => (
                           <span key={tag} className="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 text-xs px-2 py-1 rounded-md font-medium">
                             {tag}
                           </span>
                         ))}
                       </div>
                    </div>

                    <div className="mb-6">
                      <h3 className="text-sm font-bold text-gray-400 uppercase mb-2">Visual Idea</h3>
                      <p className="text-blue-600 dark:text-blue-400 italic bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-900/30">
                        {selectedCampaign.variant.visualIdea}
                      </p>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-gray-400 uppercase mb-2">Engagement Tips</h3>
                      <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
                        {selectedCampaign.variant.engagementTips.map((tip, i) => (
                          <li key={i}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <p>No detailed content available for this legacy mock item.</p>
                  </div>
                )}
              </div>
              
              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex flex-wrap justify-end gap-3">
                <button className="px-4 py-2 text-gray-600 dark:text-gray-300 font-medium hover:text-gray-900 dark:hover:text-white mr-auto transition" onClick={() => setSelectedCampaign(null)}>Close</button>
                
                <button onClick={() => handleExportText(selectedCampaign)} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition active:scale-95 shadow-sm">
                  <FileText size={18} />
                  <span className="hidden sm:inline">Text</span>
                </button>
                
                <button onClick={() => handleExportPDF(selectedCampaign)} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition active:scale-95 shadow-sm">
                  <Printer size={18} />
                  <span className="hidden sm:inline">Print / PDF</span>
                </button>

                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition active:scale-95 shadow-sm flex items-center gap-2">
                  <Copy size={18} />
                  <span className="hidden sm:inline">Copy</span>
                </button>
              </div>
           </div>
         </div>
       )}
    </div>
    );
  };

  const renderSettings = () => (
    <div className="max-w-4xl mx-auto py-8 px-4 animate-fade-in-up">
      <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">Settings</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">Customize the app's appearance and language to your liking.</p>
      
      <div className="space-y-6">
        
        {/* Appearance Section */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors duration-300">
          <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
             <h2 className="text-lg font-bold text-gray-900 dark:text-white">Appearance</h2>
          </div>
          
          <div className="p-8 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
             <div className="flex items-center gap-4">
               <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-700 dark:text-gray-300">
                 {settings.darkMode ? <Moon size={20} /> : <Sun size={20} />}
               </div>
               <span className="font-medium text-gray-900 dark:text-white">Dark Mode</span>
             </div>
             <div 
               onClick={() => setSettings(s => ({ ...s, darkMode: !s.darkMode }))}
               className={`w-14 h-7 rounded-full p-1 cursor-pointer relative transition-colors ${settings.darkMode ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}`}
             >
               <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${settings.darkMode ? 'translate-x-7' : ''}`}></div>
             </div>
          </div>

          <div className="p-8 flex items-center justify-between">
             <div className="flex items-center gap-4">
               <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-700 dark:text-gray-300"><Palette size={20} /></div>
               <div>
                 <span className="font-medium text-gray-900 dark:text-white block">Color Theme</span>
                 <span className="text-sm text-gray-500 dark:text-gray-400">{settings.theme}</span>
               </div>
             </div>
             <div className="relative">
                <select 
                  value={settings.theme}
                  onChange={(e) => setSettings(s => ({ ...s, theme: e.target.value }))}
                  className="appearance-none bg-transparent border-none pr-8 text-right focus:ring-0 cursor-pointer text-gray-900 dark:text-white"
                >
                  <option value="Warm Sunset">Warm Sunset</option>
                  <option value="Cool Breeze">Cool Breeze</option>
                  <option value="Forest Whisper">Forest Whisper</option>
                  <option value="Lavender Dream">Lavender Dream</option>
                </select>
                <ChevronDown size={20} className="text-gray-400 absolute right-0 top-1 pointer-events-none" />
             </div>
          </div>
        </div>

        {/* Language Section */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors duration-300">
           <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
             <h2 className="text-lg font-bold text-gray-900 dark:text-white">Language & Region</h2>
           </div>
           <div className="p-8 flex items-center justify-between">
             <div className="flex items-center gap-4">
               <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-700 dark:text-gray-300"><Globe size={20} /></div>
                <div>
                 <span className="font-medium text-gray-900 dark:text-white block">Language</span>
                 <span className="text-sm text-gray-500 dark:text-gray-400">{settings.language}</span>
               </div>
             </div>
              <div className="relative">
                <select 
                  value={settings.language}
                  onChange={(e) => setSettings(s => ({ ...s, language: e.target.value }))}
                  className="appearance-none bg-transparent border-none pr-8 text-right focus:ring-0 cursor-pointer text-gray-900 dark:text-white"
                >
                  {languageOptions.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
                <ChevronDown size={20} className="text-gray-400 absolute right-0 top-1 pointer-events-none" />
             </div>
          </div>
        </div>

        {/* Typography Section */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors duration-300">
          <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
             <h2 className="text-lg font-bold text-gray-900 dark:text-white">Typography</h2>
           </div>
          <div className="p-8">
             <div className="flex items-center gap-4 mb-6">
               <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-700 dark:text-gray-300"><TypeIcon size={20} /></div>
                <div>
                 <span className="font-medium text-gray-900 dark:text-white block">Font Settings</span>
                 <span className="text-sm text-gray-500 dark:text-gray-400">Customize font styles and size.</span>
               </div>
             </div>

             {/* Font Family Selectors */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pl-14">
               <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Body Font (Sans-Serif)</label>
                 <div className="relative">
                   <select 
                     value={settings.bodyFont}
                     onChange={(e) => setSettings(s => ({ ...s, bodyFont: e.target.value }))}
                     className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                   >
                     <option value="'Inter', sans-serif">Inter (Default)</option>
                     <option value="'Roboto', sans-serif">Roboto</option>
                     <option value="'Open Sans', sans-serif">Open Sans</option>
                   </select>
                   <ChevronDown size={16} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
                 </div>
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Heading Font (Serif/Sans)</label>
                 <div className="relative">
                   <select 
                     value={settings.headingFont}
                     onChange={(e) => setSettings(s => ({ ...s, headingFont: e.target.value }))}
                     className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                   >
                     <option value="'Inter', sans-serif">Inter (Default)</option>
                     <option value="'Playfair Display', serif">Playfair Display</option>
                     <option value="'Merriweather', serif">Merriweather</option>
                     <option value="'Roboto', sans-serif">Roboto</option>
                     <option value="'Open Sans', sans-serif">Open Sans</option>
                   </select>
                   <ChevronDown size={16} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
                 </div>
               </div>
             </div>

             {/* Font Size Slider */}
             <div className="pl-14">
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Text Size</label>
               <div className="flex items-center gap-4">
                 <span className="text-xs text-gray-500 dark:text-gray-400">S</span>
                 <div className="flex-1 relative">
                    <input 
                      type="range" 
                      min="0" 
                      max="2" 
                      step="1"
                      value={settings.fontSize === 'Small' ? 0 : settings.fontSize === 'Large' ? 2 : 1}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setSettings(s => ({ ...s, fontSize: val === 0 ? 'Small' : val === 2 ? 'Large' : 'Medium' }));
                      }}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    />
                 </div>
                 <span className="text-lg text-gray-500 dark:text-gray-400">L</span>
               </div>
             </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button 
            onClick={() => setSettings({ 
              darkMode: false, 
              theme: 'Warm Sunset', 
              language: 'English (US)', 
              fontSize: 'Medium',
              bodyFont: "'Open Sans', sans-serif",
              headingFont: "'Merriweather', serif"
            })}
            className="px-6 py-3 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 font-semibold rounded-xl hover:bg-orange-200 dark:hover:bg-orange-900/50 active:scale-95 transition"
          >
            Reset Defaults
          </button>
        </div>
      </div>
    </div>
  );

  const renderHelp = () => (
    <div className="max-w-5xl mx-auto py-8 px-4 animate-fade-in-up">
      <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">Help & Information</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">Your guide to creating amazing marketing content for your local business.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
           <div className="h-48 bg-gradient-to-b from-orange-200 to-orange-50 dark:from-orange-900 dark:to-gray-800 relative flex items-center justify-center">
              <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
              <div className="text-orange-900 dark:text-orange-200 opacity-80 text-center px-6">
                <h3 className="font-bold text-xl">Generate Marketing Content in Seconds</h3>
              </div>
           </div>
           <div className="p-8">
             <span className="text-xs font-bold text-orange-500 uppercase mb-2 block">About The App</span>
             <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Generate Marketing Content in Seconds</h3>
             <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
               This app is designed for local cafés, restaurants, salons, and small shops to easily generate marketing content, hashtags, and promotional ideas using AI.
             </p>
           </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
           <span className="text-xs font-bold text-gray-400 uppercase mb-4 block">Quick Start Guide</span>
           <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Getting Started is Easy</h3>
           <p className="text-gray-600 dark:text-gray-300 mb-6">Follow these simple steps to create your first campaign and watch your ideas come to life.</p>
           
           <div className="space-y-6">
             <div className="flex gap-4">
               <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0"><Flag size={18} /></div>
               <div>
                 <h4 className="font-bold text-gray-900 dark:text-white">1. Choose Your Goal</h4>
                 <p className="text-sm text-gray-500 dark:text-gray-400">Decide what you want to achieve, like promoting a new product.</p>
               </div>
             </div>
              <div className="flex gap-4">
               <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0"><Sparkles size={18} /></div>
               <div>
                 <h4 className="font-bold text-gray-900 dark:text-white">2. Generate Ideas</h4>
                 <p className="text-sm text-gray-500 dark:text-gray-400">Enter your prompt and let our AI create unique content.</p>
               </div>
             </div>
              <div className="flex gap-4">
               <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 shrink-0"><Send size={18} /></div>
               <div>
                 <h4 className="font-bold text-gray-900 dark:text-white">3. Review & Publish</h4>
                 <p className="text-sm text-gray-500 dark:text-gray-400">Copy, save, or export your campaign and share it with the world.</p>
               </div>
             </div>
           </div>
        </div>
      </div>
      
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-3xl p-8 text-center border border-blue-100 dark:border-blue-800">
        <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-2">Need more help?</h3>
        <p className="text-blue-700 dark:text-blue-300 mb-6 max-w-2xl mx-auto">
          Our AI assistant is available 24/7 to answer your questions. Click the chat icon in the bottom right corner to start a conversation.
        </p>
        <button 
          onClick={() => setIsChatOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-8 py-3 rounded-xl font-semibold shadow-lg shadow-blue-500/30 transition"
        >
          Open Chat Support
        </button>
      </div>
    </div>
  );

  const renderChatBot = () => (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 ${isChatOpen ? 'bg-red-500 rotate-90' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
      >
        {isChatOpen ? <X size={24} /> : <Bot size={28} />}
      </button>

      {/* Chat Window */}
      <div className={`fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col transition-all duration-300 origin-bottom-right ${isChatOpen ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-90 opacity-0 pointer-events-none translate-y-10'}`} style={{ height: '500px', maxHeight: '70vh' }}>
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-blue-600 rounded-t-2xl flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-sm">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">AI Assistant</h3>
            <p className="text-blue-100 text-xs">Powered by Gemini 3 Pro</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
          {chatMessages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-pop-in`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'
              }`}>
                {msg.text}
              </div>
           </div>
          ))}

          {/* Quick Replies */}
          {chatMessages.length === 1 && !isChatTyping && (
             <div className="grid grid-cols-1 gap-2 mt-2 animate-fade-in-up px-1">
               <p className="text-xs text-gray-400 mb-1 ml-1">Suggested actions:</p>
               {quickReplies.map((reply) => (
                 <button 
                   key={reply}
                   onClick={() => handleChatSubmit(undefined, reply)}
                   className="text-xs text-left bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 p-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-500 transition-colors text-gray-700 dark:text-gray-200 shadow-sm"
                 >
                   {reply}
                 </button>
               ))}
             </div>
          )}

          {isChatTyping && (
            <div className="flex justify-start animate-pop-in">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-bl-none px-4 py-3 flex gap-1.5 items-center">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleChatSubmit} className="p-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl flex gap-2">
          <input 
            type="text" 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ask me anything..."
            className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition text-sm"
          />
          <button 
            type="submit" 
            disabled={!chatInput.trim() || isChatTyping}
            className="bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-2.5 rounded-xl transition shadow-md"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </>
  );

  return (
    <div className={`min-h-screen transition-colors duration-500 ${getThemeBackground()}`}>
      <Header currentView={view} setView={setView} />
      
      <main className="pb-24">
        {view === AppView.HOME && renderHome()}
        {view === AppView.CAMPAIGN_STEP_1 && renderStep1()}
        {view === AppView.CAMPAIGN_STEP_2 && renderStep2()}
        {view === AppView.CAMPAIGN_STEP_3 && renderStep3()}
        {view === AppView.STUDIO && renderStudio()}
        {view === AppView.HISTORY && renderHistory()}
        {view === AppView.SETTINGS && renderSettings()}
        {view === AppView.HELP && renderHelp()}
      </main>

      {renderChatBot()}
    </div>
  );
};

export default App;
