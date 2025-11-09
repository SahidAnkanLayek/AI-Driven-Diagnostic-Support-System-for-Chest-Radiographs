import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, Image as ImageIcon, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface DiagnosisUploadProps {
  patientInfoId: string;
  onDiagnosisComplete: (diagnosis: any) => void;
}

const BACKEND_API_URL = "http://localhost:8000/api";

const DiagnosisUpload = ({ patientInfoId, onDiagnosisComplete }: DiagnosisUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setProgress(0);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 200);

    // Upload to storage
    const fileName = `${user.id}/${Date.now()}_${selectedFile.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("xray-images")
      .upload(fileName, selectedFile);

    clearInterval(progressInterval);
    setProgress(100);

    if (uploadError) {
      toast({
        title: "Upload failed",
        description: uploadError.message,
        variant: "destructive",
      });
      setUploading(false);
      return;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("xray-images")
      .getPublicUrl(fileName);

    setUploading(false);
    setAnalyzing(true);

    try {
      // Call backend API for AI analysis
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(`${BACKEND_API_URL}/predict`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("AI analysis failed");
      }

      const aiResult = await response.json();

      // Save diagnosis
      const { data: diagnosisData, error: diagnosisError } = await supabase
        .from("diagnoses")
        .insert({
          user_id: user.id,
          patient_info_id: patientInfoId,
          image_url: publicUrl,
          predictions: aiResult,
          top_prediction: aiResult.top_label,
          confidence_score: aiResult.top_score,
          heatmap_base64: aiResult.heatmap_png_base64,
          pdf_base64: aiResult.pdf_base64,
        })
        .select()
        .single();

      setAnalyzing(false);

      if (diagnosisError) {
        toast({
          title: "Error saving diagnosis",
          description: diagnosisError.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Analysis complete",
        description: "Chest X-ray analyzed successfully",
      });

      onDiagnosisComplete(diagnosisData);
    } catch (error) {
      setAnalyzing(false);
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Failed to analyze X-ray",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle>Upload Chest X-Ray</CardTitle>
            <CardDescription>
              Upload a chest X-ray image for AI-powered diagnosis
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          {preview ? (
            <div className="space-y-4">
              <img
                src={preview}
                alt="X-ray preview"
                className="max-h-96 mx-auto rounded-lg shadow-md"
              />
              <Button variant="outline" type="button">
                Change Image
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-lg font-medium">Click to upload X-ray image</p>
                <p className="text-sm text-muted-foreground mt-1">
                  PNG, JPG, JPEG up to 10MB
                </p>
              </div>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {(uploading || analyzing) && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {uploading ? "Uploading..." : "Analyzing with AI..."}
              </span>
              <span className="font-medium">{uploading ? `${progress}%` : "Processing"}</span>
            </div>
            {uploading && <Progress value={progress} className="w-full" />}
            {analyzing && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </div>
        )}

        <Button
          onClick={handleUpload}
          disabled={!selectedFile || uploading || analyzing}
          className="w-full"
          size="lg"
        >
          {uploading || analyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {uploading ? "Uploading..." : "Analyzing..."}
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Start AI Diagnosis
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default DiagnosisUpload;