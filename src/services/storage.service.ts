import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export const StorageService = {
    /**
     * Uploads a Business Image to Firebase Storage.
     * Path: businesses/{userId}/{timestamp}_{filename}
     */
    async uploadBusinessImage(userId: string, file: File): Promise<string> {
        if (!userId) throw new Error("User ID is required for upload.");

        const timestamp = Date.now();
        // Sanitize filename
        const filename = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const storagePath = `business_images/${userId}/${timestamp}_${filename}`;

        const storageRef = ref(storage, storagePath);

        try {
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            return downloadURL;
        } catch (error: any) {
            console.error("Upload Error:", error);
            if (error.code === 'storage/unauthorized') {
                throw new Error("No tienes permiso para subir imágenes de negocio.");
            }
            throw new Error(`Error al subir imagen: ${error.message}`);
        }
    },

    /**
     * Uploads a User Avatar
     * Path: avatars/{userId}/avatar_{timestamp}
     */
    async uploadUserAvatar(userId: string, file: File): Promise<string> {
        if (!userId) throw new Error("User ID is required.");

        const timestamp = Date.now();
        const extension = file.name.split('.').pop() || 'jpg';
        const storagePath = `avatars/${userId}/avatar_${timestamp}.${extension}`;

        const storageRef = ref(storage, storagePath);

        try {
            const snapshot = await uploadBytes(storageRef, file);
            return await getDownloadURL(snapshot.ref);
        } catch (error: any) {
            console.error("Avatar Upload Error:", error);
            // Improve error message for permissions
            if (error.code === 'storage/unauthorized') {
                throw new Error("No tienes permiso para subir archivos.");
            }
            throw new Error(error.message || "Error al subir foto de perfil.");
        }
    },

    /**
     * Deletes an image from storage using its download URL.
     * Note: Requires the URL to contain the storage path logic or we parse it.
     * For simplicity, if we save the full path in DB we could use that.
     * But usually we only save the URL. 
     * Extracting path from URL is tricky with tokens.
     * 
     * Alternative: We just don't delete for now, or we rely on the path if we stored it.
     * Let's implement a basic try-delete if we can extract the path, 
     * but usually it's better to store { url, path } object if deletion is critical.
     * For MVP, we might skip deletion or just log it.
     */
    async deleteImage(url: string) {
        try {
            const storageRef = ref(storage, url); // This works if it's a gs:// URL or sometimes http
            // Actually ref(storage, url) works with HTTPS URLs from Firebase!
            await deleteObject(storageRef);
            return true;
        } catch (error) {
            console.warn("Delete Error (might not exist or permission):", error);
            return false;
        }
    }
};
