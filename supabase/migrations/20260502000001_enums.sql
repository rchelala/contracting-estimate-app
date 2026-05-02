CREATE TYPE estimate_status AS ENUM (
  'draft',
  'sent',
  'approved',
  'rejected',
  'expired',
  'invoiced'
);

CREATE TYPE invoice_status AS ENUM (
  'draft',
  'sent',
  'paid',
  'void'
);

CREATE TYPE line_item_source AS ENUM (
  'ai',
  'contractor'
);

CREATE TYPE member_role AS ENUM (
  'owner',
  'member'
);

CREATE TYPE ai_call_type AS ENUM (
  'draft_estimate',
  'analyze_photo'
);

CREATE TYPE payment_request_type AS ENUM (
  'deposit',
  'full'
);
