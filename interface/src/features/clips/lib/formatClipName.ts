/**
 * Format a clip filename for display
 * 
 * - Removes file extension (.mp4, .mov, .webm, etc.)
 * - Replaces underscores with spaces
 * - Trims whitespace
 * 
 * @example
 * formatClipName("my_awesome_clip.mp4") // "my awesome clip"
 * formatClipName("cool_video_2024.mov") // "cool video 2024"
 * formatClipName("test.MP4") // "test"
 */
export function formatClipName(filename: string): string {
    // Remove file extension (case-insensitive)
    const nameWithoutExtension = filename.replace(/\.[^.]+$/, "");
    
    // Replace underscores with spaces
    const formatted = nameWithoutExtension.replace(/_/g, " ");
    
    // Trim any extra whitespace
    return formatted.trim();
}
