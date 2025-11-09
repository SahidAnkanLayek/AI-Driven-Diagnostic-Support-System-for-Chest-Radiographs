-- Create profiles table for user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create patient_info table
CREATE TABLE IF NOT EXISTS public.patient_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age > 0 AND age < 150),
  sex TEXT NOT NULL CHECK (sex IN ('Male', 'Female', 'Other')),
  weight DECIMAL(5,2) CHECK (weight > 0),
  height DECIMAL(5,2) CHECK (height > 0),
  contact_number TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.patient_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own patient info"
  ON public.patient_info FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own patient info"
  ON public.patient_info FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own patient info"
  ON public.patient_info FOR UPDATE
  USING (auth.uid() = user_id);

-- Create diagnoses table
CREATE TABLE IF NOT EXISTS public.diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_info_id UUID REFERENCES public.patient_info(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  heatmap_url TEXT,
  heatmap_base64 TEXT,
  predictions JSONB NOT NULL,
  top_prediction TEXT,
  confidence_score DECIMAL(5,2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
  has_cancer BOOLEAN DEFAULT FALSE,
  pdf_base64 TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.diagnoses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own diagnoses"
  ON public.diagnoses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own diagnoses"
  ON public.diagnoses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create reports table
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  diagnosis_id UUID NOT NULL REFERENCES public.diagnoses(id) ON DELETE CASCADE,
  patient_info_id UUID REFERENCES public.patient_info(id) ON DELETE SET NULL,
  report_url TEXT,
  report_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reports"
  ON public.reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reports"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create storage bucket for X-ray images
INSERT INTO storage.buckets (id, name, public)
VALUES ('xray-images', 'xray-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for X-ray images
CREATE POLICY "Users can upload own X-ray images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'xray-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own X-ray images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'xray-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view X-ray images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'xray-images');

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_patient_info_updated_at
  BEFORE UPDATE ON public.patient_info
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
