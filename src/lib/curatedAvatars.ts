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
    avatar_id: 'Abigail_standing_office_front',
    name: 'Abigail Office Front',
    gender: 'female',
    preview_image_url: 'https://files2.heygen.ai/avatar/v3/463208b6cad140d2b263535826838e3a_39240/preview_target.webp',
    useNativeBackground: true,
    description: 'Professional female presenter in office setting',
  },
];

// Helper to get avatar by ID
export const getAvatarById = (avatarId: string): CuratedAvatar | undefined => {
  return CURATED_AVATARS.find(a => a.avatar_id === avatarId);
};
