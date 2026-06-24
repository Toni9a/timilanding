import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vmtkanwpagfspssppltw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtdGthbndwYWdmc3Bzc3BwbHR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyNDYyMDYsImV4cCI6MjA5NzgyMjIwNn0.UtgrhzYJHOHgda42pCmHH0-HQuT5LIDSg6DMobK8eak';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
