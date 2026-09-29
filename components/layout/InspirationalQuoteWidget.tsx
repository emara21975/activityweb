"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { InspirationalQuoteItem } from "@/lib/services/quote-service";
import {
  Quote,
  ChevronRight,
  ChevronLeft,
  Settings,
  Sparkles,
  Pause,
  Play,
} from "lucide-react";

interface InspirationalQuoteWidgetProps {
  quotes: InspirationalQuoteItem[];
  canManage?: boolean;
  onOpenManageModal?: () => void;
  intervalSeconds?: number;
  variant?: "header" | "card";
}

export function InspirationalQuoteWidget({
  quotes = [],
  canManage = false,
  onOpenManageModal,
  intervalSeconds = 8,
  variant = "header",
}: InspirationalQuoteWidgetProps) {
  const activeQuotes = quotes.filter((q) => q.is_active);
  const fallbackQuotes: InspirationalQuoteItem[] = [
    {
      id: "default-1",
      quote_text: "الأنشطة تصنع الفرق في الطلاب وتبني مهارات المستقبل",
      author_title: "مدرسة عبد الله بن علي المسند الثانوية للبنين",
      sub_title: "نظام إدارة الأنشطة والفعاليات",
      image_url: "/back.jpg",
      display_order: 1,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ];

  const displayList = activeQuotes.length > 0 ? activeQuotes : fallbackQuotes;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [fadeState, setFadeState] = useState<"in" | "out">("in");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const goToNext = () => {
    setFadeState("out");
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % displayList.length);
      setFadeState("in");
    }, 250);
  };

  const goToPrev = () => {
    setFadeState("out");
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + displayList.length) % displayList.length);
      setFadeState("in");
    }, 250);
  };

  useEffect(() => {
    if (displayList.length <= 1 || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      goToNext();
    }, intervalSeconds * 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [displayList.length, isPaused, currentIndex, intervalSeconds]);

  const currentQuote = displayList[currentIndex] || displayList[0];

  // If Card Variant (for Settings preview or full vertical card)
  if (variant === "card") {
    return (
      <div
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="relative rounded-2xl overflow-hidden border border-slate-800/80 shadow-xl group select-none transition-all duration-300 bg-slate-950 text-white"
        style={{
          backgroundImage: `url(${currentQuote.image_url || "/back.jpg"})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Dark Qatar-tinted overlay replicating exact aesthetic */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/80 to-slate-900/60 transition-opacity duration-500" />

        {/* Floating subtle admin shortcut button */}
        {canManage && (
          <div className="absolute top-2 left-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
            {onOpenManageModal ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenManageModal();
                }}
                className="w-6 h-6 rounded-lg bg-black/60 hover:bg-black/90 text-amber-300 border border-white/20 flex items-center justify-center text-xs backdrop-blur-xs shadow-xs"
                title="إدارة العبارات التحفيزية والصور"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            ) : (
              <Link
                href="/quotes"
                className="w-6 h-6 rounded-lg bg-black/60 hover:bg-black/90 text-amber-300 border border-white/20 flex items-center justify-center text-xs backdrop-blur-xs shadow-xs"
                title="إدارة العبارات التحفيزية والصور"
              >
                <Settings className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        )}

        {/* Manual Navigation Chevrons on Hover */}
        {displayList.length > 1 && (
          <>
            <button
              onClick={goToPrev}
              aria-label="العبارة السابقة"
              className="absolute right-1 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-black/40 hover:bg-black/80 text-white/80 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={goToNext}
              aria-label="العبارة التالية"
              className="absolute left-1 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-black/40 hover:bg-black/80 text-white/80 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Main Content Area */}
        <div
          className={`relative z-10 p-3.5 sm:p-4 flex flex-col items-center justify-between text-center transition-opacity duration-300 ${
            fadeState === "in" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
          }`}
        >
          {/* Golden Quote Glyph */}
          <div className="text-[#C59B27] mb-1 leading-none select-none font-serif text-2xl font-black opacity-90">
            “
          </div>

          {/* Primary Quote Text - Only Quote */}
          <p className="text-[13px] sm:text-[14px] font-extrabold text-white leading-relaxed px-3 text-balance drop-shadow-sm min-h-[50px] flex items-center justify-center my-2">
            {currentQuote.quote_text}
          </p>

          {/* Dot Indicators */}
          {displayList.length > 1 && (
            <div className="flex items-center gap-1.5 mt-2.5 pt-0.5">
              {displayList.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setFadeState("out");
                    setTimeout(() => {
                      setCurrentIndex(idx);
                      setFadeState("in");
                    }, 200);
                  }}
                  className={`transition-all duration-300 rounded-full ${
                    idx === currentIndex
                      ? "w-4 h-1.5 bg-[#C59B27]"
                      : "w-1.5 h-1.5 bg-white/30 hover:bg-white/60"
                  }`}
                  aria-label={`انتقال للعبارة ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Header Variant - Positioned at Far Top-Left of the Page
  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative h-[68px] sm:h-[72px] w-full max-w-[340px] sm:max-w-[390px] lg:max-w-[430px] rounded-xl overflow-hidden border border-slate-700/70 shadow-sm group select-none transition-all duration-300 bg-slate-950 text-white shrink-0"
      style={{
        backgroundImage: `url(${currentQuote.image_url || "/back.jpg"})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Dark Qatar-tinted overlay */}
      <div className="absolute inset-0 bg-gradient-to-l from-slate-950/95 via-slate-950/85 to-slate-900/65" />

      {/* Admin Quick Action Button on Hover */}
      {canManage && (
        <div className="absolute top-1.5 left-1.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
          {onOpenManageModal ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenManageModal();
              }}
              className="w-5 h-5 rounded-md bg-black/70 hover:bg-black/90 text-amber-300 border border-white/20 flex items-center justify-center text-[10px] backdrop-blur-xs shadow-xs"
              title="إدارة العبارات التحفيزية والصور"
            >
              <Settings className="w-3 h-3" />
            </button>
          ) : (
            <Link
              href="/quotes"
              className="w-5 h-5 rounded-md bg-black/70 hover:bg-black/90 text-amber-300 border border-white/20 flex items-center justify-center text-[10px] backdrop-blur-xs shadow-xs"
              title="إدارة العبارات التحفيزية والصور"
            >
              <Settings className="w-3 h-3" />
            </Link>
          )}
        </div>
      )}

      {/* Chevrons on Hover */}
      {displayList.length > 1 && (
        <>
          <button
            onClick={goToPrev}
            aria-label="العبارة السابقة"
            className="absolute right-0.5 top-1/2 -translate-y-1/2 z-20 w-5 h-5 rounded-full bg-black/50 hover:bg-black/80 text-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={goToNext}
            aria-label="العبارة التالية"
            className="absolute left-0.5 top-1/2 -translate-y-1/2 z-20 w-5 h-5 rounded-full bg-black/50 hover:bg-black/80 text-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </>
      )}

      {/* Header Content Flex Layout */}
      <div
        className={`relative z-10 h-full px-3 py-1.5 flex items-center gap-2.5 transition-opacity duration-300 ${
          fadeState === "in" ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Golden Quote Glyph Badge */}
        <div className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-400/30 text-[#C59B27] font-serif text-lg font-black select-none">
          “
        </div>

        {/* Text Container - Only the Quote */}
        <div className="flex-1 min-w-0 flex items-center justify-start text-right pr-1">
          <p className="text-[12px] sm:text-[12.5px] font-extrabold text-white leading-snug line-clamp-2 drop-shadow-xs">
            {currentQuote.quote_text}
          </p>
        </div>

        {/* Slide Indicator Dots (Compact Vertical/Horizontal at left) */}
        {displayList.length > 1 && (
          <div className="shrink-0 flex flex-col items-center gap-1 pl-0.5">
            {displayList.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setFadeState("out");
                  setTimeout(() => {
                    setCurrentIndex(idx);
                    setFadeState("in");
                  }, 200);
                }}
                className={`transition-all duration-300 rounded-full ${
                  idx === currentIndex
                    ? "h-3 w-1 bg-[#C59B27]"
                    : "h-1 w-1 bg-white/40 hover:bg-white/70"
                }`}
                aria-label={`انتقال للعبارة ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
