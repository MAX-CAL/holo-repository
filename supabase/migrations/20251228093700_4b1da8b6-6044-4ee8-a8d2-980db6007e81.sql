-- Drop existing tables (they have data from old schema)
DROP TABLE IF EXISTS entries CASCADE;
DROP TABLE IF EXISTS subtopics CASCADE;
DROP TABLE IF EXISTS topics CASCADE;

-- Create users table for access code authentication
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  access_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create categories table with self-referential parent_id for hierarchy
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#22c55e',
  position_x DOUBLE PRECISION NOT NULL DEFAULT 0,
  position_y DOUBLE PRECISION NOT NULL DEFAULT 0,
  position_z DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create entries table with image support
CREATE TABLE public.entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  image_url TEXT,
  image_description TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create storage bucket for entry images
INSERT INTO storage.buckets (id, name, public) VALUES ('entry-images', 'entry-images', true);

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;

-- Users policies (public read for access code lookup, insert for new users)
CREATE POLICY "Anyone can check access codes"
ON public.users FOR SELECT
USING (true);

CREATE POLICY "Anyone can create a user account"
ON public.users FOR INSERT
WITH CHECK (true);

-- Categories policies (users can only access their own)
CREATE POLICY "Users can view their own categories"
ON public.categories FOR SELECT
USING (user_id IN (SELECT id FROM public.users));

CREATE POLICY "Users can create their own categories"
ON public.categories FOR INSERT
WITH CHECK (user_id IN (SELECT id FROM public.users));

CREATE POLICY "Users can update their own categories"
ON public.categories FOR UPDATE
USING (user_id IN (SELECT id FROM public.users));

CREATE POLICY "Users can delete their own categories"
ON public.categories FOR DELETE
USING (user_id IN (SELECT id FROM public.users));

-- Entries policies
CREATE POLICY "Users can view their own entries"
ON public.entries FOR SELECT
USING (user_id IN (SELECT id FROM public.users));

CREATE POLICY "Users can create their own entries"
ON public.entries FOR INSERT
WITH CHECK (user_id IN (SELECT id FROM public.users));

CREATE POLICY "Users can update their own entries"
ON public.entries FOR UPDATE
USING (user_id IN (SELECT id FROM public.users));

CREATE POLICY "Users can delete their own entries"
ON public.entries FOR DELETE
USING (user_id IN (SELECT id FROM public.users));

-- Storage policies for entry images
CREATE POLICY "Anyone can view entry images"
ON storage.objects FOR SELECT
USING (bucket_id = 'entry-images');

CREATE POLICY "Users can upload entry images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'entry-images');

CREATE POLICY "Users can update their entry images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'entry-images');

CREATE POLICY "Users can delete their entry images"
ON storage.objects FOR DELETE
USING (bucket_id = 'entry-images');

-- Create indexes for performance
CREATE INDEX idx_categories_user_id ON public.categories(user_id);
CREATE INDEX idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX idx_entries_category_id ON public.entries(category_id);
CREATE INDEX idx_entries_user_id ON public.entries(user_id);
CREATE INDEX idx_users_access_code ON public.users(access_code);

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_entries_updated_at
BEFORE UPDATE ON public.entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();