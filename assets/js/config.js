/* ==========================================================================
   Site configuration: the one file to edit to connect bookings and enquiries.
   Leave a value empty and the site falls back gracefully.
   ========================================================================== */
window.SITE_CONFIG = {
  name: "Nicole Freeman Coaching",
  phone: "+44 7976 268 520",
  phoneHref: "tel:+447976268520",
  whatsapp: "https://wa.me/447976268520",
  email: "nicole@nicolefreeman.co.uk",

  /* Nicole's TidyCal booking page for the complimentary Mindset MOT. */
  bookingUrl: "https://tidycal.com/nicolefreeman/mindset-mot",
  bookingPath: "nicolefreeman/mindset-mot",

  /* true  = "Book" buttons go to the Mindset MOT page, where the TidyCal
             calendar is embedded (visitors book without leaving the site).
     false = "Book" buttons open TidyCal directly in a new tab. */
  embedBooking: true,

  /* Endpoint that accepts a JSON POST (Formspree, Make.com / Zapier webhook,
     Basin …). This is where the automation starts: auto-reply, CRM or sheet
     entry, reminders. When empty, enquiries open a pre-filled email instead. */
  formEndpoint: "",

  /* Shown to visitors after they send an enquiry. */
  replyPromise: "within one working day"
};
