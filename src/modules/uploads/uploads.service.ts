import { getUploadUrl, deleteFile, getCDNUrl } from '../../config/s3';
import {
  GetPresignedUrlInput,
  BatchPresignedUrlInput,
  DeleteFileInput,
} from './uploads.schema';

export class UploadsService {
  /**
   * Get a presigned URL for uploading a file
   */
  async getPresignedUrl(userId: string, input: GetPresignedUrlInput) {
    const { filename, content_type, purpose } = input;

    // Determine folder based on purpose
    const folder = this.getFolderForPurpose(purpose, userId);
    
    // Get file extension from content type or filename
    const extension = this.getExtensionFromContentType(content_type) || 
                     filename.split('.').pop() || 
                     'bin';

    const result = await getUploadUrl(folder, content_type, extension);

    return {
      upload_url: result.uploadUrl,
      file_key: result.fileKey,
      cdn_url: result.cdnUrl,
      expires_in: 3600, // 1 hour
    };
  }

  /**
   * Get presigned URLs for batch upload
   */
  async getBatchPresignedUrls(userId: string, input: BatchPresignedUrlInput) {
    const { files, purpose } = input;
    const folder = this.getFolderForPurpose(purpose, userId);

    const results = await Promise.all(
      files.map(async (file) => {
        const extension = this.getExtensionFromContentType(file.content_type) ||
                         file.filename.split('.').pop() ||
                         'bin';

        const result = await getUploadUrl(folder, file.content_type, extension);

        return {
          original_filename: file.filename,
          upload_url: result.uploadUrl,
          file_key: result.fileKey,
          cdn_url: result.cdnUrl,
        };
      })
    );

    return {
      files: results,
      expires_in: 3600,
    };
  }

  /**
   * Delete a file
   */
  async deleteFileByUrl(input: DeleteFileInput) {
    const { file_url } = input;
    
    // Extract key from URL
    const key = this.extractKeyFromUrl(file_url);
    
    if (!key) {
      throw new Error('Invalid file URL');
    }

    await deleteFile(key);

    return { deleted: true };
  }

  /**
   * Delete file by key
   */
  async deleteFileByKey(key: string) {
    await deleteFile(key);
    return { deleted: true };
  }

  /**
   * Get CDN URL from key
   */
  getCdnUrl(key: string): string {
    return getCDNUrl(key);
  }

  // ==================== Private Methods ====================

  private getFolderForPurpose(purpose: string, userId: string): string {
    const folders: Record<string, string> = {
      profile_picture: `users/${userId}/profile`,
      post_media: `posts/${userId}`,
      vendor_stall_photo: `vendors`,
      rating_photo: `ratings/${userId}`,
      menu_item_photo: `menu-items`,
      expedition_cover: `expeditions`,
    };

    return folders[purpose] || 'uploads';
  }

  private getExtensionFromContentType(contentType: string): string | null {
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
      'video/mov': 'mov',
      'video/quicktime': 'mov',
      'video/avi': 'avi',
      'video/webm': 'webm',
    };

    return map[contentType.toLowerCase()] || null;
  }

  private extractKeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      // Remove leading slash
      return urlObj.pathname.substring(1);
    } catch {
      return null;
    }
  }
}

export const uploadsService = new UploadsService();
