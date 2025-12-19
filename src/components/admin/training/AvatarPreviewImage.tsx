import { useState } from "react";

type Props = {
  avatarId: string;
  initialUrl?: string | null;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
};

export function AvatarPreviewImage({
  initialUrl,
  alt,
  className,
  loading = "lazy",
}: Props) {
  const [failed, setFailed] = useState(false);

  return (
    <img
      src={failed || !initialUrl ? "/placeholder.svg" : initialUrl}
      alt={alt}
      loading={loading}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
