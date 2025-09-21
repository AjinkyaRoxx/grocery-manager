// Initialize Supabase
const supabaseUrl = 'https://jqaugzerhewquttsedqh.supabase.co'; // Replace with your Supabase URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxYXVnemVyaGV3cXV0dHNlZHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczOTU1NzUsImV4cCI6MjA3Mjk3MTU3NX0.FxbL2-ze1YRcoXtCAq3ZtWklcvkCX0yzj1UfOAStIOc'; // Replace with your Supabase anon key
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

export { supabase };