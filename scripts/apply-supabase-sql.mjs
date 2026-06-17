import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

async function loadDotEnvFile(fileName) {
  try {
    const content = await readFile(resolve(process.cwd(), fileName), "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const equalIndex = line.indexOf("=");
      if (equalIndex <= 0) continue;
      const key = line.slice(0, equalIndex).trim();
      const value = line.slice(equalIndex + 1).trim();
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    // Ignore missing env files: the script can still rely on process env.
  }
}

function getProjectRef() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL mancante.");
  }

  const hostname = new URL(url).hostname;
  const [projectRef] = hostname.split(".");
  if (!projectRef) {
    throw new Error(`Impossibile ricavare il project ref da ${url}.`);
  }

  return projectRef;
}

async function main() {
  await loadDotEnvFile(".env.local");
  await loadDotEnvFile(".env");

  const relativePath = process.argv[2];
  if (!relativePath) {
    throw new Error("Passa il percorso del file SQL, ad esempio: supabase/migrations/0004_fix_create_booking_ambiguity.sql");
  }

  const managementToken = process.env.SUPABASE_MANAGEMENT_API_TOKEN || process.env.SUPABASE_ACCESS_TOKEN;
  if (!managementToken) {
    throw new Error(
      "Manca SUPABASE_MANAGEMENT_API_TOKEN (o SUPABASE_ACCESS_TOKEN). Crea un PAT in Supabase Dashboard > Account > Access Tokens."
    );
  }

  const projectRef = getProjectRef();
  const sqlPath = resolve(process.cwd(), relativePath);
  const query = await readFile(sqlPath, "utf8");

  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${managementToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query,
      read_only: false
    })
  });

  const bodyText = await response.text();
  const body = bodyText ? safeJsonParse(bodyText) : null;

  if (!response.ok) {
    const detail = typeof body === "object" && body && "message" in body ? body.message : bodyText;
    throw new Error(`Supabase Management API ${response.status}: ${detail}`);
  }

  console.log(`SQL applicato con successo al progetto ${projectRef}.`);
  if (body !== null) {
    console.log(JSON.stringify(body, null, 2));
  }
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
