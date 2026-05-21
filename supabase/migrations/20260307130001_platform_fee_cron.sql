-- ══════════════════════════════════════════════════
-- Monthly platform fee cron (Rs 1,500 + 18% GST)
-- Runs on the 1st of every month at 00:00 UTC
-- ══════════════════════════════════════════════════

-- Function to charge monthly platform fee to all orgs
create or replace function charge_monthly_platform_fee()
returns void as $$
declare
  _wallet record;
  _new_balance numeric;
  _fee numeric := 1500;
  _gst numeric := 270; -- 18% of 1500
  _month text;
begin
  _month := to_char(now(), 'YYYY-MM');

  for _wallet in select org_id from org_wallets loop
    -- Skip if already charged this month (idempotent)
    if exists (
      select 1 from wallet_transactions
      where org_id = _wallet.org_id
      and reference_id = 'platform_fee_' || _month
    ) then
      continue;
    end if;

    -- Debit platform fee (force debit even if balance goes negative)
    update org_wallets
      set balance = balance - _fee,
          total_debited = total_debited + _fee,
          updated_at = now()
      where org_id = _wallet.org_id
      returning balance into _new_balance;

    insert into wallet_transactions (org_id, type, category, amount, balance_after, description, reference_id)
    values (_wallet.org_id, 'debit', 'platform_fee', _fee, _new_balance,
            'Monthly platform fee - ' || _month, 'platform_fee_' || _month);

    -- Debit GST on platform fee
    update org_wallets
      set balance = balance - _gst,
          total_debited = total_debited + _gst,
          updated_at = now()
      where org_id = _wallet.org_id
      returning balance into _new_balance;

    insert into wallet_transactions (org_id, type, category, amount, balance_after, description, reference_id)
    values (_wallet.org_id, 'debit', 'gst', _gst, _new_balance,
            'GST on platform fee - ' || _month, 'platform_fee_gst_' || _month);
  end loop;
end;
$$ language plpgsql security definer;

-- Enable pg_cron extension
create extension if not exists pg_cron;

-- Schedule: 1st of every month at midnight UTC
select cron.schedule(
  'monthly-platform-fee',
  '0 0 1 * *',
  $$select charge_monthly_platform_fee()$$
);
