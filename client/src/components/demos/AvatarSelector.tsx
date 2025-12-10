import { cn } from "@/lib/utils";

export type AvatarOption = {
  id: string;
  name: string;
  imageUrl: string;
  gender: 'female' | 'male';
};

// Default avatar options - can be expanded later
export const AVATAR_OPTIONS: AvatarOption[] = [
  {
    id: 'female-1',
    name: 'Jenna',
    imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
    gender: 'female',
  },
  {
    id: 'male-1',
    name: 'James',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
    gender: 'male',
  },
];

interface AvatarSelectorProps {
  selectedAvatarId: string | null;
  onSelect: (avatar: AvatarOption) => void;
  className?: string;
}

export function AvatarSelector({ selectedAvatarId, onSelect, className }: AvatarSelectorProps) {
  return (
    <div className={cn("flex gap-4", className)}>
      {AVATAR_OPTIONS.map((avatar) => (
        <button
          key={avatar.id}
          type="button"
          onClick={() => onSelect(avatar)}
          className={cn(
            "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
            selectedAvatarId === avatar.id
              ? "border-primary bg-primary/10 ring-2 ring-primary/20"
              : "border-border hover:border-primary/50 hover:bg-muted/50"
          )}
        >
          <div className="relative">
            <img
              src={avatar.imageUrl}
              alt={avatar.name}
              className="w-16 h-16 rounded-full object-cover"
            />
            {selectedAvatarId === avatar.id && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>
          <span className="text-sm font-medium">{avatar.name}</span>
        </button>
      ))}
    </div>
  );
}

export function getAvatarById(id: string | null): AvatarOption | undefined {
  return AVATAR_OPTIONS.find(a => a.id === id);
}

export function getAvatarByUrl(url: string | null): AvatarOption | undefined {
  return AVATAR_OPTIONS.find(a => a.imageUrl === url);
}
