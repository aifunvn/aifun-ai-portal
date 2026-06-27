-- Restore 3 builders missing from Sprint 11 seed
-- Root cause: 003_sprint11_marketplace.sql only seeded 5 of 8 builders.
-- Content Factory, CRM AI Assistant, and Webinar Builder were never inserted
-- into marketplace_items, making it impossible to install or display them in V4.

INSERT INTO marketplace_items (id, name, description, category, plan, icon, is_featured) VALUES
  ('content-builder',  'Content Factory',    'Bien 1 y tuong thanh noi dung da kenh: Facebook, TikTok, Email, Zalo, YouTube', 'Marketing',  'starter', 'sparkle', false),
  ('crm-builder',      'CRM AI Assistant',   'Phan tich lead, cham diem, de xuat buoc tiep theo toi uu ty le chot sale',       'Kinh doanh', 'pro',     'sparkle', false),
  ('webinar-builder',  'Webinar Builder',    'Thiet ke webinar ban hang A-Z: kich ban, slide, CTA, email follow-up',            'Giao duc',   'pro',     'sparkle', false)
ON CONFLICT (id) DO NOTHING;
