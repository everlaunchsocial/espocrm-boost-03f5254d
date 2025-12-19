import { useMemo, useState } from "react";

type Props = {
  avatarId: string;
  initialUrl?: string | null;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
};

const buildCandidateUrls = (avatarId: string, initialUrl?: string | null) => {
  const patterns = [
    initialUrl,
    `https://resource.heygen.ai/avatar/v3/${avatarId}/preview_target.webp`,
    `https://resource.heygen.ai/avatar/v3/${avatarId}/preview.webp`,
    `https://files.heygen.ai/avatar/v3/${avatarId}/preview_target.webp`,
    `https://files.heygen.ai/avatar/v3/${avatarId}/preview.webp`,
    // Some avatars appear to expose non-webp previews
    `https://resource.heygen.ai/avatar/v3/${avatarId}/preview_target.png`,
    `https://resource.heygen.ai/avatar/v3/${avatarId}/preview.png`,
    `https://files.heygen.ai/avatar/v3/${avatarId}/preview_target.png`,
    `https://files.heygen.ai/avatar/v3/${avatarId}/preview.png`,
  ].filter(Boolean) as string[];

  const unique = Array.from(new Set(patterns));
  unique.push("/placeholder.svg");
  return unique;
};

export function AvatarPreviewImage({
  avatarId,
  initialUrl,
  alt,
  className,
  loading = "lazy",
}: Props) {
  const candidates = useMemo(
    () => buildCandidateUrls(avatarId, initialUrl),
    [avatarId, initialUrl],
  );
  const [index, setIndex] = useState(0);

  const src = candidates[Math.min(index, candidates.length - 1)];

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      className={className}
      onError={() => {
        setIndex((i) => (i + 1 < candidates.length ? i + 1 : i));
      }}
    />
  );
}
