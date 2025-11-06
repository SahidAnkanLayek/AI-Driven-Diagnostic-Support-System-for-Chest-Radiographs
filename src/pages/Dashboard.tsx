import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import PatientForm from "@/components/Dashboard/PatientForm";
import DiagnosisUpload from "@/components/Dashboard/DiagnosisUpload";
import DiagnosisResults from "@/components/Dashboard/DiagnosisResults";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Activity, TrendingUp } from "lucide-react";

interface PatientInfo {
  id: string;
  full_name: string;
  age: number;
  sex: string;
  weight: number;
  height: number;
  contact_number: string;
  address?: string;
}

interface DiagnosisResult {
  id: string;
  predictions: any;
  confidence_score: number;
  has_cancer: boolean;
  heatmap_url?: string;
  image_url: string;
  created_at: string;
}

const Dashboard = () => {
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [latestDiagnosis, setLatestDiagnosis] = useState<DiagnosisResult | null>(null);
  const [stats, setStats] = useState({ totalDiagnoses: 0, totalReports: 0 });
  const { toast } = useToast();

  useEffect(() => {
    fetchPatientInfo();
    fetchLatestDiagnosis();
    fetchStats();
  }, []);

  const fetchPatientInfo = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("patient_info")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setPatientInfo(data);
    }
  };

  const fetchLatestDiagnosis = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("diagnoses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setLatestDiagnosis(data);
    }
  };

  const fetchStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { count: diagnosesCount } = await supabase
      .from("diagnoses")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    const { count: reportsCount } = await supabase
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    setStats({
      totalDiagnoses: diagnosesCount || 0,
      totalReports: reportsCount || 0,
    });
  };

  const handlePatientSubmit = async (data: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: newPatient, error } = await supabase
      .from("patient_info")
      .insert({ ...data, user_id: user.id })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setPatientInfo(newPatient);
      toast({
        title: "Success",
        description: "Patient information saved successfully!",
      });
    }
  };

  const handleDiagnosisComplete = (diagnosis: DiagnosisResult) => {
    setLatestDiagnosis(diagnosis);
    fetchStats();
  };

  const handleNewDiagnosis = () => {
    setLatestDiagnosis(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Chest X-Ray AI Diagnosis System</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Diagnoses</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDiagnoses}</div>
            <p className="text-xs text-muted-foreground">X-ray scans analyzed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reports Generated</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReports}</div>
            <p className="text-xs text-muted-foreground">Medical reports saved</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">Active</div>
            <p className="text-xs text-muted-foreground">System operational</p>
          </CardContent>
        </Card>
      </div>

      {!patientInfo ? (
        <PatientForm onSubmit={handlePatientSubmit} />
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Patient Information</CardTitle>
              <CardDescription>Current patient details on file</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  <p className="text-lg font-semibold">{patientInfo.full_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Age / Sex</p>
                  <p className="text-lg font-semibold">{patientInfo.age} years / {patientInfo.sex}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Weight / Height</p>
                  <p className="text-lg font-semibold">{patientInfo.weight} kg / {patientInfo.height} cm</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Contact</p>
                  <p className="text-lg font-semibold">{patientInfo.contact_number}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {!latestDiagnosis ? (
            <DiagnosisUpload
              patientInfoId={patientInfo.id}
              onDiagnosisComplete={handleDiagnosisComplete}
            />
          ) : (
            <DiagnosisResults 
              diagnosis={latestDiagnosis} 
              patientInfo={patientInfo} 
              onNewDiagnosis={handleNewDiagnosis}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;