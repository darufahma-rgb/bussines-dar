
-- Create enum for customer status
CREATE TYPE public.customer_status AS ENUM ('new', 'warm', 'hot', 'closed');

-- Create enum for interaction type
CREATE TYPE public.interaction_type AS ENUM ('note', 'transaction', 'follow_up', 'quick_capture');

-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Businesses table
CREATE TABLE public.businesses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#6B7280',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage businesses" ON public.businesses FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed default businesses
INSERT INTO public.businesses (name, color) VALUES
  ('Temantiket', '#F59E0B'),
  ('SYMP Studio', '#3B82F6'),
  ('Darcia', '#EC4899'),
  ('AIGYPT', '#10B981');

-- Customers table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status public.customer_status NOT NULL DEFAULT 'new',
  tags TEXT[] DEFAULT '{}',
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage customers" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Customer-Business junction table
CREATE TABLE public.customer_businesses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  UNIQUE(customer_id, business_id)
);

ALTER TABLE public.customer_businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage customer_businesses" ON public.customer_businesses FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Interactions table (notes, transactions, follow-ups, quick captures)
CREATE TABLE public.interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  type public.interaction_type NOT NULL,
  content TEXT NOT NULL,
  amount NUMERIC,
  currency TEXT DEFAULT 'IDR',
  follow_up_date DATE,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage interactions" ON public.interactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_interactions_updated_at BEFORE UPDATE ON public.interactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_customers_status ON public.customers(status);
CREATE INDEX idx_customers_name ON public.customers(name);
CREATE INDEX idx_interactions_customer_id ON public.interactions(customer_id);
CREATE INDEX idx_interactions_type ON public.interactions(type);
CREATE INDEX idx_interactions_follow_up_date ON public.interactions(follow_up_date);
CREATE INDEX idx_interactions_is_completed ON public.interactions(is_completed);
CREATE INDEX idx_customer_businesses_customer ON public.customer_businesses(customer_id);
CREATE INDEX idx_customer_businesses_business ON public.customer_businesses(business_id);
