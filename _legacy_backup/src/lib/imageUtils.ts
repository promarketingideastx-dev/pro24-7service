/**
 * Utilidad de compresión agresiva de imágenes para optimización de subida.
 * Reduce el tamaño a <200KB y convierte a WebP/JPEG.
 */

export const compressImage = async (file: File): Promise<Blob> => {
    // Si la imagen es menor a 300KB, no comprimir (ya es ligera)
    if (file.size < 300 * 1024) {
        console.log(`[ImageUtils] Imagen pequeña (${(file.size / 1024).toFixed(1)}KB), omitiendo compresión.`);
        return file;
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1280;
                const MAX_HEIGHT = 1280;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                // Intentar WebP primero (mejor compresión), fallback a JPEG
                const quality = 0.7; // 70% calidad es suficiente para avatares
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            console.log(`[ImageUtils] Compresión: ${file.size} -> ${blob.size} bytes`);
                            resolve(blob);
                        } else {
                            reject(new Error('Falló la compresión de imagen'));
                        }
                    },
                    'image/webp',
                    quality
                );
            };
            img.onerror = (err) => reject(new Error('Error al cargar la imagen para comprimir: ' + err));
        };
        reader.onerror = (err) => reject(new Error('Error al leer el archivo: ' + err));
    });
};
