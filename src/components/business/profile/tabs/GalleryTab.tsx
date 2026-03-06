'use client';

import { useState, useEffect } from 'react';
import { X, Image as ImageIcon } from 'lucide-react';
import { PortfolioService, PortfolioItem } from '@/services/businessProfile.service';
import { useTranslations } from 'next-intl';

interface GalleryTabProps {
    businessId?: string; // Optional to avoid breaking if not passed immediately
    images: string[]; // Legacy / Initial images
}

export default function GalleryTab({ businessId, images: initialImages }: GalleryTabProps) {
    const t = useTranslations('business.publicProfile');
    const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
    const [touchStartY, setTouchStartY] = useState(0);

    useEffect(() => {
        const fetchPortfolio = async () => {
            if (!businessId) {
                // Fallback: Use initial images as portfolio items
                const mockItems = initialImages.map(url => ({ url, id: url }));
                setPortfolio(mockItems);
                setLoading(false);
                return;
            }

            try {
                const items = await PortfolioService.getPortfolio(businessId);

                if (items.length > 0) {
                    setPortfolio(items);
                } else {
                    // Fallback to legacy array if no portfolio posts
                    setPortfolio(initialImages.map(url => ({ url, id: url })));
                }
            } catch (err) {
                console.error("Failed to load portfolio", err);
                setPortfolio(initialImages.map(url => ({ url, id: url })));
            } finally {
                setLoading(false);
            }
        };

        fetchPortfolio();
    }, [businessId, initialImages]);

    if (loading) return <div className="p-12 text-center text-slate-500">{t('galleryLoading')}</div>;

    if (portfolio.length === 0) {
        return (
            <div className="p-12 flex flex-col items-center justify-center text-slate-500">
                <ImageIcon className="w-12 h-12 mb-4 opacity-20" />
                <p>{t('galleryEmpty')}</p>
            </div>
        );
    }

    return (
        <>
            <div className="p-1 grid grid-cols-3 md:grid-cols-4 gap-1 animate-in fade-in duration-500">
                {portfolio.map((item, idx) => (
                    <div
                        key={item.id || idx}
                        onClick={() => setSelectedItem(item)}
                        className="aspect-square relative cursor-pointer overflow-hidden group bg-slate-100"
                    >
                        <img
                            src={item.url}
                            alt={item.title || `Gallery ${idx}`}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors"></div>
                    </div>
                ))}
            </div>

            {/* Lightbox Modal */}
            {selectedItem && (
                <div
                    className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setSelectedItem(null)}
                >
                    <button
                        onClick={(e) => { e.stopPropagation(); setSelectedItem(null); }}
                        className="absolute right-4 p-2.5 rounded-full bg-white text-slate-900 shadow-xl hover:bg-slate-100 transition-transform active:scale-90 z-[10000]"
                        style={{ top: 'calc(max(env(safe-area-inset-top), 20px) + 16px)' }}
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <div
                        className="max-w-4xl w-full flex flex-col items-center mt-10 md:mt-0"
                        onClick={(e) => e.stopPropagation()}
                        onTouchStart={(e) => setTouchStartY(e.touches[0].clientY)}
                        onTouchEnd={(e) => {
                            const touchEndY = e.changedTouches[0].clientY;
                            if (touchEndY - touchStartY > 80) setSelectedItem(null);
                        }}
                    >
                        <img
                            src={selectedItem.url}
                            className="max-w-full max-h-[70vh] md:max-h-[85vh] object-contain rounded-lg shadow-2xl transition-transform"
                            alt="Full View"
                            draggable="false"
                        />

                        {/* Caption Area (New) */}
                        {(selectedItem.description || selectedItem.title) && (
                            <div className="mt-6 p-5 bg-white backdrop-blur-md rounded-2xl text-center max-w-lg w-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100">
                                {selectedItem.title && <h4 className="text-slate-900 font-bold text-lg mb-1">{selectedItem.title}</h4>}
                                {selectedItem.description && <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{selectedItem.description}</p>}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
