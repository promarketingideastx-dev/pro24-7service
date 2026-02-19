'use client';

import { useState, useEffect } from 'react';
import { X, Image as ImageIcon } from 'lucide-react';
import { PortfolioService, PortfolioItem } from '@/services/businessProfile.service';

interface GalleryTabProps {
    businessId?: string; // Optional to avoid breaking if not passed immediately
    images: string[]; // Legacy / Initial images
}

export default function GalleryTab({ businessId, images: initialImages }: GalleryTabProps) {
    const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);

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

    if (loading) return <div className="p-12 text-center text-slate-500">Cargando galería...</div>;

    if (portfolio.length === 0) {
        return (
            <div className="p-12 flex flex-col items-center justify-center text-slate-500">
                <ImageIcon className="w-12 h-12 mb-4 opacity-20" />
                <p>No hay fotos en la galería por el momento.</p>
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
                        className="aspect-square relative cursor-pointer overflow-hidden group bg-slate-800"
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
                    className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setSelectedItem(null)}
                >
                    <button
                        onClick={() => setSelectedItem(null)}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <div className="max-w-4xl w-full max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                        <img
                            src={selectedItem.url}
                            className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                            alt="Full View"
                        />

                        {/* Caption Area (New) */}
                        {(selectedItem.description || selectedItem.title) && (
                            <div className="mt-4 p-4 bg-white/10 backdrop-blur-md rounded-xl text-center max-w-lg w-full border border-white/10">
                                {selectedItem.title && <h4 className="text-white font-bold text-lg mb-1">{selectedItem.title}</h4>}
                                {selectedItem.description && <p className="text-slate-300 text-sm whitespace-pre-wrap">{selectedItem.description}</p>}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
