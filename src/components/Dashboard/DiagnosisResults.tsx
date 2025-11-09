import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  RefreshCw,
} from "lucide-react";
import HospitalSuggestions from "./HospitalSuggestions";

interface DiagnosisResultsProps {
  diagnosis: any;
  patientInfo: any;
  onNewDiagnosis: () => void;
}

const DiagnosisResults = ({ diagnosis, patientInfo, onNewDiagnosis }: DiagnosisResultsProps) => {
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  const predictions = diagnosis.predictions?.predictions || [];
  const labels = diagnosis.predictions?.labels || [];
  const scores = diagnosis.predictions?.scores || [];
  const topLabel = diagnosis.predictions?.top_label || diagnosis.top_prediction;
  const topScore = diagnosis.predictions?.top_score || diagnosis.confidence_score;
  const heatmap = diagnosis.heatmap_base64;
  const pdfBase64 = diagnosis.pdf_base64;

  const confidenceScore = Math.round(topScore * 100);

  const getStatusIcon = () => {
    if (confidenceScore < 25) return <CheckCircle2 className="h-12 w-12 text-success" />;
    if (confidenceScore > 50) return <XCircle className="h-12 w-12 text-destructive" />;
    return <AlertTriangle className="h-12 w-12 text-warning" />;
  };

  const getStatusColor = () => {
    if (confidenceScore < 25) return "success";
    if (confidenceScore > 50) return "destructive";
    return "warning";
  };

  const getStatusText = () => {
    if (confidenceScore < 25) return "Low Risk";
    if (confidenceScore > 50) return "High Risk";
    return "Moderate Risk";
  };

  const downloadPDF = async () => {
    if (!pdfBase64) {
      toast({
        title: "Error",
        description: "PDF report not available",
        variant: "destructive",
      });
      return;
    }

    setDownloading(true);

    try {
      const pdfBytes = Buffer.from(pdfBase64, "hex");
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `diagnosis_${patientInfo.full_name}_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("reports").insert({
          user_id: user.id,
          diagnosis_id: diagnosis.id,
          patient_info_id: patientInfo.id,
          report_data: {
            patient: patientInfo,
            diagnosis: diagnosis,
            generated_at: new Date().toISOString(),
          },
        });
      }

      toast({
        title: "Report Downloaded",
        description: "PDF report has been saved",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download PDF",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleNewDiagnosis = () => {
    onNewDiagnosis();
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-2" style={{ borderColor: `hsl(var(--${getStatusColor()}))` }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {getStatusIcon()}
              <div>
                <CardTitle className="text-2xl">{getStatusText()}</CardTitle>
                <CardDescription>AI Analysis Complete</CardDescription>
              </div>
            </div>
            <Badge
              variant={hasCancer ? "destructive" : "default"}
              className="text-lg px-4 py-2"
            >
              {confidenceScore}% Confidence
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-3">Original X-Ray</h3>
                <img
                  src={diagnosis.image_url}
                  alt="Chest X-ray"
                  className="rounded-lg shadow-md w-full"
                />
              </div>
              {heatmap && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">Grad-CAM Heatmap</h3>
                  <img
                    src={`data:image/png;base64,${heatmap}`}
                    alt="Grad-CAM Heatmap"
                    className="rounded-lg shadow-md w-full"
                  />
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-3">Disease Predictions</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {labels.map((label: string, index: number) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{label}</span>
                        <span className="text-muted-foreground">
                          {(scores[index] * 100).toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={scores[index] * 100} className="h-2" />
                    </div>
                  ))}
                </div>
              </div>

              {confidenceScore < 25 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 font-medium">
                    ✓ Low risk detected
                  </p>
                </div>
              )}

              {confidenceScore > 50 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 font-medium">
                    ⚠ High risk detected. Please consult a specialist.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={downloadPDF} disabled={downloading} size="lg" className="flex-1">
              {downloading ? (
                <>Downloading...</>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF Report
                </>
              )}
            </Button>
            <Button onClick={handleNewDiagnosis} variant="outline" size="lg" className="flex-1">
              <RefreshCw className="mr-2 h-4 w-4" />
              New Diagnosis
            </Button>
          </div>
        </CardContent>
      </Card>

      {confidenceScore > 50 && <HospitalSuggestions />}
    </div>
  );
};

export default DiagnosisResults;