import {supabase} from './supabase.js'
export const txnApi={
  fetchAll:()=>supabase.from('transactions').select('*').order('date',{ascending:false}).order('id',{ascending:false}),
  fetchAllAdmin:()=>supabase.from('transactions').select('*'),
  insert:(d)=>supabase.from('transactions').insert([d]),
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
  fetch:()=>supabase.from('pay_cycle').select('*').limit(1),
  upsert:(row)=>supabase.from('pay_cycle').upsert([row],{onConflict:'user_id'}),
}
export const profileApi={
  upsert:(row)=>supabase.from('user_profiles').upsert([row],{onConflict:'user_id'}),
  fetchAll:()=>supabase.from('user_profiles').select('*').order('last_seen',{ascending:false}),
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

export const billsApi = {
  fetchAll: () => supabase.from('bills').select('*').order('due_day', { ascending: true }),
  insert:   (d) => supabase.from('bills').insert([d]),
  update:   (id, d) => supabase.from('bills').update(d).eq('id', id),
  delete:   (id) => supabase.from('bills').delete().eq('id', id),
}
