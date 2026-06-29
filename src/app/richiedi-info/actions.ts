"use server";

import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const leadSchema = z.object({
  name: z.string().min(2, "Il nome deve contenere almeno 2 caratteri"),
  email: z.string().email("Inserisci un indirizzo email valido"),
  phone: z.string().min(5, "Inserisci un numero di telefono valido"),
  salonName: z.string().optional(),
  city: z.string().optional(),
  planInterest: z.enum(["START", "PRO", "ENTERPRISE"]).optional(),
  notes: z.string().optional(),
});

export async function submitLeadAction(formData: z.infer<typeof leadSchema>) {
  try {
    // 1. Valida i dati
    const validated = leadSchema.parse(formData);

    // 2. Salva nel DB Supabase (usando il service role per bypassare le RLS)
    const adminSupabase = createSupabaseAdminClient() as any;
    const { data, error } = await adminSupabase
      .from("marketing_leads")
      .insert({
        name: validated.name,
        email: validated.email,
        phone: validated.phone,
        salon_name: validated.salonName || null,
        city: validated.city || null,
        plan_interest: validated.planInterest || null,
        notes: validated.notes || null,
        status: "new",
      })
      .select()
      .single();

    if (error) {
      console.error("Errore salvataggio lead in Supabase:", error.message);
      return { success: false, error: "Impossibile salvare i dati nel database." };
    }

    // 3. Invio notifica email a info@dogwash24.it via Resend REST API
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      try {
        const emailFrom = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
        const emailTo = "info@dogwash24.it";

        const htmlContent = `
          <h2>Nuova richiesta contatto ricevuta!</h2>
          <p>Un nuovo toelettatore si è registrato sul sito DogWash24.</p>
          <table border="0" cellpadding="8" cellspacing="0" style="border-collapse: collapse; font-family: sans-serif;">
            <tr><td><b>Nome Referente:</b></td><td>${validated.name}</td></tr>
            <tr><td><b>Nome Salone:</b></td><td>${validated.salonName || "Non specificato"}</td></tr>
            <tr><td><b>Email:</b></td><td><a href="mailto:${validated.email}">${validated.email}</a></td></tr>
            <tr><td><b>Telefono:</b></td><td><a href="tel:${validated.phone}">${validated.phone}</a></td></tr>
            <tr><td><b>Città/Provincia:</b></td><td>${validated.city || "Non specificata"}</td></tr>
            <tr><td><b>Piano di interesse:</b></td><td><span style="background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-weight: bold;">${validated.planInterest || "Nessuno"}</span></td></tr>
            ${validated.notes ? `<tr><td><b>Messaggio/Note:</b></td><td>${validated.notes}</td></tr>` : ""}
          </table>
          <br/>
          <hr/>
          <p style="font-size: 12px; color: #666;">Questo lead è stato salvato nel database ed è gestibile dalla tua <a href="https://app.dogwash24.it/superadmin">Dashboard Superadmin</a>.</p>
        `;

        const mailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `DogWash24 Leads <${emailFrom}>`,
            to: emailTo,
            subject: `Nuovo Lead: ${validated.salonName || validated.name} (${validated.planInterest || "Richiesta"})`,
            html: htmlContent,
          }),
        });

        if (!mailRes.ok) {
          const errText = await mailRes.text();
          console.warn("Mailing API warning (Resend):", errText);
        }
      } catch (mailErr) {
        console.error("Errore durante l'invio della notifica email:", mailErr);
      }
    } else {
      console.log("Notifica email saltata: RESEND_API_KEY non definita in .env.local. Il lead è comunque salvato nel DB.");
    }

    return { success: true, leadId: data.id };
  } catch (err) {
    console.error("Errore Server Action:", err);
    if (err instanceof z.ZodError) {
      return { success: false, error: err.issues[0]?.message || "Dati non validi." };
    }
    return { success: false, error: "Si è verificato un errore imprevisto." };
  }
}
