import type { InvoiceField } from "@repo/shared";

export type ExampleMessage = {
  id: string;
  label: string;
  text: string;
  /** What a correct extraction looks like; checked by scripts/try-extraction.ts. */
  expected: {
    currency: string;
    itemCount: number;
    total?: number;
    client_email: string | null;
    due_in_days?: number | null;
    missing: InvoiceField[];
  };
};

/** Seed messages for the live demo ("Try an example") and for testing extraction. */
export const EXAMPLE_MESSAGES: ExampleMessage[] = [
  {
    id: "whatsapp-logo",
    label: "WhatsApp: logo project",
    text: `[10:14] Priya (Bloom Bakery): Hey! Loved the logo drafts 😍 let's go with option B
[10:15] Me: Awesome! So final: logo design $350 + 2 social media banners at $60 each?
[10:16] Priya (Bloom Bakery): yes perfect. send the invoice to priya@bloombakery.co, we pay within 15 days`,
    expected: {
      currency: "USD",
      itemCount: 2,
      total: 470,
      client_email: "priya@bloombakery.co",
      due_in_days: 15,
      missing: [],
    },
  },
  {
    id: "email-translation",
    label: "Email: negotiated rate in EUR",
    text: `Subject: Re: Website translation

Hi Marco,

Thanks for the quick turnaround. As discussed, we'll go with the reduced rate of €0.08 per word instead of €0.10. The final document was 12,500 words. Please also add the 2 hours of proofreading at €40/hour.

Payment terms are Net 30 as usual.

Best,
Sophie Laurent
Finance, Atelier Nord
sophie.laurent@ateliernord.fr`,
    expected: {
      currency: "EUR",
      itemCount: 2,
      total: 1080,
      client_email: "sophie.laurent@ateliernord.fr",
      due_in_days: 30,
      missing: [],
    },
  },
  {
    id: "notes-photos",
    label: "Call notes: email still missing",
    text: `notes - call w/ Daniel Kim (Kim & Co)
- 3 product photos edited, $25 each
- rush fee $50
- he'll send his billing email later`,
    expected: {
      currency: "USD",
      itemCount: 2,
      total: 125,
      client_email: null,
      due_in_days: null,
      missing: ["client_email", "due_in_days"],
    },
  },
  {
    id: "hinglish-website",
    label: "Hinglish chat in INR",
    text: `Rahul: bhai website ka kaam done hai?
Me: haan bhai, landing page + contact form dono ready
Rahul: great. kitna hua total?
Me: landing page ₹15,000 aur contact form ₹5,000
Rahul: done, 7 din me transfer kar dunga. invoice rahul.verma@gmail.com pe bhej do`,
    expected: {
      currency: "INR",
      itemCount: 2,
      total: 20000,
      client_email: "rahul.verma@gmail.com",
      due_in_days: 7,
      missing: [],
    },
  },
  {
    id: "consulting-no-email",
    label: "Note: hourly consulting, no email",
    text: `Invoice Sarah from Northwind for 10 hours of consulting at $120/hr, due in 2 weeks. Her email is on their website somewhere.`,
    expected: {
      currency: "USD",
      itemCount: 1,
      total: 1200,
      client_email: null,
      due_in_days: 14,
      missing: ["client_email"],
    },
  },
  {
    id: "too-vague",
    label: "Too vague (nothing to invent)",
    text: `hey can u invoice the client for last week's work? same as usual`,
    expected: {
      currency: "USD",
      itemCount: 0,
      client_email: null,
      due_in_days: null,
      missing: ["client_name", "client_email", "currency", "items", "due_in_days"],
    },
  },
];
