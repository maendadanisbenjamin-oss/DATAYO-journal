import "server-only";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendInvitationEmail(params: {
  to: string;
  invitationCode: string;
  expiresInDays: number;
}) {
  const from = process.env.RESEND_FROM_EMAIL;

  if (!from) {
    throw new Error("RESEND_FROM_EMAIL est manquant.");
  }

  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY est manquant.");
  }

  return resend.emails.send({
    from,
    to: [params.to],
    subject: "Invitation à rejoindre DATAYO-journal",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;max-width:600px;margin:auto">
        <h2>Invitation à rejoindre DATAYO-journal</h2>
        <p>Vous avez été invité(e) à créer un compte sur DATAYO-journal.</p>
        <p>Votre code d'invitation est :</p>
        <p style="font-size:24px;font-weight:700;letter-spacing:4px">${params.invitationCode}</p>
        <p>Ce code est valable pendant ${params.expiresInDays} jour(s).</p>
        <p>Utilisez ce code lors de votre inscription sur DATAYO-journal.</p>
        <hr>
        <p style="font-size:12px;color:#777">Cet e-mail a été envoyé automatiquement par DATAYO-journal.</p>
      </div>
    `,
  });
}
