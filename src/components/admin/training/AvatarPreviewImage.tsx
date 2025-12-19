import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  avatarId: string;
  initialUrl?: string | null;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
};

export function AvatarPreviewImage({
  avatarId,
  initialUrl,
  alt,
  className,
  loading = "lazy",
}: Props) {
  const [apiUrl, setApiUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [fetching, setFetching] = useState(false);

  // Reset state when avatarId changes
  useEffect(() => {
    setApiUrl(null);
    setFailed(false);
    setFetching(false);
  }, [avatarId]);

  // Fetch the real preview URL from HeyGen API
  useEffect(() => {
    if (!avatarId || apiUrl || fetching) return;

    const fetchPreviewUrl = async () => {
      setFetching(true);
      try {
        const { data, error } = await supabase.functions.invoke("heygen-avatar-details", {
          body: { avatar_id: avatarId },
        });

        if (error) {
          console.error("Error fetching avatar details:", error);
          setFailed(true);
          return;
        }

        if (data?.preview_image_url) {
          console.log(`Got preview URL for ${avatarId}:`, data.preview_image_url);
          setApiUrl(data.preview_image_url);
        } else {
          console.warn(`No preview_image_url returned for ${avatarId}`);
          setFailed(true);
        }
      } catch (e) {
        console.error("Failed to fetch avatar preview:", e);
        setFailed(true);
      } finally {
        setFetching(false);
      }
    };

    fetchPreviewUrl();
  }, [avatarId, apiUrl, fetching]);

  // Determine which URL to use
  const src = useMemo(() => {
    if (apiUrl) return apiUrl;
    if (failed) return "/placeholder.svg";
    if (initialUrl) return initialUrl;
    return "/placeholder.svg";
  }, [apiUrl, failed, initialUrl]);

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      className={className}
      onError={() => {
        console.warn(`Image failed to load: ${src}`);
        setFailed(true);
      }}
    />
  );
}
