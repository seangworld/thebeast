const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in your environment to run this script.\nSet them in .env.local pointing to your development/test Supabase project.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log('Starting safe manual sync test...');

  // pick a funding source and a debt
  const { data: sources } = await supabase.from('funding_sources').select('*').limit(1);
  const { data: debts } = await supabase.from('debts').select('*').limit(1);

  if (!sources || sources.length === 0) {
    console.log('No funding_sources present. Aborting.');
    return;
  }
  if (!debts || debts.length === 0) {
    console.log('No debts present. Aborting.');
    return;
  }

  const src = sources[0];
  const debt = debts[0];

  console.log('Using funding_source', src.id, 'and debt', debt.id);

  const originalSrc = { ...src };
  const originalDebt = { ...debt };

  let linkedWasSet = false;
  try {
    // If funding source not linked, temporarily link it
    if (!src.linked_debt_id) {
      const { error: linkErr } = await supabase.from('funding_sources').update({ linked_debt_id: debt.id }).eq('id', src.id);
      if (linkErr) throw linkErr;
      linkedWasSet = true;
      console.log('Temporarily linked funding_source -> debt');
    } else {
      console.log('Funding source already linked to', src.linked_debt_id);
    }

    // Re-read current state
    const { data: srcAfterLinkRows } = await supabase.from('funding_sources').select('*').eq('id', src.id).limit(1);
    const srcAfterLink = srcAfterLinkRows[0];
    const { data: debtAfterRows } = await supabase.from('debts').select('*').eq('id', debt.id).limit(1);
    const debtAfter = debtAfterRows[0];

    console.log('Original balances -> funding_source.current_balance=', srcAfterLink.current_balance, ', debt.balance=', debtAfter.balance, ', credit_limit=', srcAfterLink.credit_limit);

    // 1-3: Edit funding source to debt.balance + 100 and verify debt update
    const newBalance = Number(debtAfter.balance || 0) + 100;
    await supabase.from('funding_sources').update({ current_balance: newBalance }).eq('id', src.id);
    // simulate client propagation
    await supabase.from('debts').update({ balance: newBalance }).eq('id', debt.id);

    const { data: postDebtRows } = await supabase.from('debts').select('*').eq('id', debt.id).limit(1);
    console.log('Post-update debt.balance=', postDebtRows[0].balance);

    // 4-5: Record a debt payment of 50 and ensure funding source updated
    const paymentAmount = 50;
    const today = new Date().toISOString().slice(0,10);
    const { data: insertRes, error: insErr } = await supabase.from('debt_payments').insert({
      user_id: debtAfter.user_id || null,
      debt_id: debt.id,
      amount: paymentAmount,
      payment_date: today,
      cycle_due_date: today,
      funding_source_id: src.id,
    }).select('*');

    if (insErr) throw insErr;
    const paymentRow = insertRes[0];
    console.log('Inserted debt_payment id=', paymentRow.id);

    const newDebtBalance = Math.max(Number(postDebtRows[0].balance || 0) - paymentAmount, 0);
    await supabase.from('debts').update({ balance: newDebtBalance }).eq('id', debt.id);

    const creditLimit = Number(srcAfterLink.credit_limit || 0);
    const newAvail = creditLimit ? Math.max(creditLimit - newDebtBalance, 0) : null;
    await supabase.from('funding_sources').update({ current_balance: newDebtBalance, available_credit: newAvail }).eq('id', src.id);

    console.log('Recorded payment and synced funding source.');

    // Refresh and confirm
    const { data: finalSrcRows } = await supabase.from('funding_sources').select('*').eq('id', src.id).limit(1);
    const finalSrc = finalSrcRows[0];
    const { data: finalDebtRows } = await supabase.from('debts').select('*').eq('id', debt.id).limit(1);
    const finalDebt = finalDebtRows[0];

    console.log('Final funding source current_balance=', finalSrc.current_balance, ', available_credit=', finalSrc.available_credit);
    console.log('Final debt balance=', finalDebt.balance);

    const expectedAvail = Number(finalSrc.credit_limit || 0) ? Math.max(Number(finalSrc.credit_limit || 0) - Number(finalSrc.current_balance || 0), 0) : null;
    console.log('Expected available_credit=', expectedAvail, 'Matches?', expectedAvail === Number(finalSrc.available_credit));

    // Cleanup: restore original balances and linked_debt_id, delete payment
    await supabase.from('funding_sources').update({ current_balance: originalSrc.current_balance, available_credit: originalSrc.available_credit, linked_debt_id: originalSrc.linked_debt_id }).eq('id', src.id);
    await supabase.from('debts').update({ balance: originalDebt.balance }).eq('id', debt.id);
    await supabase.from('debt_payments').delete().eq('id', paymentRow.id);

    console.log('Restored original records and removed test payment.');

  } catch (err) {
    console.error('Error during manual test:', err);
    // try best-effort restore
    try {
      await supabase.from('funding_sources').update({ current_balance: originalSrc.current_balance, available_credit: originalSrc.available_credit, linked_debt_id: originalSrc.linked_debt_id }).eq('id', src.id);
      await supabase.from('debts').update({ balance: originalDebt.balance }).eq('id', debt.id);
    } catch (e) {
      console.error('Failed to restore originals:', e);
    }
  }

  console.log('Safe manual sync test completed.');
}

run().catch((e)=>{console.error('Test script error', e); process.exit(1);});
