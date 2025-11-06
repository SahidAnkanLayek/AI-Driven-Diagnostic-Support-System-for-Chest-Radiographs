import { useState } from "react";
import { Upload, Loader2, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { predictImage, type PredictionResponse } from "@/lib/api";

const AnalyzeCXR = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<PredictionResponse | null>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please select an image file (JPEG, PNG)",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    setResults(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setAnalyzing(true);
    try {
      const prediction = await predictImage(file);
      setResults(prediction);
      toast({
        title: "Analysis complete",
        description: `Top finding: ${prediction.top_label} (${(prediction.top_score * 100).toFixed(1)}%)`,
      });
    } catch (error) {
      console.error("Analysis failed:", error);
      const errorMessage = error instanceof Error && error.message.includes("Failed to fetch")
        ? "Cannot connect to AI backend. Please ensure the FastAPI server is running on http://localhost:8000"
        : error instanceof Error ? error.message : "Unknown error occurred";
      
      toast({
        title: "Analysis failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Activity className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Analyze Chest X-Ray</h1>
          <p className="text-muted-foreground">Upload an X-ray image for AI-powered analysis</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Image</CardTitle>
            <CardDescription>Select a chest X-ray image (JPEG, PNG)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
              <input
                type="file"
                id="file-upload"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  JPEG or PNG up to 10MB
                </p>
              </label>
            </div>

            {preview && (
              <div className="space-y-4">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-64 object-contain bg-muted rounded-lg"
                />
                <Button
                  onClick={handleAnalyze}
                  disabled={analyzing || !file}
                  className="w-full"
                  size="lg"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    "Analyze X-Ray"
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
            <CardDescription>AI-powered diagnostic predictions</CardDescription>
          </CardHeader>
          <CardContent>
            {!results ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <p>Upload and analyze an image to see results</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Top Finding */}
                <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Top Finding</h3>
                  <p className="text-2xl font-bold">{results.top_label}</p>
                  <p className="text-lg text-muted-foreground">
                    {(results.top_score * 100).toFixed(1)}% confidence
                  </p>
                </div>

                {/* All Predictions */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">All Findings</h3>
                  {results.labels.map((label, idx) => {
                    const score = results.scores[idx];
                    const percentage = (score * 100).toFixed(1);
                    return (
                      <div key={label} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{label}</span>
                          <span className="text-muted-foreground">{percentage}%</span>
                        </div>
                        <Progress value={score * 100} className="h-2" />
                      </div>
                    );
                  })}
                </div>

                {/* Grad-CAM Heatmap */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Grad-CAM Heatmap (Focus Area)
                  </h3>
                  <img
                    src={`data:image/png;base64,${results.heatmap_png_base64}`}
                    alt="Grad-CAM heatmap"
                    className="w-full rounded-lg border border-border"
                  />
                  <p className="text-xs text-muted-foreground">
                    Highlighted areas show regions the AI focused on for the top prediction
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyzeCXR;
