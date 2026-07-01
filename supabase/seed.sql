-- ============================================================================
-- Seed data for Luxe Nail Bar (Fishers, IN) — realistic starter content.
-- Run after schema.sql.
-- ============================================================================

insert into salon_profile (name, address, phone, email, parking_info, google_review_link, google_map_link, instagram_link, facebook_link)
values (
  'Luxe Nail Bar',
  '8970 E 96TH ST FISHERS IN 46037',
  '(317) 555-0182',
  'hello@luxenailbar.com',
  'Free parking is available directly in front of the salon and throughout the shared plaza lot.',
  'https://g.page/r/luxenailbar/review',
  'https://maps.google.com/?q=8970+E+96th+St+Fishers+IN+46037',
  'https://instagram.com/luxenailbar',
  'https://facebook.com/luxenailbar'
)
on conflict do nothing;

insert into business_hours (day_of_week, open_time, close_time, is_closed) values
  (0, '11:00', '17:00', false), -- Sunday
  (1, '09:30', '19:00', false), -- Monday
  (2, '09:30', '19:00', false), -- Tuesday
  (3, '09:30', '19:00', false), -- Wednesday
  (4, '09:30', '19:00', false), -- Thursday
  (5, '09:30', '19:00', false), -- Friday
  (6, '09:30', '18:00', false)  -- Saturday
on conflict (day_of_week) do nothing;

insert into service_categories (name, display_order) values
  ('Manicure', 1),
  ('Pedicure', 2),
  ('Enhancements', 3),
  ('Add-Ons', 4)
on conflict do nothing;

-- Services (pricing stored in cents)
insert into services (category_id, name, description, price_cents, price_label, duration_minutes, display_order)
select id, 'Classic Manicure', 'Shape, cuticle care, massage, and polish of your choice.', 2500, null, 30, 1 from service_categories where name = 'Manicure'
union all
select id, 'Gel Manicure', 'Long-lasting gel polish with our signature spa treatment.', 4000, null, 40, 2 from service_categories where name = 'Manicure'
union all
select id, 'Classic Pedicure', 'Soak, exfoliation, massage, and polish for tired feet.', 3500, null, 40, 1 from service_categories where name = 'Pedicure'
union all
select id, 'Deluxe Spa Pedicure', 'Extended massage, hot stone therapy, and premium mask.', 5500, null, 55, 2 from service_categories where name = 'Pedicure'
union all
select id, 'Gel X Full Set', 'Durable, lightweight gel extension full set, natural finish.', 6500, 'starts at $65', 75, 1 from service_categories where name = 'Enhancements'
union all
select id, 'Acrylic Full Set', 'Classic acrylic extensions, sculpted to your preferred shape.', 6000, 'starts at $60', 75, 2 from service_categories where name = 'Enhancements'
union all
select id, 'Dip Powder', 'Chip-resistant dip powder color, no UV lamp needed.', 4500, null, 45, 3 from service_categories where name = 'Enhancements'
union all
select id, 'Nail Art (per nail)', 'Custom hand-painted or 3D nail art design.', 500, 'starts at $5/nail', 10, 1 from service_categories where name = 'Add-Ons'
union all
select id, 'Paraffin Wax Treatment', 'Deep moisturizing paraffin dip for hands or feet.', 1000, null, 15, 2 from service_categories where name = 'Add-Ons'
on conflict do nothing;

insert into staff (full_name, title, bio, display_order) values
  ('Mai Nguyen', 'Owner & Master Technician', '15+ years of experience specializing in Gel X and nail art.', 1),
  ('Linh Tran', 'Senior Nail Technician', 'Acrylic and dip powder specialist known for flawless shaping.', 2),
  ('Kim Pham', 'Nail Technician', 'Loved for relaxing pedicures and precise gel application.', 3),
  ('Anna Le', 'Nail Technician', 'Nail art specialist with a passion for detailed hand-painted designs.', 4)
on conflict do nothing;

insert into salon_policies (title, content, display_order) values
  ('Cancellation Policy', 'We kindly ask for at least 24 hours notice for cancellations or rescheduling. Late cancellations or no-shows may be subject to a fee.', 1),
  ('Late Arrival', 'Please arrive on time. Arrivals more than 15 minutes late may need to be rescheduled to ensure quality service for all guests.', 2),
  ('Payment', 'We accept cash, all major credit cards, and mobile payment (Apple Pay, Google Pay). Gratuity is not included in listed prices.', 3),
  ('Children Policy', 'We love welcoming families, but for safety we ask that children not receiving services be supervised at all times.', 4)
on conflict do nothing;

insert into faqs (question, answer, display_order) values
  ('Do you accept walk-ins?', 'Yes! Walk-ins are welcome depending on technician availability. Booking ahead is recommended for guaranteed times.', 1),
  ('Do I need to bring anything?', 'Just yourself! We provide everything needed for your service. Feel free to bring reference photos for nail art.', 2),
  ('Can I bring my kids?', 'Absolutely, we are a family-friendly salon. Children not receiving a service should be supervised at all times.', 3),
  ('Do you offer gift cards?', 'Yes, gift cards are available for purchase in-salon and make a great gift for any occasion.', 4),
  ('Is parking available?', 'Yes, free parking is available directly in front of the salon and in the shared plaza lot.', 5)
on conflict do nothing;

insert into promotions (title, description, starts_at, ends_at, is_active) values
  ('New Client Special', '$10 off any full set for first-time guests. Mention this offer when booking.', current_date, current_date + interval '90 days', true),
  ('Refer a Friend', 'Refer a friend and you both receive $5 off your next visit.', current_date, null, true)
on conflict do nothing;

insert into ai_knowledge (topic, content) values
  ('greeting_style', 'Greet guests warmly and professionally, like a friendly front-desk receptionist at a high-end salon. Keep responses short, clear, and helpful.'),
  ('booking_flow', 'When a customer wants to book, ask for: desired service, preferred date/time, name, and phone number. Then direct them to the online booking page or confirm you will pass details to the front desk.'),
  ('tone', 'Warm, upscale, concise. Avoid emojis except a single checkmark or star when celebrating a booking. Never be pushy.'),
  ('multilingual', 'If the guest writes in Vietnamese, respond fluently in Vietnamese. Otherwise respond in English unless asked to switch language.')
on conflict do nothing;
