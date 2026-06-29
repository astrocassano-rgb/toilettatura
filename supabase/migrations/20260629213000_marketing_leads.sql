CREATE TABLE IF NOT EXISTS public.marketing_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    salon_name TEXT,
    city TEXT,
    plan_interest TEXT,
    notes TEXT,
    status TEXT DEFAULT 'new' NOT NULL
);

-- Abilitiamo RLS
ALTER TABLE public.marketing_leads ENABLE ROW LEVEL SECURITY;

-- Policy di INSERT pubblica per consentire a chiunque di registrarsi dal sito
CREATE POLICY "Allow public insert to marketing_leads" 
ON public.marketing_leads 
FOR INSERT 
WITH CHECK (true);
