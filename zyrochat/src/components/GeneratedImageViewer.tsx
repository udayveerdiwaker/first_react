import { useState, useEffect } from "react";
import {
  Download,
  RotateCcw,
  Edit3,
  Copy,
  Check,
  ExternalLink,
  Maximize2,
  X,
  Square,
  Share2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ImageGenerationInfo } from "../agent/types";

interface GeneratedImageViewerProps {
  imageGeneration: ImageGenerationInfo;
  imageGenerations?: ImageGenerationInfo[];
  onRegenerate?: (prompt: string, aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3") => void;
  onEditPrompt?: (prompt: string) => void;
  onCancel?: () => void;
}

// Clean outline image/photo icon representing picture/photo with floating dual sparkles
function PictureOutlineIcon({ className = "w-16 h-16" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 68 68"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="purpleIconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D8B4FE" />
          <stop offset="50%" stopColor="#C084FC" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
      </defs>

      {/* Picture Frame with rounded corners */}
      <rect
        x="9"
        y="11"
        width="44"
        height="44"
        rx="12"
        stroke="url(#purpleIconGrad)"
        strokeWidth="3.2"
      />

      {/* Sun/Moon Circle */}
      <circle
        cx="21"
        cy="23"
        r="3.5"
        stroke="url(#purpleIconGrad)"
        strokeWidth="3.2"
      />

      {/* Smooth Mountain Peaks matching reference */}
      <path
        d="M15 44 L25 34 C25.6 33.4 26.4 33.4 27 34 L31.5 38.5 C32.1 39.1 32.9 39.1 33.5 38.5 L40.5 29.5 C41.1 28.8 42 28.8 42.6 29.5 L50 39"
        stroke="url(#purpleIconGrad)"
        strokeWidth="3.2"
      />

      {/* Floating Sparkle 1 (Large 4-point star on top right) */}
      <path
        d="M54 3.5 C54.3 6.8 56.2 8.7 59.5 9 C56.2 9.3 54.3 11.2 54 14.5 C53.7 11.2 51.8 9.3 48.5 9 C51.8 8.7 53.7 6.8 54 3.5 Z"
        fill="url(#purpleIconGrad)"
        stroke="none"
      />

      {/* Floating Sparkle 2 (Small 4-point star below sparkle 1) */}
      <path
        d="M60 13.5 C60.2 15.6 61.4 16.8 63.5 17 C61.4 17.2 60.2 18.4 60 20.5 C59.8 18.4 58.6 17.2 56.5 17 C58.6 16.8 59.8 15.6 60 13.5 Z"
        fill="url(#purpleIconGrad)"
        stroke="none"
      />
    </svg>
  );
}

export default function GeneratedImageViewer({
  imageGeneration,
  imageGenerations,
  onRegenerate,
  onEditPrompt,
  onCancel,
}: GeneratedImageViewerProps) {
  const [copied, setCopied] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [selectedLightboxImage, setSelectedLightboxImage] = useState<string | null>(null);

  const backendUrl = (
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_BACKEND_URL) ||
    "http://localhost:5000"
  ).replace(/\/$/, "");

  const fullImageUrl = imageGeneration.imageUrl?.startsWith("http")
    ? imageGeneration.imageUrl
    : `${backendUrl}${imageGeneration.imageUrl}`;

  const downloadUrl = `${backendUrl}/api/images/download/${encodeURIComponent(
    imageGeneration.id
  )}`;

  // Multi-image list resolution
  const allImages: string[] = (() => {
    if (imageGenerations && imageGenerations.length > 0) {
      return imageGenerations.map((gen: ImageGenerationInfo) =>
        gen.imageUrl?.startsWith("http") ? gen.imageUrl : `${backendUrl}${gen.imageUrl}`
      );
    }
    if (imageGeneration.images && imageGeneration.images.length > 0) {
      return imageGeneration.images.map((url: string) =>
        url.startsWith("http") ? url : `${backendUrl}${url}`
      );
    }
    return fullImageUrl ? [fullImageUrl] : [];
  })();

  const isMultiple = allImages.length > 1;

