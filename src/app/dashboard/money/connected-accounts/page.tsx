"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BeastMoneyShell } from "../BeastMoneyShell";

type Connection = {
  id: string;
  institution_name: string;
  provider_id: string;
  status: string;
  last_successful_refresh_at: string | null;
  last_refresh_error: string | null;
};

type Account = {
  id: string;
  connection_id: string;
  name: string;
  account_type: string;
  currency: string;
  status: string;
  linked_record_type: "debt" | "funding_source" | "retirement" | "other" | null;
  linked_record_id: string | null;
};

type CanonicalBalance = { balance: number; label: string };

type Snapshot = {
  connected_account_id: string;
  current_balance: number;
  available_balance: number | null;
  credit_limit: number | null;
  retrieved_at: string;
};

export default function ConnectedAccountsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [snapshots, setSnapshots] = useState<Record<string, Snapshot>>({});
  const [canonical, setCanonical] = useState<Record<string, CanonicalBalance>>({});
  const [status, setStatus] = useState("Loading connected accounts…");

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient();
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) { setStatus("Sign in to view connected accounts."); return; }
        const [connectionResult, accountResult] = await Promise.all([
          supabase.from("money_institution_connections").select("id,institution_name,provider_id,status,last_successful_refresh_at,last_refresh_error").eq("owner_id", auth.user.id).order("created_at"),
          supabase.from("money_connected_accounts").select("id,connection_id,name,account_type,currency,status,linked_record_type,linked_record_id").eq("owner_id", auth.user.id).order("created_at"),
        ]);
        if (connectionResult.error) throw connectionResult.error;
        if (accountResult.error) throw accountResult.error;
        const loadedAccounts = (accountResult.data ?? []) as Account[];
        setConnections((connectionResult.data ?? []) as Connection[]);
        setAccounts(loadedAccounts);
        if (loadedAccounts.length) {
          const { data, error } = await supabase.from("money_balance_snapshots")
            .select("connected_account_id,current_balance,available_balance,credit_limit,retrieved_at")
            .eq("owner_id", auth.user.id).in("connected_account_id", loadedAccounts.map((item) => item.id))
            .order("retrieved_at", { ascending: false });
          if (error) throw error;
          const latest: Record<string, Snapshot> = {};
          for (const row of (data ?? []) as Snapshot[]) if (!latest[row.connected_account_id]) latest[row.connected_account_id] = row;
          setSnapshots(latest);

          const debtIds = loadedAccounts.filter((item) => item.linked_record_type === "debt" && item.linked_record_id).map((item) => item.linked_record_id as string);
          const fundingIds = loadedAccounts.filter((item) => item.linked_record_type === "funding_source" && item.linked_record_id).map((item) => item.linked_record_id as string);
          const [debtResult, fundingResult] = await Promise.all([
            debtIds.length ? supabase.from("debts").select("id,name,balance").eq("user_id", auth.user.id).in("id", debtIds) : Promise.resolve({ data: [], error: null }),
            fundingIds.length ? supabase.from("funding_sources").select("id,name,current_balance").eq("user_id", auth.user.id).in("id", fundingIds) : Promise.resolve({ data: [], error: null }),
          ]);
          if (debtResult.error) throw debtResult.error;
          if (fundingResult.error) throw fundingResult.error;
          const values: Record<string, CanonicalBalance> = {};
          for (const row of debtResult.data ?? []) values[row.id] = { balance: Number(row.balance) || 0, label: row.name };
          for (const row of fundingResult.data ?? []) values[row.id] = { balance: Number(row.current_balance) || 0, label: row.name };
          setCanonical(values);
        }
        setStatus(connectionResult.data?.length ? "" : "No institutions are connected yet.");
      } catch {
        setStatus("Connected accounts could not be loaded. No financial records were changed.");
      }
    };
    void load();
  }, []);

  return (
    <BeastMoneyShell title="Connected Accounts" description="Read-only institution balances with member-controlled refresh and review.">
      <div className="space-y-5">
        <section className="beast-panel p-5">
          <p className="text-sm font-bold text-cyan-300">V1 safety boundary</p>
          <h2 className="mt-2 text-xl font-black text-white">Monitor balances without giving BeastMoney control of your money.</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">Connections are read-only. BeastMoney does not move money, pay bills, sync transactions, or silently replace saved balances. A fresh institution balance must be reviewed before it can change a canonical BeastMoney record.</p>
        </section>

        {status ? <div className="beast-panel p-5 text-sm text-slate-300">{status}</div> : null}

        {connections.map((connection) => (
          <section key={connection.id} className="beast-panel space-y-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h2 className="text-xl font-black text-white">{connection.institution_name}</h2><p className="text-sm text-slate-400">{connection.status} · {connection.last_successful_refresh_at ? `Last refreshed ${new Date(connection.last_successful_refresh_at).toLocaleString()}` : "Not refreshed yet"}</p></div>
              <button className="beast-button" disabled title="Provider activation is required before live refresh is available.">Refresh balances</button>
            </div>
            {connection.last_refresh_error ? <p className="text-sm text-amber-300">Last refresh needs attention. Your saved BeastMoney records were not changed.</p> : null}
            <div className="grid gap-3 md:grid-cols-2">
              {accounts.filter((account) => account.connection_id === connection.id).map((account) => {
                const snapshot = snapshots[account.id];
                return <article key={account.id} className="rounded-lg border border-[#2a3242] p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">{account.account_type}</p>
                  <h3 className="mt-1 font-black text-white">{account.name}</h3>
                  {snapshot ? <div className="mt-3 text-sm text-slate-300"><p><strong>Institution-reported:</strong> {snapshot.current_balance.toLocaleString(undefined,{style:"currency",currency:account.currency})}</p>{snapshot.available_balance !== null ? <p><strong>Available:</strong> {snapshot.available_balance.toLocaleString(undefined,{style:"currency",currency:account.currency})}</p> : null}{snapshot.credit_limit !== null ? <p><strong>Credit limit:</strong> {snapshot.credit_limit.toLocaleString(undefined,{style:"currency",currency:account.currency})}</p> : null}{account.linked_record_id && canonical[account.linked_record_id] ? (() => { const saved = canonical[account.linked_record_id!]; const difference = snapshot.current_balance - saved.balance; return <div className="mt-3 rounded-md border border-[#2a3242] p-3"><p><strong>BeastMoney saved:</strong> {saved.balance.toLocaleString(undefined,{style:"currency",currency:account.currency})}</p><p><strong>Difference:</strong> {difference.toLocaleString(undefined,{style:"currency",currency:account.currency})}</p>{Math.abs(difference) > 0.004 ? <button className="beast-button mt-3" disabled title="Canonical update confirmation will be enabled with the provider adapter and audited update command.">Review update</button> : <p className="mt-2 text-emerald-300">Balances match.</p>}</div>; })() : <p className="mt-3 text-xs text-slate-400">Link this account to a BeastMoney debt or funding source to compare balances.</p>}<p className="mt-2 text-xs text-slate-400">Retrieved {new Date(snapshot.retrieved_at).toLocaleString()}</p></div> : <p className="mt-3 text-sm text-slate-400">No balance snapshot yet.</p>}
                </article>;
              })}
            </div>
          </section>
        ))}

        <section className="beast-panel p-5 text-sm text-slate-300">
          <h2 className="text-lg font-black text-white">Connect an institution</h2>
          <p className="mt-2">The secure provider adapter is not activated yet. This workspace is ready for a provider such as Plaid after pricing, credentials, and Production activation are explicitly approved by the owner.</p>
        </section>
      </div>
    </BeastMoneyShell>
  );
}
