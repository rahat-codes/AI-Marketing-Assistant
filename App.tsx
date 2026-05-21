
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
      setVideoError(e?.message || "Failed to generate video. Please try again later.");
    } finally {
      setIsVideoGenerating(false);
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
    <div className="relative overflow-hidden pt-6">
      {/* Premium Ambient Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] pointer-events-none overflow-hidden opacity-50 dark:opacity-30">
        <div className="absolute top-12 left-1/4 w-[400px] h-[400px] bg-gradient-to-tr from-blue-400 via-indigo-500 to-purple-500 rounded-full blur-[120px] opacity-15 dark:opacity-20 animate-blob"></div>
        <div className="absolute top-20 right-1/4 w-[400px] h-[400px] bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-600 rounded-full blur-[120px] opacity-15 dark:opacity-20 animate-blob" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Hero Section */}
        <section className="relative pt-12 pb-20 sm:pt-16 sm:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
            <div className="lg:col-span-7 text-center lg:text-left">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 text-blue-700 dark:text-blue-300 font-bold rounded-xl text-xs tracking-tight uppercase border border-blue-500/10 mb-6 animate-fade-in-up shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-650 dark:bg-blue-400 animate-pulse" />
                Next-Gen Gemini & Veo AI
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tighter leading-[1.08] animate-fade-in-up" style={{ animationDelay: '0.1s', textWrap: 'balance' }}>
                Create high-performing marketing <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 bg-clip-text text-transparent">materials in seconds.</span>
              </h1>
              <p className="mt-5 max-w-xl mx-auto lg:mx-0 text-base sm:text-lg text-slate-500 dark:text-slate-400 font-medium leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                Design professional campaigns, convert customers, and generate engaging high-definition video advertisements. No designer needed. Perfect for local shops, cafes, and modern brands.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                <button 
                  onClick={() => setView(AppView.CAMPAIGN_STEP_1)}
                  className="w-full sm:w-auto bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 hover:scale-[1.02] active:scale-98 text-white font-bold py-3.5 px-7 rounded-xl shadow-lg hover:shadow-xl dark:shadow-blue-500/20 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  Start Premium Campaign
                  <ArrowRight size={16} />
                </button>
                <button 
                  onClick={() => setView(AppView.HELP)}
                  className="w-full sm:w-auto bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-3.5 px-6 rounded-xl transition-all duration-300 flex items-center justify-center"
                >
                  Explore Documentation
                </button>
              </div>
              <div className="mt-10 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
                 <div className="flex justify-center lg:justify-start -space-x-1.5">
                   <img className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-[#0F172A]" src="https://images.unsplash.com/photo-1491528323818-fdd1f037f42b?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="" referrerPolicy="no-referrer" />
                   <img className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-[#0F172A]" src="https://images.unsplash.com/photo-1550525811-e5869dd03032?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="" referrerPolicy="no-referrer" />
                   <img className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-[#0F172A]" src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2.25&w=256&h=256&q=80" alt="" referrerPolicy="no-referrer" />
                 </div>
                 <p className="text-xs text-slate-400 dark:text-slate-500 mt-2.5 font-semibold">
                   Trusted by over <span className="font-extrabold text-slate-700 dark:text-slate-300">1,200+ local brands</span> and dynamic enterprises worldwide.
                 </p>
              </div>
            </div>

            <div className="lg:col-span-5 relative animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <div className="relative bg-white dark:bg-[#1E293B]/90 p-4 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 transform lg:rotate-2 hover:rotate-0 hover:scale-[1.01] transition-all duration-500">
                 {/* Live Status indicator label */}
                 <div className="absolute top-6 right-6 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider">
                   <span className="w-1.5 h-1.5 rounded-full bg-emerald-505 bg-emerald-500 animate-ping"></span>
                   Live generation demo
                 </div>
                 
                 {/* Mock UI Card */}
                 <div className="bg-slate-50/70 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/20">
                   <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-orange-100 dark:bg-orange-950/20 rounded-xl flex items-center justify-center text-orange-600 dark:text-orange-400 border border-orange-500/15"><Coffee size={18} /></div>
                      <div>
                         <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">The Daily Grind Espresso</h4>
                         <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Local Premium Coffee</p>
                      </div>
                   </div>
                   <div className="h-44 bg-slate-200/50 dark:bg-slate-850 rounded-xl mb-4 overflow-hidden relative flex items-center justify-center text-slate-400 dark:text-slate-600 group">
                      <div className="absolute inset-0 bg-cover bg-center opacity-90 transition-all duration-500 group-hover:scale-105" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1507133750040-4a8f57021571?auto=format&fit=crop&w=600&q=80')" }}></div>
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent"></div>
                      <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-md bg-black/40 backdrop-blur-sm text-[10px] text-white font-bold uppercase tracking-wider flex items-center gap-1">
                        <Sparkles size={10} /> Output Preview
                      </span>
                   </div>
                   <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                     <strong className="font-extrabold text-slate-800 dark:text-white text-xs block mb-1">Weekend Fuel is Brewed! ☕️✨</strong> 
                     Start your cold-brew adventures right with our classic custom pour-over. Handcrafted with love in Seattle center.
                   </p>
                   <div className="flex gap-2 mt-4">
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-md font-bold uppercase tracking-tight">#CoffeeLover</span>
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-md font-bold uppercase tracking-tight">#OrganicBeans</span>
                   </div>
                 </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 border-t border-slate-100 dark:border-slate-800/40">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Intuitive workflow, beautiful output</h2>
            <p className="mt-3 text-slate-500 dark:text-slate-400 font-medium">From professional business configurations to automated promotional assets.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div
              onClick={() => setView(AppView.CAMPAIGN_STEP_1)}
              className="bg-white dark:bg-[#1E293B]/70 p-8 rounded-3xl shadow-md hover:shadow-xl border border-slate-100 dark:border-slate-800/30 hover:-translate-y-1 transition-all duration-350 group cursor-pointer"
            >
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6 transition-transform duration-350 group-hover:scale-105">
                <Rocket size={22} />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Campaign Generation</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">Generate high-performing social posts, custom hashtags, and local ad copy calibrated with artificial intelligence.</p>
            </div>
            <div
              onClick={() => setView(AppView.STUDIO)}
              className="bg-white dark:bg-[#1E293B]/70 p-8 rounded-3xl shadow-md hover:shadow-xl border border-slate-100 dark:border-slate-800/30 hover:-translate-y-1 transition-all duration-350 group cursor-pointer"
            >
              <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400 mb-6 transition-transform duration-350 group-hover:scale-105">
                <Clapperboard size={22} />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Video Studio</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">Generate realistic high-definition advertisements and video assets from text prompts and starter images with Veo AI.</p>
            </div>
            <div
              onClick={() => setView(AppView.HISTORY)}
              className="bg-white dark:bg-[#1E293B]/70 p-8 rounded-3xl shadow-md hover:shadow-xl border border-slate-100 dark:border-slate-800/30 hover:-translate-y-1 transition-all duration-350 group cursor-pointer"
            >
              <div className="w-12 h-12 bg-cyan-50 dark:bg-cyan-900/30 rounded-2xl flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-6 transition-transform duration-350 group-hover:scale-105">
                <LayoutGrid size={22} />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">History Archives</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">Maintain a perfect historical archive of generated variants, saved drafts, business parameters, and content ideas.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="max-w-3xl mx-auto py-12 px-4 animate-fade-in-up">
      <ProgressBar currentStep={1} />
      
      <div className="bg-white dark:bg-[#1E293B]/70 p-8 rounded-3xl border border-slate-100 dark:border-slate-800/40 shadow-xl transition-colors duration-300">
        <div className="mb-8 border-b border-slate-100 dark:border-slate-800/40 pb-6">
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-1.5">Business Profile Configuration</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">Provide your unique parameters to train the AI Marketing engine on your brand.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="flex items-center text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5">
              Business Name
              <Tooltip text="The official name of your business as it appears to customers." />
            </label>
            <input 
              type="text" 
              value={profile.name}
              onChange={(e) => handleProfileChange('name', e.target.value)}
              placeholder="e.g., The Daily Grind Espresso"
              className="w-full px-4 py-3 rounded-xl border border-slate-205 border-slate-200/80 dark:border-slate-800 focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all duration-300 bg-slate-50 dark:bg-slate-900 dark:text-white font-semibold text-sm"
            />
          </div>
          <div>
            <label className="flex items-center text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5">
              Sector / Business Type
              <Tooltip text="The category that best describes what your business does (e.g., Restaurant, Retail)." />
            </label>
            <div className="relative">
              <select 
                value={profile.type}
                onChange={(e) => handleProfileChange('type', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-205 border-slate-200/80 dark:border-slate-800 focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all duration-300 bg-slate-50 dark:bg-slate-900 dark:text-white font-semibold text-sm appearance-none cursor-pointer"
              >
                <option value="" disabled>Select a type</option>
                <option value="Coffee Shop">Coffee Shop</option>
                <option value="Restaurant">Restaurant</option>
                <option value="Retail Store">Retail Store</option>
                <option value="Service Provider">Service Provider</option>
                <option value="Salon/Spa">Salon/Spa</option>
              </select>
              <ChevronDown className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" size={17} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="flex items-center text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5">
              Location Hub
              <Tooltip text="Where your business is physically located or the area you serve." />
            </label>
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <input 
                    type="text" 
                    value={profile.location}
                    onChange={(e) => handleProfileChange('location', e.target.value)}
                    placeholder="e.g., San Francisco, CA"
                    className="w-full px-4 py-3 rounded-xl border border-slate-205 border-slate-200/80 dark:border-slate-800 focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all duration-300 bg-slate-50 dark:bg-slate-900 dark:text-white font-semibold text-sm"
                    />
                </div>
                <button
                    onClick={handleAutoLocation}
                    disabled={isLocating || (!profile.name && !profile.location)}
                    className="bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 disabled:bg-slate-100 disabled:dark:bg-slate-800 disabled:text-slate-400 text-white px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 min-w-[105px] border border-transparent disabled:border-slate-200/50"
                    title="Verify with Google Maps"
                >
                    {isLocating ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
                    <span className="font-bold text-xs">Auto-Find</span>
                </button>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-semibold font-mono flex items-center gap-1.5 uppercase tracking-wide">
                <MapPin size={11} className="text-red-500" /> Powered by Gemini Maps Grounding
            </p>
          </div>
          <div>
            <label className="flex items-center text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5">
              Target Audience
              <Tooltip text="The specific group of people you want to reach (e.g., 'Parents with toddlers', 'Coffee enthusiasts')." />
            </label>
            <input 
              type="text" 
              value={profile.audience}
              onChange={(e) => handleProfileChange('audience', e.target.value)}
              placeholder="e.g., Young professionals, families"
              className="w-full px-4 py-3 rounded-xl border border-slate-205 border-slate-200/80 dark:border-slate-800 focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all duration-300 bg-slate-50 dark:bg-slate-900 dark:text-white font-semibold text-sm"
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="flex items-center text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5">
            Business Core Pitch / Description
            <Tooltip text="A brief summary of what your business offers and its unique selling points." />
          </label>
          <textarea 
            value={profile.description}
            onChange={(e) => handleProfileChange('description', e.target.value)}
            placeholder="Describe what makes your business unique, your special ingredients or custom methods..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-slate-205 border-slate-200/80 dark:border-slate-800 focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all duration-300 bg-slate-50 dark:bg-slate-900 dark:text-white font-semibold text-sm resize-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="flex items-center text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5">
              Brand personality / Tone
              <Tooltip text="The personality and style of your communication (e.g., Professional, Friendly, Witty)." />
            </label>
            <div className="relative">
              <select 
                value={profile.tone}
                onChange={(e) => handleProfileChange('tone', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-205 border-slate-200/80 dark:border-slate-800 focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all duration-300 bg-slate-50 dark:bg-slate-900 dark:text-white font-semibold text-sm appearance-none cursor-pointer"
              >
                 <option value="" disabled>Select a tone</option>
                 <option value="Friendly">Friendly</option>
                 <option value="Professional">Professional</option>
                 <option value="Witty">Witty</option>
                 <option value="Urgent">Urgent</option>
                 <option value="Luxury">Luxury</option>
              </select>
              <ChevronDown className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" size={17} />
            </div>
          </div>
          <div>
            <label className="flex items-center text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5">
              Preferred Language
              <Tooltip text="The language you want the generated content to be in." />
            </label>
            <div className="relative">
              <select 
                value={profile.language}
                onChange={(e) => handleProfileChange('language', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-205 border-slate-200/80 dark:border-slate-800 focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all duration-300 bg-slate-50 dark:bg-slate-900 dark:text-white font-semibold text-sm appearance-none cursor-pointer"
              >
                {languageOptions.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" size={17} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800/40 pt-6">
          <button className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white px-4 py-2 rounded-xl transition-all duration-300">Save draft Profile</button>
          <button 
            onClick={() => setView(AppView.CAMPAIGN_STEP_2)}
            className="bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-650 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold py-3 px-8 rounded-xl shadow-lg ring-1 ring-blue-500/10 transition-all duration-300"
          >
            Continue setup
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
      
      <div className="bg-white dark:bg-[#1E293B]/70 p-8 rounded-3xl border border-slate-100 dark:border-slate-800/40 shadow-xl transition-colors duration-300">
        <div className="flex justify-between items-center mb-8 border-b border-slate-100 dark:border-slate-800/40 pb-6">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Campaign Parameters</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mt-1">Refine the target specifications for this AI marketing sprint.</p>
          </div>
          
          <button 
            onClick={handleAutoSuggest}
            disabled={isSuggesting}
            className="bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 text-purple-650 dark:text-purple-400 px-4 py-2.5 rounded-xl font-bold text-xs tracking-tight uppercase flex items-center gap-1.5 transition-all duration-300 active:scale-95 disabled:opacity-50 border border-purple-500/10 shadow-sm"
          >
            {isSuggesting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            AI Autocomplete
          </button>
        </div>

        <div className="mb-6">
          <label className="flex items-center text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5">
            Campaign Objective / Type
            <Tooltip text="The goal of this specific marketing effort (e.g., announcing a sale, educational post)." />
          </label>
          <div className="relative">
            <select 
              value={campaign.type}
              onChange={(e) => handleCampaignChange('type', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-205 border-slate-200/80 dark:border-slate-800 focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all duration-300 bg-slate-50 dark:bg-slate-900 dark:text-white font-semibold text-sm appearance-none cursor-pointer"
            >
              <option value="Promotion">Promotion</option>
              <option value="Announcement">Announcement</option>
              <option value="Event">Event</option>
              <option value="Educational">Educational</option>
            </select>
            <ChevronDown className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" size={17} />
          </div>
        </div>

        <div className="mb-6">
          <label className="flex items-center text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3.5">
            Target Channel Platforms
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
                   className={`p-4 rounded-2xl border-2 text-center transition-all duration-350 relative group ${
                     isSelected
                       ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-600 shadow-md ring-2 ring-blue-500/10' 
                       : 'bg-slate-50/50 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-850 hover:border-slate-350 dark:hover:border-slate-700 hover:shadow-sm'
                   }`}
                 >
                   <div className="flex justify-center mb-2.5">
                      <Icon size={21} className={p.color} />
                   </div>
                   <span className={`font-extrabold text-xs tracking-tight ${
                     isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'
                   }`}>{p.name}</span>
                   {isSelected && (
                     <div className="absolute top-2.5 right-2.5 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center text-white animate-pop-in">
                       <CheckCircle size={11} />
                     </div>
                   )}
                 </button>
               );
             })}
          </div>
        </div>

        <div className="mb-6">
          <label className="flex items-center text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5">
            Special Offers, Terms or Key Phrases
            <Tooltip text="Key phrases, specific deals (like '50% off'), or topics to include in the content." />
          </label>
          <input 
            type="text" 
            value={campaign.keywords}
            onChange={(e) => handleCampaignChange('keywords', e.target.value)}
            placeholder="e.g., 'Buy One Get One Free', 'Holiday Special Offer', 'Seattle Espresso'"
            className="w-full px-4 py-3 rounded-xl border border-slate-250 border-slate-200/80 dark:border-slate-800 focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all duration-300 bg-slate-50 dark:bg-slate-900 dark:text-white font-semibold text-sm"
          />
          <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500 font-semibold font-mono uppercase tracking-wide">Enter custom terms to tailor AI output style and target hooks.</p>
        </div>

        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
             <label className="flex items-center text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
               Caption Text Length
               <Tooltip text="How long you want the text captions to be." />
             </label>
             <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest font-mono bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-md">
               {campaign.length < 33 ? 'Short Capture' : campaign.length > 66 ? 'Long Narrative' : 'Medium Dynamic'}
             </span>
          </div>
          
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={campaign.length}
            onChange={(e) => handleCampaignChange('length', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
          />
          <div className="flex justify-between mt-2.5 text-[10px] text-slate-400 dark:text-slate-500 font-bold font-mono uppercase tracking-wider">
            <span>Compact</span>
            <span>Balanced</span>
            <span>Narrative</span>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/40 pt-6">
           <button 
            onClick={() => setView(AppView.CAMPAIGN_STEP_1)}
            className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white px-4 py-2 rounded-xl transition"
          >
            Back to profile
          </button>
          <button 
            onClick={generateContent}
            className="bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 active:scale-98 text-white font-bold py-3.5 px-8 rounded-xl shadow-lg dark:shadow-blue-500/20 transition-all duration-300 w-full md:w-auto"
          >
            Generate Marketing Materials
          </button>
        </div>
      </div>
    </div>
    );
  };

  const renderStep3 = () => (
    <div className="max-w-6xl mx-auto py-12 px-4 animate-fade-in-up">
      <ProgressBar currentStep={3} />

      <div className="text-center mb-10">
         <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">AI Generated Campaigns</h1>
         <p className="text-slate-500 dark:text-slate-400 font-semibold text-sm">Review your options, generate custom visual assets, and deploy to your channels.</p>
      </div>

      {isGenerating ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
           {[1, 2, 3].map(i => (
             <div key={i} className="bg-white dark:bg-[#1E293B]/70 rounded-3xl p-6 h-96 shadow-lg border border-slate-100 dark:border-slate-800/40 flex flex-col gap-4">
               <div className="h-6 bg-slate-200/50 dark:bg-slate-805 dark:bg-slate-800 rounded w-3/4"></div>
               <div className="h-4 bg-slate-200/50 dark:bg-slate-805 dark:bg-slate-800 rounded w-full"></div>
               <div className="h-4 bg-slate-200/50 dark:bg-slate-805 dark:bg-slate-800 rounded w-full"></div>
               <div className="h-4 bg-slate-200/50 dark:bg-slate-805 dark:bg-slate-800 rounded w-5/6"></div>
               <div className="flex-1"></div>
               <div className="h-10 bg-slate-200/50 dark:bg-slate-805 dark:bg-slate-800 rounded-xl w-full"></div>
             </div>
           ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {generatedVariants.map((variant, idx) => (
            <div key={idx} className="bg-white dark:bg-[#1E293B]/70 rounded-3xl shadow-md overflow-hidden flex flex-col border border-slate-100 dark:border-slate-800/40 hover:shadow-xl transition-all duration-350 hover:-translate-y-1">
              <div className="p-6 flex-1">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/30">
                  <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/25 px-2.5 py-1 rounded-lg">Option {idx + 1}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                
                <div className="mb-5 bg-slate-50/50 dark:bg-slate-900/30 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/10">
                   <h3 className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Headline Hook</h3>
                   <p className="text-sm text-slate-900 dark:text-white font-extrabold leading-snug">{variant.headline}</p>
                </div>

                <div className="mb-5">
                  <h3 className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Post Copy Draft</h3>
                  <p className="text-slate-600 dark:text-slate-300 text-xs whitespace-pre-line leading-relaxed font-semibold">{variant.postCopy}</p>
                </div>

                <div className="mb-5">
                   <h3 className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Hashtags</h3>
                   <div className="flex flex-wrap gap-1.5">
                     {variant.hashtags.map(tag => (
                       <span key={tag} className="bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-400 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider hover:scale-105 transition-transform cursor-default">
                         {tag}
                       </span>
                     ))}
                   </div>
                </div>
                
                <div className="bg-blue-50/40 dark:bg-blue-950/20 p-4 rounded-2xl mb-5 border border-blue-550/5 dark:border-blue-500/10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2.5 gap-2">
                      <h3 className="text-[10px] font-mono font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wider">Visual Asset Prompt</h3>
                      <div className="flex items-center gap-1.5 w-full sm:w-auto">
                        <input 
                            type="text" 
                            placeholder="Style (e.g. Cinematic)" 
                            className="text-[11px] px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-900/50 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-250 w-full sm:w-28 focus:ring-2 focus:ring-blue-600/20 outline-none font-bold"
                            value={imageStyles[idx] || ''}
                            onChange={(e) => setImageStyles(prev => ({...prev, [idx]: e.target.value}))}
                        />
                        <button 
                            onClick={() => handleGenerateImage(idx, variant.visualIdea, imageStyles[idx] || '')}
                            disabled={generatingImgIdx === idx}
                            className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white p-1.5 rounded-lg transition disabled:opacity-50 flex items-center gap-1 shrink-0"
                            title="Generate image from prompt"
                        >
                            {generatingImgIdx === idx ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />}
                        </button>
                      </div>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] font-medium leading-relaxed mb-3.5 italic">"{variant.visualIdea}"</p>
                    
                    {/* Generated Image Display */}
                    {generatedImages[idx] && (
                      <div className="mt-2 relative group rounded-xl overflow-hidden border border-blue-200/50 dark:border-blue-900/50 shadow-sm animate-pop-in">
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
                           className="absolute top-2.5 right-2.5 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                           title="Download Image"
                         >
                           <Download size={14} />
                         </button>
                      </div>
                    )}
                </div>

                 <div className="mb-2">
                    <h3 className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Strategy Recommendations</h3>
                    <ul className="space-y-1 list-none text-slate-500 dark:text-slate-400 text-[11px] font-semibold">
                      {variant.engagementTips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <CheckCircle size={12} className="text-indigo-500 mt-0.5" />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                </div>
              </div>
              
              {/* Social Share Buttons */}
              <div className="px-6 pb-3 flex items-center justify-end gap-2 border-t border-slate-50 dark:border-slate-800/40 pt-4">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase mr-1">Direct Share:</span>
                
                <button 
                  onClick={() => handleShare('twitter', variant)} 
                  className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition hover:scale-105" 
                  title="Share to Twitter"
                >
                  <Twitter size={15} />
                </button>

                <button 
                  onClick={() => handleShare('facebook', variant)} 
                  className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition hover:scale-105" 
                  title="Copy & Open Facebook"
                >
                  <Facebook size={15} />
                </button>

                <button 
                  onClick={() => handleShare('instagram', variant)} 
                  className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition hover:scale-105" 
                  title="Copy & Open Instagram"
                >
                  <Instagram size={15} />
                </button>

                {typeof navigator !== 'undefined' && navigator.share && (
                   <button 
                    onClick={() => handleShare('webshare', variant)} 
                    className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition hover:scale-105" 
                    title="Share via..."
                  >
                     <Share2 size={15} />
                   </button>
                )}
              </div>

              <div className="p-4 bg-slate-50/70 dark:bg-slate-900/60 flex justify-between items-center gap-1.5 border-t border-slate-100 dark:border-slate-800/40">
                <button 
                  onClick={() => handleCopyContent(variant)}
                  className="flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-bold uppercase tracking-wider px-3 py-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition active:scale-95"
                >
                  <Copy size={14} /> Copy
                </button>
                 <button onClick={generateContent} className="flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-bold uppercase tracking-wider px-3 py-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition active:scale-95">
                  <RefreshCw size={14} className="animate-spin-hover" /> Re-Draft
                </button>
                 <button 
                  onClick={() => handleSaveCampaign(variant)}
                  className="flex items-center gap-1.5 bg-blue-650 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
                 >
                  <Save size={14} /> Save Draft
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
       <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">Creative Video Studio</h1>
       <p className="text-slate-500 dark:text-slate-400 font-semibold text-sm mb-8">Generate high-definition social advertisements and promotional loops using Veo AI.</p>

       <div className="bg-white dark:bg-[#1E293B]/70 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800/30 overflow-hidden">
          <div className="flex border-b border-slate-100 dark:border-slate-800/40 bg-slate-50/40 dark:bg-slate-900/30">
             <button 
               onClick={() => setStudioTab('text-to-video')}
               className={`flex-1 py-4 font-bold text-xs tracking-wider uppercase transition-all duration-300 ${studioTab === 'text-to-video' ? 'bg-white dark:bg-[#1E293B]/40 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'}`}
             >
               Text to Video
             </button>
             <button 
               onClick={() => setStudioTab('image-to-video')}
               className={`flex-1 py-4 font-bold text-xs tracking-wider uppercase transition-all duration-300 ${studioTab === 'image-to-video' ? 'bg-white dark:bg-[#1E293B]/40 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'}`}
             >
               Image to Video
             </button>
          </div>

          <div className="p-8">
             {studioTab === 'image-to-video' && (
               <div className="mb-6 animate-fade-in-up">
                 <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5">Upload Starter Image</label>
                 <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-900/30 transition hover:border-blue-500">
                   {videoImage ? (
                     <div className="relative w-full max-h-64 flex justify-center">
                       <img src={videoImage} alt="Preview" className="max-h-64 rounded-xl shadow-md border border-slate-100 dark:border-slate-800" />
                       <button 
                         onClick={() => setVideoImage(null)}
                         className="absolute top-2.5 right-2.5 bg-white dark:bg-slate-900 p-1.5 rounded-full shadow-md text-slate-600 dark:text-slate-300 hover:text-red-500 transition"
                       >
                         <X size={15} />
                       </button>
                     </div>
                   ) : (
                     <label className="cursor-pointer flex flex-col items-center p-4">
                       <Upload size={28} className="text-slate-400 dark:text-slate-500 mb-2.5" />
                       <span className="text-xs text-slate-500 dark:text-slate-450 font-semibold">Drop or click to upload starter frame</span>
                       <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                     </label>
                   )}
                 </div>
               </div>
             )}

             <div className="mb-6">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 text-left">
                  {studioTab === 'text-to-video' ? 'AI Video Prompt' : 'AI Modification Prompt (Optional)'}
                </label>
                <textarea 
                  value={videoPrompt}
                  onChange={(e) => setVideoPrompt(e.target.value)}
                  placeholder={studioTab === 'text-to-video' ? "Describe the promotional video dynamic, transitions and mood..." : "Describe how you want this starter image to shift or animate..."}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-slate-205 border-slate-200/80 dark:border-slate-800 focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all duration-300 bg-slate-50 dark:bg-slate-900 dark:text-white font-semibold text-sm resize-none"
                />
             </div>

             <div className="mb-8">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 text-left">Canvas Aspect Ratio</label>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setVideoAspectRatio('16:9')}
                    className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all duration-300 active:scale-98 flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-tight ${videoAspectRatio === '16:9' ? 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-650 dark:border-blue-500 text-blue-700 dark:text-blue-400 ring-2 ring-blue-550/5' : 'border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 text-slate-400 dark:text-slate-550'}`}
                  >
                    <div className="w-5 h-3 border border-current rounded-sm"></div>
                    Landscape (16:9)
                  </button>
                  <button 
                    onClick={() => setVideoAspectRatio('9:16')}
                    className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all duration-300 active:scale-98 flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-tight ${videoAspectRatio === '9:16' ? 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-650 dark:border-blue-500 text-blue-700 dark:text-blue-400 ring-2 ring-blue-550/5' : 'border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 text-slate-400 dark:text-slate-550'}`}
                  >
                    <div className="w-3 h-5 border border-current rounded-sm"></div>
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
               className="w-full bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 active:scale-98 text-white font-bold py-3.5 rounded-xl shadow-lg dark:shadow-blue-500/20 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
             >
               {isVideoGenerating ? (
                 <>
                   <Loader2 size={16} className="animate-spin" />
                   <span className="text-xs uppercase tracking-wider">Generating Video Clip (polling status)...</span>
                 </>
               ) : (
                 <>
                   <Clapperboard size={15} />
                   <span className="text-xs uppercase tracking-wider">Render Ads Video</span>
                 </>
               )}
             </button>

             {generatedVideoUrl && (
               <div className="mt-8 animate-pop-in">
                 <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4 text-left">Generated Master Video</h3>
                 <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 bg-black">
                   <video src={generatedVideoUrl} controls className="w-full max-h-[480px] mx-auto" />
                 </div>
                 <div className="mt-4 flex justify-end">
                    <a 
                      href={generatedVideoUrl} 
                      download="generated-video.mp4"
                      className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-wider hover:underline"
                    >
                      <Save size={14} /> Download Video Mp4
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
         <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Campaign History</h1>
         <button onClick={() => setView(AppView.CAMPAIGN_STEP_1)} className="bg-blue-650 text-white text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-xl hover:bg-blue-700 hover:shadow-md transition duration-300 flex items-center gap-1.5 shadow shadow-blue-500/10">
           <span className="text-sm font-bold">+</span> New Campaign
         </button>
       </div>

       <div className="bg-white dark:bg-[#1E293B]/70 p-4 rounded-2xl shadow-sm mb-4 flex flex-col md:flex-row gap-4 items-center justify-between border border-slate-100 dark:border-slate-800/40">
          <div className="relative w-full md:w-96">
             <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
             <input 
               type="text" 
               value={historySearch}
               onChange={(e) => setHistorySearch(e.target.value)}
               placeholder="Search saved campaigns..." 
               className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/40 focus:ring-2 focus:ring-blue-600/10 focus:border-blue-650 outline-none text-slate-900 dark:text-white placeholder-slate-400 font-semibold text-xs transition" 
             />
          </div>
          <div className="flex gap-2">
             <button className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:scale-105 transition duration-300"><LayoutGrid size={16} /></button>
             <button className="p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg hover:scale-105 transition duration-300"><List size={16} /></button>
          </div>
       </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-4 mb-6 p-4 bg-white dark:bg-[#1E293B]/70 rounded-2xl border border-slate-100 dark:border-slate-800/40 shadow-sm animate-none">
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
          className="text-xs font-bold text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
        >
          Clear Dates
        </button>
      </div>


       <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
         {['All', 'Instagram', 'Facebook', 'Email', 'Promotion', 'Announcement'].map((filter) => (
           <button 
            key={filter} 
            onClick={() => setHistoryFilter(filter)}
            className={`px-4.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 active:scale-95 ${historyFilter === filter ? 'bg-blue-50 dark:bg-blue-900/25 text-blue-600 dark:text-blue-400' : 'bg-white dark:bg-[#1E293B]/70 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-800/40'}`}>
             {filter}
           </button>
         ))}
       </div>

       {displayedHistory.length === 0 ? (
         <div className="text-center py-20 bg-white dark:bg-[#1E293B]/70 rounded-3xl border border-slate-100 dark:border-slate-800/40">
           <p className="text-slate-400 dark:text-slate-500 text-sm font-semibold">No campaigns found matching your criteria.</p>
           <button onClick={() => { setHistorySearch(''); setHistoryFilter('All'); }} className="mt-3 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider hover:underline">Clear Filters</button>
         </div>
       ) : (
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {displayedHistory.map(item => (
            <div 
              key={item.id} 
              onClick={() => setSelectedCampaign(item)}
              className="bg-white dark:bg-[#1E293B]/70 rounded-3xl border border-slate-100 dark:border-slate-800/40 p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group hover:-translate-y-1 flex flex-col justify-between"
            >
               <div>
                  <div className="flex justify-between items-start gap-1 pb-3 mb-4 border-b border-slate-100 dark:border-slate-800/20">
                     <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wildest">{item.date}</span>
                     <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                  </div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white mb-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">{item.title}</h3>
               </div>
               
               <div className="flex items-center justify-between pt-4 border-t border-slate-50/40 dark:border-slate-800/20 mt-4">
                 <div className="flex gap-1.5 items-center">
                   <PlatformIconDisplay iconName={item.platformIcon} />
                   <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 bg-slate-100 dark:bg-slate-850 rounded-md text-slate-500 dark:text-slate-400">{item.type}</span>
                 </div>
                 <div className="flex gap-2 text-slate-400 opacity-0 group-hover:opacity-100 transition duration-300">
                    <Sparkles size={14} className="hover:text-blue-500" />
                    <Copy size={14} className="hover:text-indigo-500" />
                 </div>
               </div>
            </div>
          ))}
       </div>
       )}

       {/* Modal for Viewing Campaign Details */}
       {selectedCampaign && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto flex flex-col relative animate-pop-in border border-slate-100 dark:border-slate-800/40">
              
              {/* Modal Header */}
              <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-6 border-b border-slate-100 dark:border-slate-800/30 flex justify-between items-center z-10">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">{selectedCampaign.title}</h2>
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">Saved on {selectedCampaign.date} • {selectedCampaign.type}</p>
                </div>
                <button 
                  onClick={() => setSelectedCampaign(null)}
                  className="p-2 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition active:scale-95"
                >
                  <X size={16} />
                </button>
              </div>

                         <div className="p-6">
                {selectedCampaign.variant ? (
                  <>
                    <div className="mb-6 bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/40">
                      <h3 className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Headline Hooks</h3>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white leading-snug">{selectedCampaign.variant.headline}</p>
                    </div>
                    
                    <div className="mb-6">
                      <h3 className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Post Copy Draft</h3>
                      <div className="bg-slate-50/30 dark:bg-slate-950/10 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/40">
                        <p className="text-slate-650 dark:text-slate-300 whitespace-pre-line text-xs font-semibold leading-relaxed">{selectedCampaign.variant.postCopy}</p>
                      </div>
                    </div>

                    <div className="mb-6">
                      <h3 className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Recommended Hashtags</h3>
                       <div className="flex flex-wrap gap-1.5">
                         {selectedCampaign.variant.hashtags.map(tag => (
                           <span key={tag} className="bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-400 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                             {tag}
                           </span>
                         ))}
                       </div>
                    </div>

                    <div className="mb-6 bg-blue-50/40 dark:bg-blue-950/10 p-4 rounded-2xl border border-blue-550/5 dark:border-blue-900/15">
                      <h3 className="text-[10px] font-mono font-bold text-blue-800 dark:text-blue-450 uppercase tracking-wider mb-1.5">Visual Asset Prompt</h3>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed italic font-medium">
                        "{selectedCampaign.variant.visualIdea}"
                      </p>
                    </div>

                    <div>
                      <h3 className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Lead Strategy Tips</h3>
                      <ul className="space-y-1 list-none text-slate-500 dark:text-slate-400 text-[11px] font-semibold">
                        {selectedCampaign.variant.engagementTips.map((tip, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <CheckCircle size={12} className="text-indigo-500 mt-0.5" />
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                    <p className="text-sm font-semibold">No detailed content available for this campaign record.</p>
                  </div>
                )}
              </div>
              
              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/20 flex flex-wrap justify-end gap-3 rounded-b-3xl">
                <button className="px-4 py-2 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mr-auto transition duration-300" onClick={() => setSelectedCampaign(null)}>Close</button>
                
                <button onClick={() => handleExportText(selectedCampaign)} className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200/55 dark:border-slate-700 text-slate-600 dark:text-slate-200 rounded-xl text-xs font-bold uppercase transition duration-300 active:scale-95 shadow-sm">
                  <FileText size={14} />
                  <span className="hidden sm:inline">Export Text</span>
                </button>
                
                <button onClick={() => handleExportPDF(selectedCampaign)} className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200/55 dark:border-slate-700 text-slate-600 dark:text-slate-200 rounded-xl text-xs font-bold uppercase transition duration-300 active:scale-95 shadow-sm">
                  <Printer size={14} />
                  <span className="hidden sm:inline">Print / PDF</span>
                </button>

                <button className="px-4 py-2 bg-blue-650 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase transition duration-300 active:scale-95 shadow-sm flex items-center gap-1.5">
                  <Copy size={14} />
                  <span className="hidden sm:inline">Copy draft</span>
                </button>
              </div>
           </div>
         </div>
       )}
    </div>
    );
  };

  const renderSettings = () => (
    <div className="max-w-4xl mx-auto py-12 px-4 animate-fade-in-up">
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">System Settings</h1>
      <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-8 mt-1">Configure your workspace preferences, localization, and branding typography details.</p>
      
      <div className="space-y-6">
        
        {/* Appearance Section */}
        <div className="bg-white dark:bg-[#1E293B]/70 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/40 overflow-hidden transition-colors duration-300 animate-none">
          <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800/30 bg-slate-50/50 dark:bg-slate-950/20">
             <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Appearance</h2>
          </div>
          
          <div className="p-8 border-b border-slate-100 dark:border-slate-800/20 flex items-center justify-between">
             <div className="flex items-center gap-4">
               <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50">
                 {settings.darkMode ? <Moon size={16} /> : <Sun size={16} />}
               </div>
               <span className="text-sm font-bold text-slate-700 dark:text-white">Dark Interface</span>
             </div>
             <div 
               onClick={() => setSettings(s => ({ ...s, darkMode: !s.darkMode }))}
               className={`w-12 h-6.5 rounded-full p-1 cursor-pointer relative transition-colors ${settings.darkMode ? 'bg-blue-650' : 'bg-slate-200 dark:bg-slate-750'}`}
             >
               <div className={`w-4.5 h-4.5 bg-white rounded-full shadow transition-transform duration-300 ${settings.darkMode ? 'translate-x-5.5' : ''}`}></div>
             </div>
          </div>

          <div className="p-8 flex items-center justify-between">
             <div className="flex items-center gap-4">
               <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-705 dark:border-slate-700/50"><Palette size={16} /></div>
               <div>
                 <span className="text-sm font-bold text-slate-700 dark:text-white block">Visual Preset Accent</span>
                 <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">{settings.theme}</span>
               </div>
             </div>
             <div className="relative">
                <select 
                  value={settings.theme}
                  onChange={(e) => setSettings(s => ({ ...s, theme: e.target.value }))}
                  className="appearance-none bg-transparent border-none pr-8 text-right focus:ring-0 cursor-pointer text-xs font-bold uppercase text-slate-600 dark:text-slate-350"
                >
                  <option value="Warm Sunset">Warm Sunset</option>
                  <option value="Cool Breeze">Cool Breeze</option>
                  <option value="Forest Whisper">Forest Whisper</option>
                  <option value="Lavender Dream">Lavender Dream</option>
                </select>
                <ChevronDown size={14} className="text-slate-400 absolute right-0 top-1 pointer-events-none" />
             </div>
          </div>
        </div>

        {/* Language Section */}
        <div className="bg-white dark:bg-[#1E293B]/70 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/40 overflow-hidden transition-colors duration-300 animate-none">
           <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800/30 bg-slate-50/50 dark:bg-slate-950/20">
             <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Language & Region</h2>
           </div>
           <div className="p-8 flex items-center justify-between">
             <div className="flex items-center gap-4">
               <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50"><Globe size={16} /></div>
                <div>
                 <span className="text-sm font-bold text-slate-700 dark:text-white block">System Translation</span>
                 <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">{settings.language}</span>
               </div>
             </div>
              <div className="relative">
                <select 
                  value={settings.language}
                  onChange={(e) => setSettings(s => ({ ...s, language: e.target.value }))}
                  className="appearance-none bg-transparent border-none pr-8 text-right focus:ring-0 cursor-pointer text-xs font-bold uppercase text-slate-600 dark:text-slate-350"
                >
                  {languageOptions.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="text-slate-400 absolute right-0 top-1 pointer-events-none" />
             </div>
          </div>
        </div>

        {/* Typography Section */}
        <div className="bg-white dark:bg-[#1E293B]/70 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/40 overflow-hidden transition-colors duration-300 animate-none">
          <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800/30 bg-slate-50/50 dark:bg-slate-950/20">
             <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Typography</h2>
           </div>
          <div className="p-8">
             <div className="flex items-center gap-4 mb-6">
               <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50"><TypeIcon size={16} /></div>
                <div>
                 <span className="text-sm font-bold text-slate-700 dark:text-white block font-sans">Font Settings</span>
                 <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">Customize content styles, pairings, and layout margins here.</span>
               </div>
             </div>

             {/* Font Family Selectors */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pl-14">
               <div>
                 <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Body Font (Sans-Serif)</label>
                 <div className="relative">
                   <select 
                     value={settings.bodyFont}
                     onChange={(e) => setSettings(s => ({ ...s, bodyFont: e.target.value }))}
                     className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-950 dark:text-white text-xs font-bold focus:ring-2 focus:ring-blue-600/10 focus:border-blue-650 outline-none appearance-none"
                   >
                     <option value="'Inter', sans-serif">Inter (Default)</option>
                     <option value="'Roboto', sans-serif">Roboto</option>
                     <option value="'Open Sans', sans-serif">Open Sans</option>
                   </select>
                   <ChevronDown size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
                 </div>
               </div>
               <div>
                 <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Heading Font (Serif/Sans)</label>
                 <div className="relative">
                   <select 
                     value={settings.headingFont}
                     onChange={(e) => setSettings(s => ({ ...s, headingFont: e.target.value }))}
                     className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-950 dark:text-white text-xs font-bold focus:ring-2 focus:ring-blue-600/10 focus:border-blue-650 outline-none appearance-none"
                   >
                     <option value="'Inter', sans-serif">Inter (Default)</option>
                     <option value="'Playfair Display', serif">Playfair Display</option>
                     <option value="'Merriweather', serif">Merriweather</option>
                     <option value="'Roboto', sans-serif">Roboto</option>
                     <option value="'Open Sans', sans-serif">Open Sans</option>
                   </select>
                   <ChevronDown size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
                 </div>
               </div>
             </div>

             {/* Font Size Slider */}
             <div className="pl-14">
               <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Text scale size</label>
               <div className="flex items-center gap-4">
                 <span className="text-[10px] font-bold text-slate-400">SMALL</span>
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
                      className="w-full h-1 bg-slate-200 dark:bg-slate-750 rounded-lg appearance-none cursor-pointer accent-blue-650"
                    />
                 </div>
                 <span className="text-[10px] font-bold text-slate-400">LARGE</span>
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
              bodyFont: "'Inter', sans-serif",
              headingFont: "'Inter', sans-serif"
            })}
            className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-350 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition duration-300"
          >
            Reset Settings Defaults
          </button>
        </div>
      </div>
    </div>
  );

  const renderHelp = () => (
    <div className="max-w-5xl mx-auto py-12 px-4 animate-fade-in-up">
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">Help & Center</h1>
      <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-8 mt-1">Access detailed guides, optimization strategies, and interactive tools.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-none">
        <div className="bg-white dark:bg-[#1E293B]/70 rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800/40 shadow-sm flex flex-col justify-between">
           <div className="h-48 bg-gradient-to-br from-blue-600/10 via-purple-600/5 to-transparent relative flex items-center justify-center p-6 border-b border-slate-100 dark:border-slate-800/25">
              <div className="text-slate-700 dark:text-slate-200 text-center">
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-white leading-snug">Generate enterprise-grade campaign assets instantly</h3>
              </div>
           </div>
           <div className="p-8 flex-1">
             <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-450 uppercase mb-2 block tracking-wider">About the platform</span>
             <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-2 leading-snug">Autonomous marketing generation</h3>
             <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed font-semibold">
               This intelligent SaaS suite allows local ventures to craft highly customized copy, suggest local visual designs, and run micro-targeted platform campaigns in seconds.
             </p>
           </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B]/70 rounded-3xl p-8 border border-slate-100 dark:border-slate-800/40 shadow-sm">
           <span className="text-[10px] font-mono font-bold text-slate-400 uppercase mb-4 block tracking-wider">Campaign Orchestration</span>
           <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-4 leading-snug">Dynamic Pipeline Setup</h3>
           <p className="text-slate-500 dark:text-slate-400 mb-6 text-xs font-semibold leading-relaxed">Follow these clear actions to coordinate your business profile metrics with AI content drafts.</p>
           
           <div className="space-y-6">
             <div className="flex gap-4">
               <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 border border-slate-200/45 dark:border-slate-800/40"><Flag size={14} /></div>
               <div>
                 <h4 className="text-xs font-bold text-slate-850 dark:text-white uppercase tracking-tight">1. Tune Business Context</h4>
                 <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5 leading-relaxed">Input your primary category, visual branding guidelines, and target audience coordinates.</p>
               </div>
             </div>
              <div className="flex gap-4">
               <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 border border-slate-200/45 dark:border-slate-800/40"><Sparkles size={14} /></div>
               <div>
                 <h4 className="text-xs font-bold text-slate-850 dark:text-white uppercase tracking-tight">2. Command Content Studio</h4>
                 <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5 leading-relaxed">Prompt our advanced multimodal models to write catchy titles, tags, or generate video cues.</p>
               </div>
             </div>
              <div className="flex gap-4">
               <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 border border-slate-200/45 dark:border-slate-800/40"><Send size={14} /></div>
               <div>
                 <h4 className="text-xs font-bold text-slate-850 dark:text-white uppercase tracking-tight">3. Execute & Publish</h4>
                 <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5 leading-relaxed">Deploy options immediately into PDF brochures, copy copy drafts to clipboards, or schedule feeds.</p>
               </div>
             </div>
           </div>
        </div>
      </div>
      
      <div className="mt-8 bg-blue-50/40 dark:bg-blue-950/10 rounded-3xl p-8 text-center border border-blue-550/5 dark:border-blue-905 dark:border-blue-900/15">
        <h3 className="text-sm font-extrabold text-blue-900 dark:text-blue-450 mb-1 leading-snug">Need intermediate consulting help?</h3>
        <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold leading-relaxed mb-6 max-w-2xl mx-auto">
          Our advanced language assistant is always online to help write prompts, brainstorm coupon ideas, or debug location map widget results.
        </p>
        <button 
          onClick={() => setIsChatOpen(true)}
          className="bg-blue-650 hover:bg-blue-700 text-white text-[10px] font-bold uppercase tracking-wider px-6 py-3 rounded-xl transition duration-300 active:scale-95 shadow-sm shadow-blue-500/10"
        >
          Open Assistant Chatbox
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
