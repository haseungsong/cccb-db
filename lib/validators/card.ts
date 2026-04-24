import { z } from "zod";

export const normalizedCardSchema = z.object({
  name: z.string().default(""),
  company: z.string().default(""),
  jobTitle: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
  website: z.string().default(""),
  address: z.string().default(""),
  city: z.string().default(""),
  country: z.string().default("Brazil"),
  notes: z.string().default(""),
  languageHint: z.string().default("pt-BR"),
});

export type NormalizedCard = z.infer<typeof normalizedCardSchema>;
