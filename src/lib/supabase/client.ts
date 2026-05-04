import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = "https://grpyzwvgqiwtxadfdtni.supabase.co";

const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdycHl6d3ZncWl3dHhhZGZkdG5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTI3MTYsImV4cCI6MjA5MjUyODcxNn0.k0NOMDHWthrRakYlo59MK5Hm9UeSg-r7MyBK8fjqpao";

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}