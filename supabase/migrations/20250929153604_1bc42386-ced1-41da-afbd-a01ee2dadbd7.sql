-- Create bank accounts table for different branches
CREATE TABLE public.bank_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_name TEXT NOT NULL,
  branch_country TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  swift_code TEXT,
  iban TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  exchange_rate NUMERIC DEFAULT 1.0,
  bank_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- Create policy for bank accounts
CREATE POLICY "Enable all access for authenticated users bank_accounts"
ON public.bank_accounts
FOR ALL
USING (true)
WITH CHECK (true);

-- Create itinerary table
CREATE TABLE public.itineraries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
  tour_id UUID REFERENCES public.tours(id),
  tour_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;

-- Create policy for itineraries
CREATE POLICY "Enable all access for authenticated users itineraries"
ON public.itineraries
FOR ALL
USING (true)
WITH CHECK (true);

-- Update quotes table to replace customer_email with reference_number
ALTER TABLE public.quotes 
DROP COLUMN IF EXISTS client_email,
ADD COLUMN IF NOT EXISTS ticket_reference TEXT;

-- Update quotes table to add more status options
ALTER TABLE public.quotes 
ALTER COLUMN status TYPE TEXT,
ALTER COLUMN status SET DEFAULT 'draft';

-- Add triggers for updated_at
CREATE TRIGGER update_bank_accounts_updated_at
BEFORE UPDATE ON public.bank_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_itineraries_updated_at
BEFORE UPDATE ON public.itineraries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();