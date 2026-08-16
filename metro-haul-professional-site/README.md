# Metro Haul Professional Website

Production-ready static starter for Metro Haul Moving & Junk Removal.

## Included
- Black/red responsive design
- Homepage
- Quote intake page
- Service hub + 4 service pages
- Service area hub + 8 city landing pages
- MovingCompany / Service structured data
- robots.txt and sitemap.xml
- Supabase-ready quote form
- Supabase schema with RLS and public INSERT-only lead policy

## Supabase connection
1. Create a dedicated Metro Haul Supabase project.
2. Run `supabase/schema.sql` in the project.
3. Copy the Project URL and **publishable** key into `assets/supabase.js`.
4. Do not put secret/service-role keys in browser files.
5. Test one quote and confirm it appears in `public.leads`.

## Before going live
- Confirm legal/business contact details.
- Add verified Google reviews only.
- Add real project photos and truck/crew photos.
- Add privacy policy, terms, licensing/insurance details as applicable.
- Connect Search Console and submit sitemap.
- Add analytics and conversion tracking.
