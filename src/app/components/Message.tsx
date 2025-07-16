"use client";

import type React from "react";
import { useState, useRef, useEffect, memo, useCallback, useMemo } from "react";
import { Send, ExternalLink, ImageOff, Copy, Check } from "lucide-react";
import { Header } from "./Header";
import debounce from "lodash.debounce";

type Message = {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawData?: any;
};

type ParsedContent = {
  type: "text" | "youtube" | "image" | "link";
  content: string;
  videoId?: string;
  alt?: string;
  url?: string;
  linkText?: string;
};

// YouTube rendering component
const StableYouTubeEmbed = memo(
  function StableYouTubeEmbed({
    videoId,
    title,
  }: {
    videoId: string;
    title?: string;
  }) {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    return (
      <div className="video-embed my-6">
        <div className="aspect-w-16 aspect-h-9">
          <iframe
            ref={iframeRef}
            src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1`}
            className="w-full h-[400px] rounded-lg"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            title={title || `YouTube video ${videoId}`}
            frameBorder="0"
            loading="lazy"
          />
        </div>
        {title && (
          <p className="text-center text-sm mt-2 text-gray-600">{title}</p>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.videoId === nextProps.videoId &&
      prevProps.title === nextProps.title
    );
  }
);

// Image component with better error handling
const StableImageEmbed = memo(
  function StableImageEmbed({
    src,
    alt,
    onImageClick,
  }: {
    src: string;
    alt?: string;
    onImageClick: (src: string) => void;
  }) {
    const handleClick = useCallback(() => {
      onImageClick(src);
    }, [src, onImageClick]);

    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const maxRetries = 2;

    // Check if the URL looks like a valid image
    const isValidImageUrl = useMemo(() => {
      if (!src || src.trim() === "" || src === "N/A") return false;

      // Check for common image extensions
      const imageExtensions =
        /\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff|avif)(\?.*)?$/i;
      if (imageExtensions.test(src)) return true;

      // Check for data URLs
      if (src.startsWith("data:image/")) return true;

      // Check for blob URLs
      if (src.startsWith("blob:")) return true;

      // For URLs without extensions, try to load them anyway if they're HTTP/HTTPS
      return src.startsWith("http://") || src.startsWith("https://");
    }, [src]);

    useEffect(() => {
      if (!isValidImageUrl) {
        setHasError(true);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setHasError(false);
    }, [src, isValidImageUrl]);

    // Don't render anything if the URL is invalid
    if (!isValidImageUrl) {
      return (
        <div className="flex items-center justify-center py-4 text-gray-500 bg-gray-50 rounded-lg">
          <ImageOff className="h-5 w-5 mr-2" />
          <span className="text-sm">No image available</span>
        </div>
      );
    }

    return (
      <div className="image-container my-4">
        {isLoading && !hasError && (
          <div className="flex items-center justify-center py-8 text-gray-500 bg-gray-50 rounded-lg">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400 mr-2"></div>
            <span className="text-sm">Loading image...</span>
          </div>
        )}

        {hasError && (
          <div className="flex items-center justify-center py-8 text-red-500 bg-red-50 rounded-lg border border-red-200">
            <ImageOff className="h-5 w-5 mr-2" />
            <span className="text-sm">Failed to load image</span>
          </div>
        )}

        <img
          src={src || "/placeholder.svg"}
          alt={alt || ""}
          crossOrigin="anonymous"
          className={`max-w-full h-auto rounded-lg mx-auto transition-all duration-300 hover:shadow-lg cursor-pointer ${
            hasError || isLoading ? "hidden" : ""
          }`}
          onClick={handleClick}
          onLoad={() => {
            setIsLoading(false);
            setHasError(false);
          }}
          onError={(e) => {
            if (retryCount < maxRetries) {
              setRetryCount((prev) => prev + 1);
              setTimeout(() => {
                const img = e.target as HTMLImageElement;
                img.src =
                  src +
                  (src.includes("?") ? "&" : "?") +
                  "retry=" +
                  (retryCount + 1);
              }, 1000);
            } else {
              setIsLoading(false);
              setHasError(true);
            }
          }}
        />
      </div>
    );
  },
  (prevProps, nextProps) => {
    return prevProps.src === nextProps.src && prevProps.alt === nextProps.alt;
  }
);

// Link component with copy functionality
const StableLinkEmbed = memo(
  function StableLinkEmbed({
    url,
    linkText,
  }: {
    url: string;
    linkText: string;
  }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(
      async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch (err) {
          console.error("Failed to copy URL:", err);
        }
      },
      [url]
    );

    return (
      <div className="inline-flex items-center gap-2 my-1">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 underline underline-offset-2 transition-colors font-medium"
        >
          {linkText}
          <ExternalLink className="h-3 w-3 flex-shrink-0" />
        </a>
        <button
          onClick={handleCopy}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          title="Copy URL"
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </button>
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.url === nextProps.url &&
      prevProps.linkText === nextProps.linkText
    );
  }
);

// Fixed content parser with proper markdown link handling
const parseMessageContent = (content: string): ParsedContent[] => {
  const parts: ParsedContent[] = [];
  const lines = content.split("\n");
  let currentTextBlock = "";

  for (const line of lines) {
    // Check if this line contains an Image URL (but not N/A)
    const imageUrlMatch = line.match(/^Image URL: (.+)$/i);

    if (imageUrlMatch && imageUrlMatch[1].trim() !== "N/A") {
      // If we have accumulated text, add it as a text part first
      if (currentTextBlock.trim()) {
        const processedText = processTextWithLinks(currentTextBlock);
        if (processedText.length > 0) {
          parts.push(...processedText);
        }
        currentTextBlock = "";
      }

      // Extract URL from markdown-style link if present
      const imageContent = imageUrlMatch[1].trim();
      const markdownLinkMatch = imageContent.match(/\[([^\]]+)\]$$([^)]+)$$/);

      if (markdownLinkMatch) {
        // If it's in markdown format [text](url)
        parts.push({
          type: "image",
          content: markdownLinkMatch[2],
          alt: markdownLinkMatch[1],
        });
      } else {
        // If it's just a plain URL
        parts.push({
          type: "image",
          content: imageContent,
          alt: "Installation guide image",
        });
      }
    } else if (imageUrlMatch && imageUrlMatch[1].trim() === "N/A") {
      // Skip this line entirely - don't add it to text or as an image
      continue;
    } else {
      // Check if this line contains a Video URL (but not N/A)
      const videoUrlMatch = line.match(/^Video URL: (.+)$/i);

      if (videoUrlMatch && videoUrlMatch[1].trim() !== "N/A") {
        // If we have accumulated text, add it as a text part first
        if (currentTextBlock.trim()) {
          const processedText = processTextWithLinks(currentTextBlock);
          if (processedText.length > 0) {
            parts.push(...processedText);
          }
          currentTextBlock = "";
        }

        // Check if it's a YouTube URL
        const youtubeMatch = videoUrlMatch[1].match(
          /https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
        );

        if (youtubeMatch) {
          parts.push({
            type: "youtube",
            content: videoUrlMatch[1],
            videoId: youtubeMatch[1],
          });
        } else {
          // If it's not a YouTube URL, treat it as a regular link
          parts.push({
            type: "link",
            content: videoUrlMatch[1],
            url: videoUrlMatch[1],
            linkText:
              videoUrlMatch[1].length > 50
                ? videoUrlMatch[1].substring(0, 47) + "..."
                : videoUrlMatch[1],
          });
        }
      } else if (videoUrlMatch && videoUrlMatch[1].trim() === "N/A") {
        // Skip this line entirely - don't add it to text or as a video
        continue;
      } else {
        // Regular text line
        currentTextBlock += line + "\n";
      }
    }
  }

  // Add any remaining text
  if (currentTextBlock.trim()) {
    const processedText = processTextWithLinks(currentTextBlock);
    if (processedText.length > 0) {
      parts.push(...processedText);
    }
  }

  return parts.filter((part) => part.content.trim() !== "");
};

// Fixed helper function to process text with markdown-style links and regular URLs
const processTextWithLinks = (text: string): ParsedContent[] => {
  const parts: ParsedContent[] = [];

  // Fixed regex pattern for markdown-style links [text](url)
  const markdownLinkRegex = /\[([^\]]*)\]$$([^)]+)$$/g;
  let match;
  let lastIndex = 0;

  while ((match = markdownLinkRegex.exec(text)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      const beforeText = text.substring(lastIndex, match.index);
      if (beforeText.trim()) {
        parts.push(...processPlainTextWithUrls(beforeText));
      }
    }

    // Add the markdown link
    const linkText = match[1];
    const url = match[2];

    // Check if it's a YouTube URL
    const youtubeMatch = url.match(
      /https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );

    if (youtubeMatch) {
      parts.push({
        type: "youtube",
        content: url,
        videoId: youtubeMatch[1],
      });
    }
    // Check if it's an image URL (by extension or if it contains common image indicators)
    else if (
      url.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i) ||
      url.includes("/images/") ||
      url.includes("image")
    ) {
      parts.push({
        type: "image",
        content: url,
        alt: linkText || "Image from chat",
      });
    }
    // Regular link
    else {
      parts.push({
        type: "link",
        content: url,
        url: url,
        linkText: linkText,
      });
    }

    lastIndex = markdownLinkRegex.lastIndex;
  }

  // Add remaining text after the last link
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex);
    if (remainingText.trim()) {
      parts.push(...processPlainTextWithUrls(remainingText));
    }
  }

  // If no markdown links were found, process as plain text with URLs
  if (parts.length === 0) {
    parts.push(...processPlainTextWithUrls(text));
  }

  return parts;
};

// Helper function to process plain text with standalone URLs
const processPlainTextWithUrls = (text: string): ParsedContent[] => {
  const parts: ParsedContent[] = [];
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const textParts = text.split(urlRegex);

  textParts.forEach((part, index) => {
    if (index % 2 === 0) {
      // Text part
      if (part.trim()) {
        const processedText = part
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*(.*?)\*/g, "<em>$1</em>")
          .replace(/\n/g, "<br/>");

        parts.push({
          type: "text",
          content: processedText.trim(),
        });
      }
    } else {
      // URL part
      const url = part.trim();

      // Check if it's a YouTube URL
      const youtubeMatch = url.match(
        /https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
      );

      if (youtubeMatch) {
        parts.push({
          type: "youtube",
          content: url,
          videoId: youtubeMatch[1],
        });
      }
      // Check if it's an image URL
      else if (url.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i)) {
        parts.push({
          type: "image",
          content: url,
          alt: "Image from chat",
        });
      }
      // Regular link
      else {
        const linkText = url.length > 50 ? url.substring(0, 47) + "..." : url;
        parts.push({
          type: "link",
          content: url,
          url: url,
          linkText: linkText,
        });
      }
    }
  });

  return parts;
};

// Message renderer
const StableMessageRenderer = memo(
  function StableMessageRenderer({
    parsedContent,
    onImageClick,
  }: {
    parsedContent: ParsedContent[];
    onImageClick: (src: string) => void;
  }) {
    return (
      <div className="space-y-3">
        {parsedContent.map((part, index) => {
          switch (part.type) {
            case "youtube":
              return part.videoId ? (
                <StableYouTubeEmbed
                  key={`youtube-${part.videoId}-${index}`}
                  videoId={part.videoId}
                />
              ) : null;

            case "image":
              return (
                <StableImageEmbed
                  key={`image-${index}`}
                  src={part.content}
                  alt={part.alt}
                  onImageClick={onImageClick}
                />
              );

            case "link":
              return part.url ? (
                <div key={`link-${index}`} className="my-2">
                  <StableLinkEmbed
                    url={part.url}
                    linkText={part.linkText || part.url}
                  />
                </div>
              ) : null;

            case "text":
            default:
              return part.content ? (
                <div
                  key={`text-${index}`}
                  className="whitespace-pre-wrap leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: part.content }}
                />
              ) : null;
          }
        })}
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      JSON.stringify(prevProps.parsedContent) ===
      JSON.stringify(nextProps.parsedContent)
    );
  }
);

// Main message component
const OptimizedChatMessage = memo(function OptimizedChatMessage({
  message,
  onImageClick,
}: {
  message: Message;
  onImageClick: (src: string) => void;
}) {
  const parsedContent = useMemo(() => {
    return parseMessageContent(message.content);
  }, [message.content]);

  return (
    <div
      className={`flex ${
        message.isUser ? "justify-end" : "justify-start"
      } mb-4`}
    >
      <div className="flex flex-col max-w-3xl items-start space-y-1">
        {!message.isUser && (
          <span className="text-[12px] uppercase font-bold text-gray-400 tracking-widest px-1">
            Khizar
          </span>
        )}

        <div
          className={`rounded-2xl px-4 py-3 shadow-sm ${
            message.isUser
              ? "bg-gradient-to-r from-[#564673] to-[#6b5b95] text-white self-end"
              : "bg-white text-gray-800 border border-gray-100"
          }`}
        >
          <StableMessageRenderer
            parsedContent={parsedContent}
            onImageClick={onImageClick}
          />
          <div
            className={`text-xs mt-2 ${
              message.isUser ? "text-white/70" : "text-gray-500"
            }`}
          >
            {message.timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>
    </div>
  );
});

const OptimizedChatPage = () => {
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sessionId, setSessionId] = useState("");

  // Stable image click handler
  const handleImageClick = useCallback((src: string) => {
    setFullscreenImage(src);
  }, []);

  // Stable input change handler
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInputMessage(e.target.value);
      // Auto-resize textarea
      e.target.style.height = "auto";
      e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
    },
    []
  );

  // Auto-scroll effect
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Debounced send message function
  const sendMessage = useCallback(
    debounce(async () => {
      const currentMessage = inputMessage.trim();
      if (!currentMessage || isLoading) return;

      const userMessage = {
        id: `user-${Date.now()}`,
        content: currentMessage,
        isUser: true,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputMessage("");
      setIsLoading(true);

      // Reset textarea height
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }

      try {
        const res = await fetch(process.env.NEXT_PUBLIC_BASE_URL + "/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: currentMessage,
            session_id: sessionId,
          }),
        });

        if (!res.ok)
          throw new Error(`API responded with status: ${res.status}`);

        const data = await res.json();
        setSessionId(data?.data?.session_id || "");

        const assistantMessage = {
          id: `assistant-${Date.now()}`,
          content: data.data?.message || "I couldn't process that request.",
          isUser: false,
          timestamp: new Date(),
          rawData: data.data,
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        console.error("API Error:", error);
        const errorMessage = {
          id: `error-${Date.now()}`,
          content: "Sorry, there was an error processing your request.",
          isUser: false,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [inputMessage, isLoading, sessionId]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto p-4 pb-32 overflow-y-auto">
        <div className="max-w-xl mx-auto">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-2">👋</div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">
                Welcome! I’m Khizar. Ask me anything
              </h2>
              <p className="text-gray-500">
                Start a conversation by typing a message below.
              </p>
            </div>
          )}

          <div className="space-y-1">
            {messages.map((message) => (
              <OptimizedChatMessage
                key={message.id}
                message={message}
                onImageClick={handleImageClick}
              />
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-xs rounded-lg px-4 py-3 bg-white text-gray-800 border border-gray-200">
                  <div className="flex space-x-2 mt-2">
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
                    <div
                      className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                    <div
                      className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                      style={{ animationDelay: "0.4s" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-transparent px-4 pb-4 flex justify-center">
        <div className="w-full max-w-xl">
          <div className="bg-white rounded-xl shadow-lg p-1 border border-gray-200">
            <div className="flex items-end">
              <textarea
                ref={inputRef}
                placeholder="Type your message..."
                value={inputMessage}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                className="bg-transparent border-none outline-none w-full text-sm resize-none max-h-32 p-3"
                disabled={isLoading}
                rows={1}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !inputMessage.trim()}
                className={`p-3 rounded-lg transition-all duration-200 ${
                  isLoading || !inputMessage.trim()
                    ? "text-gray-400 bg-gray-100"
                    : "text-white bg-gradient-to-r from-[#564673] to-[#6b5b95] hover:shadow-lg hover:scale-105 active:scale-95"
                }`}
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {fullscreenImage && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setFullscreenImage(null)}
        >
          <div className="relative max-w-[95%] max-h-[95%]">
            <img
              src={fullscreenImage || "/placeholder.svg"}
              alt="Fullscreen"
              className="max-w-full max-h-full rounded-lg shadow-2xl"
            />
            <button
              onClick={() => setFullscreenImage(null)}
              className="absolute top-4 right-4 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OptimizedChatPage;
