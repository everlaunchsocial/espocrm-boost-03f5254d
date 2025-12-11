// Cartesia voice definitions for EverLaunch AI

export interface CartesiaVoice {
  id: string;
  name: string;
  gender: 'female' | 'male';
  customerVisible?: boolean; // If false, only visible to super_admin
  emotive?: boolean; // Recommended for expressive/companion apps
}

// All available Cartesia voices (super admin can see all)
export const CARTESIA_VOICES: CartesiaVoice[] = [
  // Female voices
  { id: '9626c31c-bec5-4cca-baa8-f8ba9e84c8bc', name: 'Jacqueline', gender: 'female', customerVisible: true },
  { id: '91b4cf29-5166-44eb-8054-30d40ecc8081', name: 'Tina', gender: 'female', customerVisible: true },
  { id: 'f6ff7c0c-e396-40a9-a70b-f7607edb6937', name: 'Emma', gender: 'female', customerVisible: false },
  { id: 'a38e4e85-e815-43ab-acf1-907c4688dd6c', name: 'Lindsey', gender: 'female', customerVisible: true },
  { id: '1d3ba41a-96e6-44ad-aabb-9817c56caa68', name: 'Mia', gender: 'female', customerVisible: true },
  { id: '55deba52-bc73-4481-ab69-9c8831c8a7c3', name: 'Camille', gender: 'female', customerVisible: false },
  { id: 'a8136a0c-9642-497a-882d-8d591bdcb2fa', name: 'Diane', gender: 'female', customerVisible: true },
  { id: 'a7a59115-2425-4192-844c-1e98ec7d6877', name: 'Amber', gender: 'female', customerVisible: false },
  { id: '01eaafa9-308a-4276-a017-6ab0cf061b1f', name: 'Clara', gender: 'female', customerVisible: false },
  { id: '8918ddfe-2ad4-4cc8-a573-e020ca13f3f5', name: 'Erin', gender: 'female', customerVisible: false },
  { id: '1242fb95-7ddd-44ac-8a05-9e8a22a6137d', name: 'Cindy', gender: 'female', customerVisible: false },
  { id: '2deb3edf-b9d8-4d06-8ea6-042f5d6b1c29', name: 'Ariana', gender: 'female', customerVisible: true, emotive: true },
  // Male voices
  { id: 'a167e0f3-df7e-4d52-a9c3-f949145efdab', name: 'Blake', gender: 'male', customerVisible: false },
  { id: 'd46abd1d-2d02-43e8-819f-51fb652c1c61', name: 'Grant', gender: 'male', customerVisible: true },
  { id: '4df027cb-2920-4a1f-8c34-f21529d5c3fe', name: 'Carson (Friendly)', gender: 'male', customerVisible: true },
  { id: '3246e36c-ac8c-418d-83cd-4eaad5a3b887', name: 'Carson (Sad)', gender: 'male', customerVisible: false },
  { id: '2a4d065a-ac91-4203-a015-eb3fc3ee3365', name: 'Wes', gender: 'male', customerVisible: true },
  { id: '86e30c1d-714b-4074-a1f2-1cb6b552fb49', name: 'Carson (Curious)', gender: 'male', customerVisible: false },
  { id: '3dcaa773-fb1a-47f7-82a4-1bf756c4e1fb', name: 'Harry', gender: 'male', customerVisible: false },
  { id: '96c64eb5-a945-448f-9710-980abe7a514c', name: 'Carson (Friendly 2)', gender: 'male', customerVisible: true },
  { id: '39b376fc-488e-4d0c-8b37-e00b72059fdd', name: 'Sheldon', gender: 'male', customerVisible: true },
  { id: '66f5935b-af2e-4ec9-bb3e-59112e9ddc93', name: 'Carson (Surprised)', gender: 'male', customerVisible: false },
];

// All voices (for super admin)
export const FEMALE_VOICES = CARTESIA_VOICES.filter(v => v.gender === 'female');
export const MALE_VOICES = CARTESIA_VOICES.filter(v => v.gender === 'male');

// Customer-visible voices only
export const CUSTOMER_FEMALE_VOICES = CARTESIA_VOICES.filter(v => v.gender === 'female' && v.customerVisible);
export const CUSTOMER_MALE_VOICES = CARTESIA_VOICES.filter(v => v.gender === 'male' && v.customerVisible);

export const getVoiceById = (id: string): CartesiaVoice | undefined => 
  CARTESIA_VOICES.find(v => v.id === id);

export const getDefaultVoiceId = (): string => 
  '9626c31c-bec5-4cca-baa8-f8ba9e84c8bc'; // Jacqueline
