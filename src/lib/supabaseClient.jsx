// supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://crrwcvoimgjghepgrens.supabase.co'; // Replace with your Supabase URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNycndjdm9pbWdqZ2hlcGdyZW5zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTA5MjI3OSwiZXhwIjoyMDcwNjY4Mjc5fQ.3pNfoc5r5n-NyxnhullZFAMIWFJGiZdT5U0YHCahFyo'; // Replace with your Supabase anon key

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
