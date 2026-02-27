'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';

interface Slide {
    image: string;
    category: string;
    title: string;
    subtitle: string;
    ctaLabel: string;
    categoryId: string;
    color: string; // gradient accent
}

interface Props {
    slides: Slide[];
    onCategoryClick?: (categoryId: string) => void;
    autoplayMs?: number;
}

export default function HeroCarousel({ slides, onCategoryClick, autoplayMs = 4000 }: Props) {
    const [current, setCurrent] = useState(0);
    const [paused, setPaused] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Touch swipe support
    const touchStartX = useRef<number | null>(null);

    const goTo = useCallback((idx: number) => {
        setCurrent((idx + slides.length) % slides.length);
    }, [slides.length]);

    const next = useCallback(() => goTo(current + 1), [current, goTo]);

    // Autoplay
    useEffect(() => {
        if (paused) return;
        timerRef.current = setTimeout(next, autoplayMs);
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [current, paused, next, autoplayMs]);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(dx) > 40) dx < 0 ? goTo(current + 1) : goTo(current - 1);
        touchStartX.current = null;
    };

    const slide = slides[current];

    return (
        <div
            className="relative w-full h-full overflow-hidden rounded-3xl select-none"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {/* Images — stack all, only current visible via opacity */}
            {slides.map((s, i) => (
                <div
                    key={s.categoryId}
                    className="absolute inset-0 transition-opacity duration-700 ease-in-out"
                    style={{ opacity: i === current ? 1 : 0, zIndex: i === current ? 1 : 0 }}
                >
                    <Image
                        src={s.image}
                        alt={s.title}
                        fill
                        className="object-cover object-top"
                        priority={i === 0}
                        sizes="(max-width: 768px) 100vw, 800px"
                    />
                    {/* Gradient overlay — left to right + bottom */}
                    <div
                        className="absolute inset-0"
                        style={{
                            background: `linear-gradient(to right, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.28) 60%, transparent 100%),
                                         linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 50%)`
                        }}
                    />
                </div>
            ))}

            {/* Content overlay */}
            <div className="absolute inset-0 z-10 flex flex-col justify-end pb-4 pl-5 pr-4">
                {/* Category badge */}
                <span
                    className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-1.5 self-start"
                    style={{ background: slide.color, color: '#fff', opacity: 0.92 }}
                >
                    {slide.category}
                </span>

                {/* Title */}
                <h2 className="text-white font-black text-base sm:text-lg leading-tight drop-shadow mb-0.5">
                    {slide.title}
                </h2>
                <p className="text-white/70 text-xs mb-3 leading-tight">
                    {slide.subtitle}
                </p>

                {/* CTA */}
                <button
                    onClick={() => onCategoryClick?.(slide.categoryId)}
                    className="self-start text-xs font-bold text-white bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 px-4 py-1.5 rounded-full transition-all"
                >
                    {slide.ctaLabel} →
                </button>
            </div>

            {/* Dot indicators — bottom-right */}
            <div className="absolute bottom-4 right-4 z-10 flex gap-1.5">
                {slides.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => goTo(i)}
                        className={`rounded-full transition-all duration-300 ${i === current ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'}`}
                    />
                ))}
            </div>
        </div>
    );
}
