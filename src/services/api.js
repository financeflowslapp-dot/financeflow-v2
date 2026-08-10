import {supabase} from './supabase.js'
export const txnApi={
  fetchAll:(userId)=>supabase.from('transactions').select('*').eq('user_id',userId).order('date',{ascending:false}).order('id',{ascending:false}),
  // Admin panel only needs counts per user — never pull amount/category/note
  // for other people's entries down to the admin's browser.
  fetchAllAdmin:()=>supabase.from('transactions').select('id,user_id,date'),
  insert:(d)=>supabase.from('transactions').insert([d]).select(),
  update:(id,d)=>supabase.from('transactions').update(d).eq('id',id),
  delete:(id)=>supabase.from('transactions').delete().eq('id',id),
}
export const catApi={
  fetchAll:()=>supabase.from('categories').select('*').order('position',{ascending:true}).order('id',{ascending:true}),
  insert:(d)=>supabase.from('categories').insert([d]),
  updatePos:(id,pos)=>supabase.from('categories').update({position:pos}).eq('id',id),
  delete:(id)=>supabase.from('categories').delete().eq('id',id),
}
export const budgetApi={
  fetchAll:()=>supabase.from('budgets').select('*').order('category',{ascending:true}),
  upsert:(rows)=>supabase.from('budgets').upsert(rows,{onConflict:'user_id,category'}),
  delete:(id)=>supabase.from('budgets').delete().eq('id',id),
}
export const cycleApi={
  fetchHistory:(limit=4)=>supabase.from('pay_cycles').select('*').order('start_date',{ascending:false}).order('id',{ascending:false}).limit(limit),
  fetchAll:()=>supabase.from('pay_cycles').select('*').order('start_date',{ascending:false}).order('id',{ascending:false}),
  insert:(row)=>supabase.from('pay_cycles').insert([row]),
  update:(id,row)=>supabase.from('pay_cycles').update(row).eq('id',id),
}
export const profileApi={
  // Called BEFORE upsert — determines if the user is genuinely new.
  // Returns null when no row exists (new user), or the row when it exists.
  fetchOne:(userId)=>supabase.from('user_profiles').select('onboarding_complete').eq('user_id',userId).maybeSingle(),
  // Upsert creates or updates the profile. Does NOT include onboarding_complete
  // in payload — Supabase never overwrites it on UPDATE path.
  upsert:(row)=>supabase.from('user_profiles').upsert([row],{onConflict:'user_id',ignoreDuplicates:false}),
  fetchAll:()=>supabase.from('user_profiles').select('*').order('last_seen',{ascending:false}),
  // Uses upsert (not update) — safe even if row somehow doesn't exist.
  setOnboardingComplete:(userId,val)=>supabase.from('user_profiles').upsert(
    [{user_id:userId,onboarding_complete:val,onboarding_completed_at:val?new Date().toISOString():null}],
    {onConflict:'user_id',ignoreDuplicates:false}
  ),
}

export const creditCardApi = {
  fetchAll: () => supabase.from('credit_cards').select('*').order('created_at', { ascending: true }),
  insert:   (d) => supabase.from('credit_cards').insert([d]),
  update:   (id, d) => supabase.from('credit_cards').update(d).eq('id', id),
  delete:   (id) => supabase.from('credit_cards').delete().eq('id', id),
}

export const ccTxnApi = {
  // Record what effect a transaction had on a card's balance
  insert:            (d)      => supabase.from('credit_card_transactions').insert([d]),
  // Fetch the audit record(s) for a given transaction — used for reversal
  fetchByTransaction:(txnId)  => supabase.from('credit_card_transactions').select('*').eq('transaction_id', txnId),
  // Clean up audit records when a transaction is deleted/reversed
  deleteByTransaction:(txnId) => supabase.from('credit_card_transactions').delete().eq('transaction_id', txnId),
}
export const adminApi={
  check:()=>supabase.from('app_admins').select('user_id').limit(1),
}

export const goalsApi = {
  fetchAll: () => supabase.from('savings_goals').select('*').order('created_at', { ascending: false }),
  insert:   (d) => supabase.from('savings_goals').insert([d]),
  update:   (id, d) => supabase.from('savings_goals').update(d).eq('id', id),
  delete:   (id) => supabase.from('savings_goals').delete().eq('id', id),
}

export const goalAllocationsApi = {
  fetchByGoal:        (goalId)  => supabase.from('goal_allocations').select('*').eq('goal_id', goalId).order('allocated_at', { ascending: false }).order('id', { ascending: false }),
  fetchByTransaction: (txnId)   => supabase.from('goal_allocations').select('*').eq('transaction_id', txnId),
  insert: (d) => supabase.from('goal_allocations').insert([d]),
  deleteByTransaction:(txnId)   => supabase.from('goal_allocations').delete().eq('transaction_id', txnId),
}

export const billsApi = {
  fetchAll: () => supabase.from('bills').select('*').order('due_day', { ascending: true }),
  insert:   (d) => supabase.from('bills').insert([d]),
  update:   (id, d) => supabase.from('bills').update(d).eq('id', id),
  delete:   (id) => supabase.from('bills').delete().eq('id', id),
}
