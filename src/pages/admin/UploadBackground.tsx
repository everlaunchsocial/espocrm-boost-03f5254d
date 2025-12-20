import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import backgroundImage from "@/assets/video-background-everlaunch.png";

export default function UploadBackground() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleUpload = async () => {
    setUploading(true);
    try {
      // Fetch the image as blob
      const response = await fetch(backgroundImage);
      const blob = await response.blob();
      
      // Convert to base64
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        
        const { data, error } = await supabase.functions.invoke("upload-background-image", {
          body: {
            imageBase64: base64data,
            fileName: "video-background.png"
          }
        });

        if (error) {
          toast.error("Upload failed: " + error.message);
          setResult("Error: " + error.message);
        } else {
          toast.success("Background uploaded successfully!");
          setResult("Success! Public URL: " + data.publicUrl);
        }
        setUploading(false);
      };
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload");
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>Upload Training Video Background</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Preview of the branded background that will be uploaded:
            </p>
            <img 
              src={backgroundImage} 
              alt="Background preview" 
              className="max-w-full h-auto rounded-lg border"
              style={{ maxHeight: "400px" }}
            />
          </div>
          
          <Button onClick={handleUpload} disabled={uploading}>
            {uploading ? "Uploading..." : "Upload to Assets Bucket"}
          </Button>
          
          {result && (
            <div className="p-4 bg-muted rounded-lg">
              <pre className="text-sm whitespace-pre-wrap">{result}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
