const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in your environment to run this script.\nSet them in .env.local pointing to your development/test Supabase project.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log('Starting manual sync test...');

  // 1. Find a funding source linked to a debt
  const { data: sources } = await supabase
    .from('funding_sources')
    .select('*')
    .not('linked_debt_id', 'is', null)
    .limit(1);

  if (!sources || sources.length === 0) {
    console.log('No linked funding source found. Aborting test.');
    return;
  }

  const src = sources[0];
  console.log('Found linked funding source:', src.id, 'linked_debt_id=', src.linked_debt_id);

  // Read linked debt
  const { data: debtRows } = await supabase
    .from('debts')
    .select('*')
    .eq('id', src.linked_debt_id)
    .limit(1);

  const debt = (debtRows && debtRows[0]) || null;
  if (!debt) {
    console.log('Linked debt not found. Aborting.');
    return;
  }

  console.log('Original balances -> funding_source.current_balance=', src.current_balance, ', debt.balance=', debt.balance, ', credit_limit=', src.credit_limit);

  // 2. Edit funding source: set current_balance to debt.balance + 100 (simulate user edit)
  const newBalance = Number(debt.balance || 0) + 100;
  const { error: updErr } = await supabase
    .from('funding_sources')
    .update({ current_balance: newBalance })
    .eq('id', src.id);

  if (updErr) {
    console.error('Failed to update funding source:', updErr);
    return;
  }

  // Propagate to debt as the client does
  const { error: debtUpdErr } = await supabase
    .from('debts')
    .update({ balance: newBalance })
    .eq('id', debt.id);

  if (debtUpdErr) {
    console.error('Failed to update linked debt:', debtUpdErr);
    return;
  }

  console.log('Updated funding source and propagated to debt.');

  // 3. Confirm linked debt balance updates
  const { data: postDebt } = await supabase.from('debts').select('*').eq('id', debt.id).limit(1);
  const updatedDebt = postDebt && postDebt[0];
  console.log('Post-update debt.balance=', updatedDebt.balance);

  // 4. Record a debt payment of 50
  const paymentAmount = 50;
  const today = new Date().toISOString().slice(0,10);
  const cycle_due_date = today; // simplified

  const { error: insErr } = await supabase.from('debt_payments').insert({
    user_id: debt.user_id || null,
    debt_id: debt.id,
    amount: paymentAmount,
    payment_date: today,
    cycle_due_date,
    funding_source_id: src.id,
  });

  if (insErr) {
    console.error('Failed to insert debt payment:', insErr);
    return;
  }

  // Update debt balance
  const newDebtBalance = Math.max(Number(updatedDebt.balance || 0) - paymentAmount, 0);
  await supabase.from('debts').update({ balance: newDebtBalance }).eq('id', debt.id);

  // Sync linked funding_sources (as client does)
  const creditLimit = Number(src.credit_limit || 0);
  const newAvail = creditLimit ? Math.max(creditLimit - newDebtBalance, 0) : null;

  await supabase.from('funding_sources').update({ current_balance: newDebtBalance, available_credit: newAvail }).eq('id', src.id);

  console.log('Recorded payment and synced funding source.');

  // 6/7. Refresh (re-read) and confirm persistence
  const { data: finalSrcRows } = await supabase.from('funding_sources').select('*').eq('id', src.id).limit(1);
  const finalSrc = finalSrcRows && finalSrcRows[0];
  const { data: finalDebtRows } = await supabase.from('debts').select('*').eq('id', debt.id).limit(1);
  const finalDebt = finalDebtRows && finalDebtRows[0];

  console.log('Final funding source current_balance=', finalSrc.current_balance, ', available_credit=', finalSrc.available_credit);
  console.log('Final debt balance=', finalDebt.balance);

  // 8. Confirm available credit recalculates correctly
  const expectedAvail = Number(finalSrc.credit_limit || 0) ? Math.max(Number(finalSrc.credit_limit || 0) - Number(finalSrc.current_balance || 0), 0) : null;
  console.log('Expected available_credit=', expectedAvail);

  if (expectedAvail === null) {
    console.log('No credit limit; available_credit should be null or unset.');
  } else {
    console.log('available_credit matches expectation?', expectedAvail === Number(finalSrc.available_credit));
  }

  console.log('Manual sync test completed.');
}

run().catch((e)=>{console.error('Test script error', e); process.exit(1);});
