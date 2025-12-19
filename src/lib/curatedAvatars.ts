// Curated avatars for training video generation
// These are pre-selected HeyGen avatars that work well for professional training content

export interface CuratedAvatar {
  avatar_id: string;
  name: string;
  gender: 'male' | 'female';
  preview_image_url: string;
  useNativeBackground: boolean; // If true, don't overlay a background
  description?: string;
}

export const CURATED_AVATARS: CuratedAvatar[] = [
  {
    avatar_id: '3753eb6917c14bb1b7f6cf94ede992fb',
    name: 'Professional Desk',
    gender: 'female',
    preview_image_url: 'https://files.heygen.ai/avatar/v3/3753eb6917c14bb1b7f6cf94ede992fb/preview.webp',
    useNativeBackground: true, // Has built-in professional desk background
    description: 'Professional setting with desk background',
  },
];

// Helper to get avatar by ID
export const getAvatarById = (avatarId: string): CuratedAvatar | undefined => {
  return CURATED_AVATARS.find(a => a.avatar_id === avatarId);
};