  // Unified responsive card size & aspect ratio based on aspect ratio
  // Shared identically across loader, failed, and completed states to eliminate layout jumps
  const layout = (() => {
    switch (imageGeneration.aspectRatio) {
      case "16:9":
        return {
          cardMaxW: "w-full max-w-xl md:max-w-2xl lg:max-w-[760px] xl:max-w-[820px]",
          aspectRatio: "aspect-video",
        };
      case "9:16":
        return {
          cardMaxW: "w-full max-w-[320px] sm:max-w-[340px]",
          aspectRatio: "aspect-[9/16]",
        };
      case "4:3":
        return {
          cardMaxW: "w-full max-w-[620px] sm:max-w-[660px] lg:max-w-[700px]",
          aspectRatio: "aspect-[4/3]",
        };
      case "1:1":
      default:
        return {
          cardMaxW: "w-full max-w-[480px] sm:max-w-[520px] lg:max-w-[540px]",
          aspectRatio: "aspect-square",
        };
    }
  })();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullImageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "AI Generated Image - ZyroChat",
          text: imageGeneration.prompt,
          url: fullImageUrl,
        });
        return;
      } catch {
        // User cancelled or share dismissed
      }
    }
    handleCopy();
  };

  // Close lightbox on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxOpen(false);
      }
    };
    if (lightboxOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [lightboxOpen]);

  // 1. Reference-Inspired Premium AI Image Generation Loader
  if (
    imageGeneration.status === "generating" ||
    imageGeneration.status === "pending"
  ) {
    const isPending = imageGeneration.status === "pending";

    return (
      <div className={`w-full ${layout.cardMaxW} mx-auto overflow-hidden rounded-2xl sm:rounded-3xl border border-purple-500/20 bg-gradient-to-b from-[#111625] via-[#0e1320] to-[#0a0e17] dark:bg-[#111C26] transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_16px_36px_rgba(0,0,0,0.45)]`}>
        <div
          className={`relative w-full ${layout.aspectRatio} overflow-hidden rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none`}
        >
          {/* Top-left curved ambient glass arc & soft purple glass glow */}
          <div className="pointer-events-none absolute -top-12 -left-12 w-64 h-64 rounded-br-full bg-gradient-to-br from-purple-500/[0.12] via-purple-500/[0.04] to-transparent blur-sm select-none" />
          <svg
            className="pointer-events-none absolute top-0 left-0 w-64 h-64 opacity-40 select-none"
            viewBox="0 0 200 200"
            fill="none"
          >
            <path
              d="M 0 160 C 60 120, 120 60, 160 0"
              stroke="url(#arcGlowTop)"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="arcGlowTop" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#A855F7" stopOpacity="0.8" />
                <stop offset="60%" stopColor="#818CF8" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>

          {/* Bottom-right curved ambient glass arc & soft purple glass glow */}
          <div className="pointer-events-none absolute -bottom-12 -right-12 w-64 h-64 rounded-tl-full bg-gradient-to-tl from-purple-500/[0.12] via-purple-500/[0.04] to-transparent blur-sm select-none" />
          <svg
            className="pointer-events-none absolute bottom-0 right-0 w-64 h-64 opacity-40 select-none"
            viewBox="0 0 200 200"
            fill="none"
          >
            <path
              d="M 40 200 C 80 140, 140 80, 200 40"
              stroke="url(#arcGlowBottom)"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="arcGlowBottom" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366F1" stopOpacity="0" />
                <stop offset="40%" stopColor="#818CF8" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#A855F7" stopOpacity="0.8" />
              </linearGradient>
            </defs>
          </svg>

          {/* Subtle slow surface shimmer */}
          <div className="pointer-events-none absolute inset-0 -translate-x-full animate-subtle-shimmer bg-gradient-to-r from-transparent via-white/[0.025] dark:via-purple-500/[0.035] to-transparent" />

          {/* Centered Graphic with Concentric Ripple Rings */}
          <div className="relative z-10 flex flex-col items-center justify-center gap-3.5 max-w-sm px-4 select-none">
            {/* Concentric subtle circular ripple waves */}
            <div className="relative flex items-center justify-center">
              <div className="pointer-events-none absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full border border-purple-500/20" />
              <div className="pointer-events-none absolute w-52 h-52 sm:w-64 sm:h-64 rounded-full border border-purple-500/10" />
              <div className="pointer-events-none absolute w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-purple-500/10 blur-xl" />

              {/* Glowing Outline Photo Icon with Dual Sparkles */}
              <div className="relative text-purple-400 dark:text-purple-400 animate-icon-pulse drop-shadow-[0_0_24px_rgba(168,85,247,0.65)]">
                <PictureOutlineIcon className="w-14 h-14 sm:w-18 sm:h-18" />
              </div>
            </div>

            {/* Typography matching reference image */}
            <div className="space-y-1 text-center mt-1">
              <h3
                aria-live="polite"
                className="text-base sm:text-lg md:text-xl tracking-tight text-center select-none leading-snug"
              >
                {isPending ? (
                  <>
                    <span className="font-semibold text-white">Preparing</span>{" "}
                    <span className="font-normal text-slate-300">image...</span>
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-white">Creating</span>{" "}
                    <span className="font-normal text-slate-300">your image...</span>
                  </>
                )}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 font-normal text-center select-none">
                Turning your ideas into something beautiful...
              </p>
            </div>

            {/* Glowing Capsule Indeterminate Progress Bar */}
            <div
              role="progressbar"
              aria-label="Creating your image..."
              aria-busy="true"
              className="w-48 sm:w-64 h-2 sm:h-2.5 rounded-full bg-[#181432]/70 border border-purple-500/20 relative overflow-hidden mt-2 shadow-inner"
            >
              <div className="absolute top-0 bottom-0 bg-gradient-to-r from-transparent via-[#c084fc] to-transparent rounded-full shadow-[0_0_16px_rgba(192,132,252,0.9)] animate-indeterminate-bar" />
            </div>

            {/* Hidden fallback text for search and accessibility */}
            <span className="sr-only">Creating image... Preparing image...</span>
          </div>

          {/* Frosted Glass Stop button positioned discreetly in bottom-right */}
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] hover:bg-white/[0.12] px-2.5 sm:px-3 py-1 text-xs font-medium text-slate-300 hover:text-white transition backdrop-blur-md cursor-pointer z-10 shadow-xs"
              title="Stop generation"
            >
              <Square size={11} className="fill-current text-slate-400" />
              <span>Stop</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // 2. Cancelled State (Matching Reference Aesthetic)
  if (imageGeneration.status === "cancelled") {
    return (
      <div className={`w-full ${layout.cardMaxW} mx-auto overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-700/40 bg-gradient-to-b from-[#111625] via-[#0e1320] to-[#0a0e17] dark:bg-[#111C26] transition-all duration-300 shadow-md`}>
        <div
          className={`relative w-full ${layout.aspectRatio} overflow-hidden rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none`}
        >
          {/* Concentric subtle circular ripple waves */}
          <div className="pointer-events-none absolute flex items-center justify-center">
            <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full border border-slate-700/20" />
            <div className="w-48 h-48 sm:w-52 sm:h-52 rounded-full border border-slate-700/10 absolute" />
          </div>

          <div className="relative z-10 flex flex-col items-center justify-center gap-2.5 max-w-sm px-4">
            <div className="text-slate-400">
              <PictureOutlineIcon className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>

            <div className="space-y-1">
              <h4 className="text-sm sm:text-base font-medium text-slate-200">
                Image Generation Stopped
              </h4>
              <p className="text-xs text-slate-400 italic line-clamp-2">
                &ldquo;{imageGeneration.prompt}&rdquo;
              </p>
            </div>

            {onRegenerate && (
              <button
                type="button"
                onClick={() =>
                  onRegenerate(imageGeneration.prompt, imageGeneration.aspectRatio)
                }
                className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] hover:bg-white/[0.12] px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white transition backdrop-blur-md cursor-pointer"
              >
                <RotateCcw size={12} />
                <span>Retry / Resume</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. Failed State (Matching Reference Aesthetic)
  if (imageGeneration.status === "failed") {
    return (
      <div className={`w-full ${layout.cardMaxW} mx-auto overflow-hidden rounded-2xl sm:rounded-3xl border border-rose-500/25 bg-gradient-to-b from-[#111625] via-[#0e1320] to-[#0a0e17] dark:bg-[#111C26] transition-all duration-300 shadow-md`}>
        <div
          className={`relative w-full ${layout.aspectRatio} overflow-hidden rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none`}
        >
          {/* Concentric subtle circular ripple waves */}
          <div className="pointer-events-none absolute flex items-center justify-center">
            <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full border border-rose-500/20" />
            <div className="w-48 h-48 sm:w-52 sm:h-52 rounded-full border border-rose-500/10 absolute" />
          </div>

          <div className="relative z-10 flex flex-col items-center justify-center gap-2.5 max-w-sm px-4">
            <div className="text-rose-400">
              <PictureOutlineIcon className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>

            <div className="space-y-1">
              <h4 className="text-sm sm:text-base font-medium text-slate-200">
                Image generation failed
              </h4>
              <p className="text-xs text-slate-400 line-clamp-2">
                {imageGeneration.error || "Unable to generate image with the configured provider."}
              </p>
            </div>

            {onRegenerate && (
              <button
                type="button"
                onClick={() =>
                  onRegenerate(imageGeneration.prompt, imageGeneration.aspectRatio)
                }
                className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 px-3.5 py-1.5 text-xs font-medium text-rose-300 hover:text-white transition backdrop-blur-md cursor-pointer"
              >
                <RotateCcw size={12} />
                <span>Retry</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 4. Completed State with Seamless Cross-Fade Reveal & Tight Result Card
  return (
    <div className={`w-full ${isMultiple ? "max-w-3xl" : layout.cardMaxW} mx-auto overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-3 sm:p-3.5 shadow-sm dark:border-slate-800/80 dark:bg-[#111827]/70 backdrop-blur-xs transition-all duration-300`}>
      {/* Multi-image grid vs Single image card */}
      {isMultiple ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full">
          {allImages.map((imgUrl, i) => (
            <div
              key={i}
              className={`group relative w-full ${layout.aspectRatio} overflow-hidden rounded-[18px] sm:rounded-[20px] bg-slate-950 dark:bg-[#0c101b] flex items-center justify-center cursor-pointer select-none`}
              onClick={() => {
                setSelectedLightboxImage(imgUrl);
                setLightboxOpen(true);
              }}
            >
              <img
                src={imgUrl}
                alt={`AI-generated image ${i + 1} based on: ${imageGeneration.prompt}`}
                className="w-full h-full object-contain transition-all duration-300 ease-out group-hover:scale-[1.01]"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <span className="flex items-center gap-1.5 rounded-xl bg-black/75 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-md">
                  <Maximize2 size={12} />
                  Expand
                </span>
              </div>
              <div className="absolute top-2 left-2 flex items-center gap-1">
                <span className="rounded-lg bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white/90 backdrop-blur-md">
                  {i + 1}/{allImages.length}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Single Image Preview Container with Smooth Cross-Fade Reveal */
        <div
          className={`group relative w-full ${layout.aspectRatio} overflow-hidden rounded-[18px] sm:rounded-[20px] bg-slate-950 dark:bg-[#0c101b] flex items-center justify-center cursor-pointer select-none`}
          onClick={() => {
            setSelectedLightboxImage(fullImageUrl);
            setLightboxOpen(true);
          }}
        >
          {/* Placeholder while image decodes in browser */}
          {!imageLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#111625] via-[#0e1320] to-[#0a0e17] text-slate-400">
              <div className="pointer-events-none absolute inset-0 -translate-x-full animate-subtle-shimmer bg-gradient-to-r from-transparent via-white/[0.03] dark:via-purple-500/[0.04] to-transparent" />
              <div className="text-purple-400/80 animate-icon-pulse">
                <PictureOutlineIcon className="w-10 h-10" />
              </div>
            </div>
          )}

          <img
            src={fullImageUrl}
            alt={`AI-generated image based on: ${imageGeneration.prompt}`}
            onLoad={() => setImageLoaded(true)}
            className={`w-full h-full object-contain transition-all duration-500 ease-out ${
              imageLoaded ? "opacity-100 scale-100 blur-0" : "opacity-0 scale-[0.99] blur-[2px]"
            } group-hover:scale-[1.01]`}
            loading="lazy"
            decoding="async"
          />

          {/* Hover overlay hint */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <span className="flex items-center gap-1.5 rounded-xl bg-black/75 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md">
              <Maximize2 size={13} />
              Click to expand
            </span>
          </div>

          {/* Badge: Aspect ratio & Provider */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
            <span className="rounded-lg bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-md">
              {imageGeneration.aspectRatio || "1:1"}
            </span>
            {imageGeneration.provider && (
              <span className="rounded-lg bg-purple-950/80 px-2 py-0.5 text-[10px] font-medium text-purple-300 backdrop-blur-md border border-purple-500/30">
                {imageGeneration.provider}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Prompt Caption & Details - Approx 12-16px spacing */}
      <div className="mt-3 px-0.5 space-y-1">
        <p className="text-xs sm:text-[13px] font-medium text-slate-800 dark:text-slate-200 leading-snug break-words">
          {imageGeneration.prompt}
        </p>
        {imageGeneration.revisedPrompt &&
          imageGeneration.revisedPrompt !== imageGeneration.prompt && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 line-clamp-2 italic">
              Enhanced: {imageGeneration.revisedPrompt}
            </p>
          )}
      </div>

      {/* Action Toolbar */}
      <div className="mt-3 pt-2.5 sm:pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center flex-wrap gap-2">
          {/* Download Button */}
          <a
            href={downloadUrl}
            download
            className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200/90 bg-slate-50/80 px-2.5 sm:px-3 text-xs font-medium text-slate-700 hover:border-purple-500/50 hover:bg-purple-50/60 hover:text-purple-600 dark:border-slate-800 dark:bg-[#161a25] dark:text-slate-300 dark:hover:border-purple-500/40 dark:hover:bg-purple-950/30 dark:hover:text-purple-300 transition cursor-pointer select-none"
            title="Download image"
          >
            <Download size={13} className="shrink-0" />
            <span>Download</span>
          </a>

          {/* Regenerate Button */}
          {onRegenerate && (
            <button
              type="button"
              onClick={() =>
                onRegenerate(imageGeneration.prompt, imageGeneration.aspectRatio)
              }
              className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200/90 bg-slate-50/80 px-2.5 sm:px-3 text-xs font-medium text-slate-700 hover:border-purple-500/50 hover:bg-purple-50/60 hover:text-purple-600 dark:border-slate-800 dark:bg-[#161a25] dark:text-slate-300 dark:hover:border-purple-500/40 dark:hover:bg-purple-950/30 dark:hover:text-purple-300 transition cursor-pointer select-none"
              title="Regenerate with same prompt"
            >
              <RotateCcw size={13} className="shrink-0" />
              <span>Regenerate</span>
            </button>
          )}

          {/* Edit Prompt Button */}
          {onEditPrompt && (
            <button
              type="button"
              onClick={() => onEditPrompt(imageGeneration.prompt)}
              className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200/90 bg-slate-50/80 px-2.5 sm:px-3 text-xs font-medium text-slate-700 hover:border-purple-500/50 hover:bg-purple-50/60 hover:text-purple-600 dark:border-slate-800 dark:bg-[#161a25] dark:text-slate-300 dark:hover:border-purple-500/40 dark:hover:bg-purple-950/30 dark:hover:text-purple-300 transition cursor-pointer select-none"
              title="Copy prompt into composer to edit"
            >
              <Edit3 size={13} className="shrink-0" />
              <span>Edit Prompt</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Copy Link */}
          <button
            type="button"
            onClick={handleCopy}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-transparent text-slate-400 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-700 dark:hover:border-slate-800 dark:hover:bg-[#171b26] dark:hover:text-slate-200 transition cursor-pointer select-none"
            title="Copy image link"
            aria-label="Copy image link"
          >
            {copied ? (
              <Check size={13} className="text-emerald-500" />
            ) : (
              <Copy size={13} />
            )}
          </button>

          {/* Share Button */}
          <button
            type="button"
            onClick={handleShare}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-transparent text-slate-400 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-700 dark:hover:border-slate-800 dark:hover:bg-[#171b26] dark:hover:text-slate-200 transition cursor-pointer select-none"
            title="Share image"
            aria-label="Share image"
          >
            <Share2 size={13} />
          </button>

          {/* Open Raw */}
          <a
            href={fullImageUrl}
            target="_blank"
            rel="noreferrer"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-transparent text-slate-400 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-700 dark:hover:border-slate-800 dark:hover:bg-[#171b26] dark:hover:text-slate-200 transition cursor-pointer select-none"
            title="Open in full screen"
            aria-label="Open in full screen"
          >
            <ExternalLink size={13} />
          </a>
        </div>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-modal-backdrop flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-sm select-none"
            onClick={() => setLightboxOpen(false)}
          >
            <div
              className="relative z-modal max-h-[90vh] max-w-[92vw] sm:max-w-[90vw] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
                className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black transition cursor-pointer"
                aria-label="Close image preview"
              >
                <X size={16} />
              </button>
              <img
                src={selectedLightboxImage || fullImageUrl}
                alt={`AI-generated image based on: ${imageGeneration.prompt}`}
                className="max-h-[78vh] w-auto max-w-full object-contain"
              />
              <div className="w-full p-2.5 sm:p-3 bg-slate-950/95 text-center border-t border-slate-800">
                <p className="text-xs text-slate-300 font-medium line-clamp-2">
                  {imageGeneration.prompt}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
