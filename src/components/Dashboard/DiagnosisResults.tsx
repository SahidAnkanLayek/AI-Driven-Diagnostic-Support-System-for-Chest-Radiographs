import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  MapPin,
  FileText,
  RefreshCw,
} from "lucide-react";
import HospitalSuggestions from "./HospitalSuggestions";

interface DiagnosisResultsProps {
  diagnosis: any;
  patientInfo: any;
  onNewDiagnosis: () => void;
}

const DiagnosisResults = ({ diagnosis, patientInfo, onNewDiagnosis }: DiagnosisResultsProps) => {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const predictions = diagnosis.predictions || [];
  const hasCancer = diagnosis.has_cancer;
  const confidenceScore = diagnosis.confidence_score;

  const getStatusIcon = () => {
    if (!hasCancer) return <CheckCircle2 className="h-12 w-12 text-success" />;
    if (confidenceScore > 60) return <XCircle className="h-12 w-12 text-destructive" />;
    return <AlertTriangle className="h-12 w-12 text-warning" />;
  };

  const getStatusColor = () => {
    if (!hasCancer) return "success";
    if (confidenceScore > 60) return "destructive";
    return "warning";
  };

  const getStatusText = () => {
    if (!hasCancer) return "No Cancer Detected";
    if (confidenceScore > 60) return "High Risk Detection";
    return "Moderate Risk Detection";
  };

  const generatePDF = async () => {
    setGenerating(true);

    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(37, 99, 235);
    doc.text("X-Ray Diagnosis Report", 20, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 28);

    // Patient Information
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Patient Information", 20, 40);

    doc.setFontSize(10);
    doc.text(`Name: ${patientInfo.full_name}`, 20, 50);
    doc.text(`Age: ${patientInfo.age} years`, 20, 56);
    doc.text(`Sex: ${patientInfo.sex}`, 20, 62);
    doc.text(`Weight: ${patientInfo.weight} kg`, 20, 68);
    doc.text(`Height: ${patientInfo.height} cm`, 20, 74);
    doc.text(`Contact: ${patientInfo.contact_number}`, 20, 80);

    // Diagnosis Results
    doc.setFontSize(14);
    doc.text("Diagnosis Results", 20, 95);

    doc.setFontSize(10);
    doc.text(`Status: ${getStatusText()}`, 20, 105);
    doc.text(`Top Prediction: ${diagnosis.top_prediction}`, 20, 111);
    doc.text(`Confidence: ${confidenceScore}%`, 20, 117);

    // Predictions
    doc.text("Detailed Predictions:", 20, 130);
    predictions.forEach((pred: any, index: number) => {
      const y = 138 + index * 6;
      doc.text(
        `${index + 1}. ${pred.name}: ${(pred.probability * 100).toFixed(1)}%`,
        25,
        y
      );
    });

    // Save PDF
    const pdfBlob = doc.output("blob");
    const fileName = `diagnosis_${patientInfo.full_name}_${Date.now()}.pdf`;

    // Upload to storage
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("xray-images")
        .upload(`${user.id}/reports/${fileName}`, pdfBlob);

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from("xray-images")
          .getPublicUrl(`${user.id}/reports/${fileName}`);

        // Save report record
        await supabase.from("reports").insert({
          user_id: user.id,
          diagnosis_id: diagnosis.id,
          patient_info_id: patientInfo.id,
          report_url: publicUrl,
          report_data: {
            patient: patientInfo,
            diagnosis: diagnosis,
            generated_at: new Date().toISOString(),
          },
        });
      }
    }

    // Download PDF
    doc.save(fileName);
    setGenerating(false);

    toast({
      title: "Report Generated",
      description: "PDF report has been saved and downloaded",
    });
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
            <div>
              <img
                src={diagnosis.image_url}
                alt="Chest X-ray"
                className="rounded-lg shadow-md w-full"
              />
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-3">Top Predictions</h3>
                <div className="space-y-3">
                  {predictions.map((pred: any, index: number) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{pred.name}</span>
                        <span className="text-muted-foreground">
                          {(pred.probability * 100).toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={pred.probability * 100} className="h-2" />
                    </div>
                  ))}
                </div>
              </div>

              {!hasCancer && (
                <div className="bg-success-light border border-success rounded-lg p-4">
                  <p className="text-success-foreground font-medium">
                    ✓ All prediction probabilities are below the cancer detection threshold
                  </p>
                </div>
              )}

              {hasCancer && (
                <div className="bg-destructive-light border border-destructive rounded-lg p-4">
                  <p className="text-destructive-foreground font-medium">
                    ⚠ Potential abnormality detected. Please consult a specialist.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={generatePDF} disabled={generating} size="lg" className="flex-1">
              {generating ? (
                <>Generating...</>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Print & Save Report
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

      {hasCancer && <HospitalSuggestions />}
    </div>
  );
};

export default DiagnosisResults;