-- =========================================================
-- Burn Industry Pocket — Seed data
-- Run once after migrations, on a fresh project.
-- Creates the two orgs and a standard chart of accounts for each.
-- =========================================================

insert into orgs (name, legal_name, entity_type) values
  ('Burn Industry', 'Burn Industry Inc.', 'corporation'),
  ('The OBGMs', 'The OBGMs Inc.', 'corporation');

-- Apply the same starter chart of accounts to both orgs
do $$
declare
  org record;
  coa record;
  starter_accounts jsonb := '[
    {"code":"1000","name":"Cash - Checking","type":"asset","normal_balance":"debit"},
    {"code":"1010","name":"Cash - Savings","type":"asset","normal_balance":"debit"},
    {"code":"1020","name":"Cash - PayPal/Stripe","type":"asset","normal_balance":"debit"},
    {"code":"1030","name":"Petty Cash","type":"asset","normal_balance":"debit"},
    {"code":"1100","name":"Accounts Receivable","type":"asset","normal_balance":"debit"},
    {"code":"1200","name":"Due from Other Org","type":"asset","normal_balance":"debit"},
    {"code":"1300","name":"Equipment","type":"asset","normal_balance":"debit"},
    {"code":"1310","name":"Vehicles","type":"asset","normal_balance":"debit"},
    {"code":"1400","name":"Prepaid Expenses","type":"asset","normal_balance":"debit"},
    {"code":"2000","name":"Accounts Payable","type":"liability","normal_balance":"credit"},
    {"code":"2100","name":"Due to Other Org","type":"liability","normal_balance":"credit"},
    {"code":"2200","name":"Loans Payable","type":"liability","normal_balance":"credit"},
    {"code":"2300","name":"Due to/from Shareholder (Densil)","type":"liability","normal_balance":"credit"},
    {"code":"2400","name":"GST/HST Payable","type":"liability","normal_balance":"credit"},
    {"code":"2410","name":"GST/HST Recoverable (ITCs)","type":"asset","normal_balance":"debit"},
    {"code":"2500","name":"Credit Card Payable","type":"liability","normal_balance":"credit"},
    {"code":"3000","name":"Common Shares","type":"equity","normal_balance":"credit"},
    {"code":"3100","name":"Retained Earnings","type":"equity","normal_balance":"credit"},
    {"code":"3200","name":"Shareholder Draws","type":"equity","normal_balance":"debit"},
    {"code":"4000","name":"Show Guarantees","type":"income","normal_balance":"credit"},
    {"code":"4010","name":"Door/Ticket Splits","type":"income","normal_balance":"credit"},
    {"code":"4020","name":"Merch Sales","type":"income","normal_balance":"credit"},
    {"code":"4030","name":"Streaming Royalties","type":"income","normal_balance":"credit"},
    {"code":"4040","name":"Sync/Licensing","type":"income","normal_balance":"credit"},
    {"code":"4050","name":"Other Income","type":"income","normal_balance":"credit"},
    {"code":"5000","name":"Merch Production Cost","type":"cogs","normal_balance":"debit"},
    {"code":"6000","name":"Booking/Agent Fees","type":"expense","normal_balance":"debit"},
    {"code":"6010","name":"Management Fees","type":"expense","normal_balance":"debit"},
    {"code":"6020","name":"Travel - Fuel","type":"expense","normal_balance":"debit"},
    {"code":"6030","name":"Travel - Vehicle Maintenance","type":"expense","normal_balance":"debit"},
    {"code":"6040","name":"Lodging","type":"expense","normal_balance":"debit"},
    {"code":"6050","name":"Per Diems/Food","type":"expense","normal_balance":"debit"},
    {"code":"6060","name":"Equipment & Gear","type":"expense","normal_balance":"debit"},
    {"code":"6070","name":"Equipment Repair","type":"expense","normal_balance":"debit"},
    {"code":"6080","name":"Marketing/Promo","type":"expense","normal_balance":"debit"},
    {"code":"6090","name":"Professional Fees","type":"expense","normal_balance":"debit"},
    {"code":"6100","name":"Studio/Recording","type":"expense","normal_balance":"debit"},
    {"code":"6110","name":"Software/Subscriptions","type":"expense","normal_balance":"debit"},
    {"code":"6120","name":"Insurance","type":"expense","normal_balance":"debit"},
    {"code":"6130","name":"Bank/Processing Fees","type":"expense","normal_balance":"debit"},
    {"code":"6140","name":"Interest Expense","type":"expense","normal_balance":"debit"}
  ]'::jsonb;
begin
  for org in select id from orgs loop
    for coa in select * from jsonb_to_recordset(starter_accounts) as x(code text, name text, type text, normal_balance text) loop
      insert into chart_of_accounts (org_id, code, name, type, normal_balance)
      values (org.id, coa.code, coa.name, coa.type::account_type, coa.normal_balance::normal_balance_type);
    end loop;
  end loop;
end $$;
