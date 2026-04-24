import nodemailer from "nodemailer";

type EmailAttachment = {
  filename: string;
  content: string;
  contentType?: string;
};

function readSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !port || !user || !pass || !from) {
    return null;
  }

  return {
    host,
    port,
    user,
    pass,
    from,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
  };
}

export function hasSmtpConfig() {
  return Boolean(readSmtpConfig());
}

export async function sendEmailWithAttachments(input: {
  to: string;
  subject: string;
  text: string;
  attachments?: EmailAttachment[];
}) {
  const config = readSmtpConfig();

  if (!config) {
    throw new Error("SMTP is not configured.");
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  await transporter.sendMail({
    from: config.from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    attachments: input.attachments,
  });
}
