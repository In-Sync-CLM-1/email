-- ══════════════════════════════════════════════════
-- 1. Fix transition_campaign_status: use integer for ROW_COUNT
-- ══════════════════════════════════════════════════
create or replace function transition_campaign_status(
  _campaign_id uuid,
  _from_status text,
  _to_status text
) returns boolean as $$
declare
  _rows int;
begin
  update campaigns
    set status = _to_status, updated_at = now()
    where id = _campaign_id and status = _from_status;

  get diagnostics _rows = row_count;
  return _rows > 0;
end;
$$ language plpgsql security definer;

-- ══════════════════════════════════════════════════
-- 2. Give every new organization ₹100 free test balance
-- ══════════════════════════════════════════════════
create or replace function create_org_wallet()
returns trigger as $$
begin
  insert into org_wallets (org_id, balance, total_credited)
  values (new.id, 100.00, 100.00)
  on conflict do nothing;

  -- Log the welcome credit as a wallet transaction
  insert into wallet_transactions (org_id, type, category, amount, balance_after, description)
  values (new.id, 'credit', 'topup', 100.00, 100.00, 'Welcome bonus – free test balance');

  return new;
end;
$$ language plpgsql security definer;
