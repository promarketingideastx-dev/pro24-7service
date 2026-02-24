/**
 * Comprime una imagen en el navegador usando Canvas.
 * - Redimensiona a máximo 1280×960 px
 * - JPEG calidad 0.82
 * - Si el resultado supera maxSizeKB, baja calidad iterativamente hasta 0.50
 */
export async function comprimirImagen(
    file: File,
    maxWidth = 1280,
    maxHeight = 960,
    targetSizeKB = 500,
): Promise<File> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);

            // Calcular dimensiones respetando proporción
            let { width, height } = img;
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) { reject(new Error('Canvas no disponible')); return; }
            ctx.drawImage(img, 0, 0, width, height);

            // Intentar comprimir bajando calidad si es necesario
            const tryCompress = (quality: number) => {
                canvas.toBlob(blob => {
                    if (!blob) { reject(new Error('Error al comprimir imagen')); return; }
                    const sizeKB = blob.size / 1024;
                    if (sizeKB <= targetSizeKB || quality <= 0.50) {
                        // Listo — convertir a File
                        const compressed = new File(
                            [blob],
                            file.name.replace(/\.[^.]+$/, '.jpg'),
                            { type: 'image/jpeg', lastModified: Date.now() },
                        );
                        resolve(compressed);
                    } else {
                        // Reducir calidad 10% y reintentar
                        tryCompress(Math.max(0.50, quality - 0.10));
                    }
                }, 'image/jpeg', quality);
            };

            tryCompress(0.82);
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo cargar la imagen')); };
        img.src = url;
    });
}
