import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const tables = Array.from({ length: 7 }, (_, i) => ({
  name: `Маса ${i + 1}`,
  status: "free",
}));

const { data, error } = await supabase.from("tables").insert(tables).select();

if (error) {
  console.error("Failed to seed tables:", error.message);
  process.exit(1);
}

console.log(`Created ${data.length} tables:`);
data.forEach((t) => console.log(`  - ${t.name} (${t.id})`));
