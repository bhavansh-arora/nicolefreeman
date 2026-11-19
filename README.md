# Nicole Freeman Coaching website (preview)

A multi-page static site for Nicole Freeman, mindset coach (PCC) and clinical hypnotherapist, London and Zoom. No framework: it runs on any static host (GitHub Pages, Netlify, Vercel, cPanel).

## Pages
| Page | File |
| --- | --- |
| Home: hero, "turn down the critic" fader, method iceberg, ways to work, Mindset MOT, testimonials | `index.html` |
| About: story, career, qualifications, fun-facts deck, photos | `about.html` |
| 1:1 coaching & hypnotherapy: conscious + subconscious, packages, formats, process, FAQ | `coaching.html` |
| Mindset MOT: 60-second self-check with report, the hour on a dial, embedded TidyCal booking | `mindset-mot.html` |
| Supervision & teams: EMCC supervision, past clients, talk themes | `supervision.html` |
| Kind words: full testimonials, highlights, outcomes | `kind-words.html` |
| Contact: booking, phone, WhatsApp, email, 4-step enquiry | `contact.html` |
| Not found | `404.html` |

## Editing
The HTML pages in this folder are **generated**. Edit the source, then rebuild:

```bash
python3 _src/build.py
```

- `_src/pages/*.html`: the body of each page (the meta block at the top sets the title and description)
- `_src/partials/*.html`: layout, header, footer, final call to action
- `assets/css/main.css`: design tokens at the top (colours, type scale, spacing), then components and breakpoints
- `assets/js/site.js`: menu, header, page transitions, hero rotator, fader, self-check, enquiry form, deck, dial, TidyCal embed
- `assets/js/motion.js`: GSAP, ScrollTrigger and Lenis animations (respects `prefers-reduced-motion`)
- `_src/og/og.html`: the link-preview image (`assets/img/og-nicole-freeman.jpg`)

## Bookings and enquiries
Everything is in **`assets/js/config.js`**:

- `bookingUrl` / `bookingPath`: Nicole's TidyCal Mindset MOT page.
- `embedBooking`: `true` sends every "Book" button to the Mindset MOT page, where the TidyCal calendar is embedded; `false` opens TidyCal directly.
- `formEndpoint`: any URL that accepts a JSON POST (Formspree, Make.com or Zapier webhook). Each enquiry includes topics, format, timing (ready now / next month or two / exploring), contact details and the self-check summary. When empty, the enquiry opens a pre-filled email.
- `replyPromise`: the response time shown after an enquiry.

## Preview locally
```bash
python3 -m http.server 8080
```
Then open http://localhost:8080.

## Credits
Photos and testimonials: Nicole Freeman (nicolefreeman.co.uk). Fonts: Schibsted Grotesk, Fraunces and Geist Mono (SIL Open Font License), self-hosted.
