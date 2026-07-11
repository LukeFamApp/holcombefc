import { createClient } from "@/lib/supabase/server";
import { GlassCard, Field, Button } from "@/components/ui";
import { addTeam, deleteTeam, addFeePlan, deleteFeePlan } from "@/lib/actions/teams";

type FeePlan = {
  id: string;
  name: string;
  annual_price_pence: number;
};

type Team = {
  id: string;
  name: string;
  age_group: string;
  fee_plans: FeePlan[] | null;
};

export default async function AdminTeamsPage() {
  const supabase = await createClient();
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, age_group, fee_plans ( id, name, annual_price_pence )")
    .order("age_group")
    .returns<Team[]>();

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12 flex flex-col gap-10">
      <div>
        <h1 className="font-(family-name:--font-display) text-4xl text-white">
          Teams &amp; Fees
        </h1>
        <p className="text-white/50 text-sm mt-1">
          Add teams and set the membership fee options parents can choose
          from when they register a player.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {(teams ?? []).map((team) => (
          <GlassCard key={team.id} className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {team.name}
                </h2>
                <p className="text-xs text-white/40">{team.age_group}</p>
              </div>
              <form action={deleteTeam}>
                <input type="hidden" name="id" value={team.id} />
                <button
                  type="submit"
                  className="text-xs text-red-300/80 hover:text-red-300 transition-colors"
                >
                  Delete team
                </button>
              </form>
            </div>

            <ul className="mt-4 flex flex-col gap-2">
              {(team.fee_plans ?? []).map((plan) => (
                <li
                  key={plan.id}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3.5 py-2.5 text-sm"
                >
                  <span className="text-white">
                    {plan.name}{" "}
                    <span className="text-white/40">
                      · £{(plan.annual_price_pence / 100).toFixed(2)}/yr
                    </span>
                  </span>
                  <form action={deleteFeePlan}>
                    <input type="hidden" name="id" value={plan.id} />
                    <button
                      type="submit"
                      className="text-xs text-red-300/80 hover:text-red-300 transition-colors"
                    >
                      Remove
                    </button>
                  </form>
                </li>
              ))}
              {(team.fee_plans ?? []).length === 0 && (
                <li className="text-sm text-white/40">
                  No fee plans yet — add one below.
                </li>
              )}
            </ul>

            <form
              action={addFeePlan}
              className="mt-4 flex flex-wrap items-end gap-3"
            >
              <input type="hidden" name="teamId" value={team.id} />
              <div className="flex-1 min-w-[160px]">
                <Field label="Fee plan name" name="name" placeholder="e.g. Full Membership" required />
              </div>
              <div className="w-32">
                <Field
                  label="£ per year"
                  name="annualPricePounds"
                  type="number"
                  placeholder="150"
                  required
                />
              </div>
              <Button variant="ghost" className="mb-0.5">
                Add fee plan
              </Button>
            </form>
          </GlassCard>
        ))}

        {(teams ?? []).length === 0 && (
          <GlassCard className="p-6 text-center text-white/40 text-sm">
            No teams yet — add one below.
          </GlassCard>
        )}
      </div>

      <GlassCard strong className="p-8">
        <h2 className="font-(family-name:--font-display) text-2xl text-white mb-4">
          Add a team
        </h2>
        <form action={addTeam} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <Field label="Team name" name="name" placeholder="e.g. Under 14s Blues" required />
          </div>
          <div className="w-40">
            <Field label="Age group" name="ageGroup" placeholder="e.g. U14" required />
          </div>
          <Button>Add team</Button>
        </form>
      </GlassCard>
    </div>
  );
}
