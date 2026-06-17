import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

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
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    return;
  }
}

async function findUserByEmail(supabase, email) {
  let page = 1;
  while (page <= 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const users = data?.users ?? [];
    const match = users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (users.length < 200) break;
    page += 1;
  }
  return null;
}

async function setAdminRole(supabase, userId) {
  const { data: getData, error: getError } = await supabase.auth.admin.getUserById(userId);
  if (getError) throw new Error(getError.message);
  const current = getData.user;
  const appMetadata = { ...(current?.app_metadata ?? {}), role: "admin" };
  const { error } = await supabase.auth.admin.updateUserById(userId, { app_metadata: appMetadata });
  if (error) throw new Error(error.message);
}

async function main() {
  await loadDotEnvFile(".env.local");
  await loadDotEnvFile(".env");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.argv[2];

  if (!url || !serviceKey) throw new Error("Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  if (!email) throw new Error("Usa: npm run admin:recovery-link -- <email>");

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  let user = await findUserByEmail(supabase, email);
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("Creazione utente fallita.");
    user = data.user;
  }

  await setAdminRole(supabase, user.id);

  const callbackUrl = "http://localhost:3000/auth/callback?next=%2Freset-password";

  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo: callbackUrl
    }
  });
  if (linkError) throw new Error(linkError.message);

  const actionLink = linkData?.properties?.action_link;
  if (!actionLink) throw new Error("Link di recupero non disponibile.");

  console.log(actionLink);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
