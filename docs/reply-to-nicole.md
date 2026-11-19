# Reply to Nicole

**Subject:** Your Mindset MOT ideas, built out so you can click through them

---

Hi Nicole,

Thanks for saying yes. Rather than send the ideas as a document, we built them into a working preview using your own words, photos and credentials, so you can see how they'd feel to someone arriving at your site:

**[PREVIEW LINK]**

Your site already has the right ingredients: your story, the Mindset MOT, and lovely words from Phil and Damian. Most of these ideas are about making the Mindset MOT the obvious first step, and cutting the clicks between "this sounds like me" and a booked call.

**The Mindset MOT and booking path**

1. **The Mindset MOT gets its own page.** Right now it's a paragraph on Work With Me. In the preview it has a page that shows what happens in the hour, who it's for and what people leave with. Fewer "what is this exactly?" doubts before someone books.

2. **Your TidyCal calendar sits inside your site.** Visitors pick a time without leaving your website. It's your existing TidyCal page, so nothing changes in how you manage your diary. Every "Book" button on the site leads there.

3. **A 60-second self-check before the MOT.** Six quick questions on perfectionism, people pleasing, procrastination, overthinking, the inner critic and switching off. Visitors get an instant "inspection report" and can send it to you, so you walk into the MOT already knowing what's going on.

4. **An enquiry form that sorts enquiries for you.** For people who aren't ready to book: four quick taps (what's on their mind, Zoom, London or walk and talk, timing, contact details). Each enquiry arrives with their answers, whether they're ready now or just exploring, and their self-check results if they took it.

**Around the rest of the site**

5. **A homepage that says who you help within seconds.** "Ditch the doubt" (the last word rotates through overwhelm, overthinking and perfectionism), your photo, your PCC, EMCC and hypnotherapy credentials, and the MOT button.

6. **"Turn down the critic."** A slider that lets visitors turn the critic's voice down and their inner cheerleader's up ("You don't have to be perfect to be amazing"). It shows what working with you feels like, instead of just describing it.

7. **Coaching and hypnotherapy, explained visually.** An iceberg shows what coaching works with and what hypnotherapy reaches, and your packages sit side by side with the ways you work (Zoom, London, walk and talk).

8. **A page for coaches and organisations.** Your EMCC supervision, associate work, and talks and workshops, with Warwick Business School and your other past clients.

9. **Your story, your testimonials, and the fun stuff.** Phil's and Damian's full words on their own page, and an About page with your journey, your qualifications and ten fun facts (yes, including Mary Berry and the cake).

It works on phones, tablets and desktop. It can sit on your current domain, and it doesn't change how you take bookings today.

Would you be up for a 15-minute call this week? I'd love to walk you through it and hear what you'd change.

Best,
Bhavansh Arora
Code Bunny

---

### Before sending: check with Nicole (or adjust on the site)

- **Packages.** The coaching page uses the three packages from an older section of her site (Rock Solid Self-Belief, 12 months; Coaching + hypnotherapy, 6 months; Coaching, 6 months). Prices are deliberately left off; the old ones were £3,750 and £1,500. Confirm what's current.
- **Inside the hour.** The Mindset MOT breakdown (about 10, 20, 20 and 10 minutes) is our reading of her own description. Adjust in `_src/pages/mindset-mot.html`.
- **Reply time.** The site promises a reply "within one working day". Change `replyPromise` in `assets/js/config.js` and the "Quick replies" card on the contact page if that's not right.
- **Drafted copy to confirm:** the FAQ answers (hypnotherapy, DISC, coaching vs therapy), the six talk themes on the supervision page, and the "Turn down the critic" lines on the homepage.
- **Photo captions** are kept general ("Awards night", "Panel discussion", "Certified hypnotherapist").
- **Enquiries.** Add a form endpoint (`formEndpoint` in `assets/js/config.js`, e.g. Formspree or a Make/Zapier webhook) for an automatic confirmation email and a CRM or sheet entry. Until then, enquiries open a pre-filled email to nicole@nicolefreeman.co.uk.
