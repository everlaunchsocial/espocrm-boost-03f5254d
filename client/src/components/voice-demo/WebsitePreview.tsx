import { ExternalLink } from "lucide-react";

interface WebsitePreviewProps {
  screenshotUrl?: string;
  websiteUrl?: string;
  isLoading?: boolean;
}

export const WebsitePreview = ({ screenshotUrl, websiteUrl, isLoading }: WebsitePreviewProps) => {
  if (isLoading) {
    return (
      <div className="w-full aspect-video bg-muted rounded-lg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading website preview...</p>
        </div>
      </div>
    );
  }

  if (!screenshotUrl) {
    return (
      <div className="w-full aspect-video bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-border">
        <p className="text-muted-foreground">Enter a website URL to see a preview</p>
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-lg overflow-hidden shadow-lg">
      <img 
        src={screenshotUrl} 
        alt="Website preview" 
        className="w-full h-auto"
      />
      {websiteUrl && (
        <a 
          href={websiteUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="absolute top-3 right-3 bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5 hover:bg-background transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Visit Site
        </a>
      )}
    </div>
  );
};
