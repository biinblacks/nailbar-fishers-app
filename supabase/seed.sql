-- ============================================================================
-- Seed data for the demo salon "Nail Bar" (Fishers, IN).
-- Run after schema.sql AND migrations/0001_multi_tenant_salons.sql.
-- Safe to re-run: every insert is keyed on (salon_id, <natural key>).
-- ============================================================================

do $$
declare
  s uuid;
  cat_manicure uuid;
  cat_pedicure uuid;
  cat_enh uuid;
  cat_addon uuid;
begin
  -- Tenant -------------------------------------------------------------------
  insert into salons (slug, name, address, phone, email, parking_info, google_review_link, google_map_link, instagram_link, facebook_link)
  values (
    'nail-bar',
    'Nail Bar',
    '8970 E 96TH ST FISHERS IN 46037',
    '(317) 555-0182',
    'hello@nailbar.com',
    'Free parking is available directly in front of the salon and throughout the shared plaza lot.',
    'https://g.page/r/nailbar/review',
    'https://maps.google.com/?q=8970+E+96th+St+Fishers+IN+46037',
    'https://instagram.com/nailbar',
    'https://facebook.com/nailbar'
  )
  on conflict (slug) do nothing;

  select id into s from salons where slug = 'nail-bar';

  -- Legacy single-row profile (kept for the Vite storefront) ----------------
  if not exists (select 1 from salon_profile where salon_id = s) then
    insert into salon_profile (salon_id, name, address, phone, email, parking_info, google_review_link, google_map_link, instagram_link, facebook_link)
    select id, name, coalesce(address, ''), coalesce(phone, ''), coalesce(email, ''), parking_info, google_review_link, google_map_link, instagram_link, facebook_link
    from salons where id = s;
  end if;

  -- Hours --------------------------------------------------------------------
  insert into business_hours (salon_id, day_of_week, open_time, close_time, is_closed) values
    (s, 0, '11:00', '17:00', false),
    (s, 1, '09:30', '19:00', false),
    (s, 2, '09:30', '19:00', false),
    (s, 3, '09:30', '19:00', false),
    (s, 4, '09:30', '19:00', false),
    (s, 5, '09:30', '19:00', false),
    (s, 6, '09:30', '18:00', false)
  on conflict (salon_id, day_of_week) do nothing;

  -- Categories ---------------------------------------------------------------
  insert into service_categories (salon_id, name, display_order) values
    (s, 'Manicure', 1), (s, 'Pedicure', 2), (s, 'Enhancements', 3), (s, 'Add-Ons', 4)
  on conflict (salon_id, name) do nothing;

  select id into cat_manicure from service_categories where salon_id = s and name = 'Manicure';
  select id into cat_pedicure from service_categories where salon_id = s and name = 'Pedicure';
  select id into cat_enh      from service_categories where salon_id = s and name = 'Enhancements';
  select id into cat_addon    from service_categories where salon_id = s and name = 'Add-Ons';

  -- Services (prices in cents) ----------------------------------------------
  insert into services (salon_id, category_id, name, description, price_cents, price_label, duration_minutes, display_order) values
    (s, cat_manicure, 'Classic Manicure', 'Shape, cuticle care, massage, and polish of your choice.', 2500, null, 30, 1),
    (s, cat_manicure, 'Gel Manicure', 'Long-lasting gel polish with our signature spa treatment.', 4000, null, 40, 2),
    (s, cat_pedicure, 'Classic Pedicure', 'Soak, exfoliation, massage, and polish for tired feet.', 3500, null, 40, 1),
    (s, cat_pedicure, 'Deluxe Spa Pedicure', 'Extended massage, hot stone therapy, and premium mask.', 5500, null, 55, 2),
    (s, cat_enh, 'Gel X Full Set', 'Durable, lightweight gel extension full set, natural finish.', 6500, 'starts at $65', 75, 1),
    (s, cat_enh, 'Acrylic Full Set', 'Classic acrylic extensions, sculpted to your preferred shape.', 6000, 'starts at $60', 75, 2),
    (s, cat_enh, 'Dip Powder', 'Chip-resistant dip powder color, no UV lamp needed.', 4500, null, 45, 3),
    (s, cat_addon, 'Nail Art (per nail)', 'Custom hand-painted or 3D nail art design.', 500, 'starts at $5/nail', 10, 1),
    (s, cat_addon, 'Paraffin Wax Treatment', 'Deep moisturizing paraffin dip for hands or feet.', 1000, null, 15, 2)
  on conflict (salon_id, name) do nothing;

  -- Staff --------------------------------------------------------------------
  insert into staff (salon_id, full_name, title, bio, display_order, color) values
    (s, 'Mai Nguyen', 'Owner & Master Technician', '15+ years of experience specializing in Gel X and nail art.', 1, '#ec4d7d'),
    (s, 'Linh Tran', 'Senior Nail Technician', 'Acrylic and dip powder specialist known for flawless shaping.', 2, '#d9a533'),
    (s, 'Kim Pham', 'Nail Technician', 'Loved for relaxing pedicures and precise gel application.', 3, '#6366f1'),
    (s, 'Anna Le', 'Nail Technician', 'Nail art specialist with a passion for detailed hand-painted designs.', 4, '#10b981')
  on conflict (salon_id, full_name) do nothing;

  -- Policies -----------------------------------------------------------------
  insert into salon_policies (salon_id, title, content, display_order) values
    (s, 'Cancellation Policy', 'We kindly ask for at least 24 hours notice for cancellations or rescheduling. Late cancellations or no-shows may be subject to a fee.', 1),
    (s, 'Late Arrival', 'Please arrive on time. Arrivals more than 15 minutes late may need to be rescheduled to ensure quality service for all guests.', 2),
    (s, 'Payment', 'We accept cash, all major credit cards, and mobile payment (Apple Pay, Google Pay). Gratuity is not included in listed prices.', 3),
    (s, 'Children Policy', 'We love welcoming families, but for safety we ask that children not receiving services be supervised at all times.', 4)
  on conflict (salon_id, title) do nothing;

  -- FAQs ---------------------------------------------------------------------
  insert into faqs (salon_id, question, answer, display_order) values
    (s, 'Do you accept walk-ins?', 'Yes! Walk-ins are welcome depending on technician availability. Booking ahead is recommended for guaranteed times.', 1),
    (s, 'Do I need to bring anything?', 'Just yourself! We provide everything needed for your service. Feel free to bring reference photos for nail art.', 2),
    (s, 'Can I bring my kids?', 'Absolutely, we are a family-friendly salon. Children not receiving a service should be supervised at all times.', 3),
    (s, 'Do you offer gift cards?', 'Yes, gift cards are available for purchase in-salon and make a great gift for any occasion.', 4),
    (s, 'Is parking available?', 'Yes, free parking is available directly in front of the salon and in the shared plaza lot.', 5)
  on conflict (salon_id, question) do nothing;

  -- Promotions ---------------------------------------------------------------
  insert into promotions (salon_id, title, description, starts_at, ends_at, is_active) values
    (s, 'New Client Special', '$10 off any full set for first-time guests. Mention this offer when booking.', current_date, current_date + interval '90 days', true),
    (s, 'Refer a Friend', 'Refer a friend and you both receive $5 off your next visit.', current_date, null, true)
  on conflict (salon_id, title) do nothing;

  -- AI guidance --------------------------------------------------------------
  insert into ai_knowledge (salon_id, topic, content) values
    (s, 'greeting_style', 'Greet guests warmly and professionally, like a friendly front-desk receptionist at a high-end salon. Keep responses short, clear, and helpful.'),
    (s, 'booking_flow', 'When a customer wants to book, ask for: desired service, preferred date/time, name, and phone number. Then direct them to the online booking page or confirm you will pass details to the front desk.'),
    (s, 'tone', 'Warm, upscale, concise. Avoid emojis except a single checkmark or star when celebrating a booking. Never be pushy.'),
    (s, 'multilingual', 'If the guest writes in Vietnamese, respond fluently in Vietnamese. Otherwise respond in English unless asked to switch language.')
  on conflict (salon_id, topic) do nothing;
end $$;
