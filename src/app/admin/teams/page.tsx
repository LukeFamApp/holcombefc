import { createClient } from "@/lib/supabase/server";
import { GlassCard, Field, Button } from "@/components/ui";
import {
  addTeam,
  updateTeam,
  deleteTeam,
  addFeePlan,
  deleteFeePlan,
} from "@/lib/actions/teams";

type FeePlan = {
  id: string;
  name: string;
  annual_price_pence: number;
  instalment_count: number | null;
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
    .select(
      "id, name, age_group, fee_plans ( id, name, annual_price_pence, instalment_count )",
    )
    .order("age_group")
    .returns<Team[]>();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12 flex flex-col gap-10">
      <div>
        <h1 className="font-(family-name:--font-display) text-3xl sm:text-4xl text-white">
          Teams &amp; Fees
        </h1>
        <p className="text-white/50 text-sm mt-1">
          Add teams and set the membership fee options parents can choose
          from. A team only offers Training Only (or any other plan) if you
          add that plan to it here.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {(teams ?? []).map((team) => (
          <GlassCard key={team.id} className="p-5 sm:p-6">
            {/* Edit team */}
            <form
              action={updateTeam}
              className="flex flex-wrap items-end gap-3"
            >
              <input type="hidden" name="id" value={team.id} />
              <div className="flex-1 min-w-[180px]">
                <Field label="Team name" name="name" defaultValue={team.name} required />
              </div>
              <div className="w-28">
                <Field
                  label="Age group"
                  name="ageGroup"
                  defaultValue={team.age_group}
                  required
                />
              </div>
              <Button variant="ghost">Save</Button>
            </form>
            <form action={deleteTeam} className="mt-2">
              <input type="hidden" name="id" value={team.id} />
              <button
                type="submit"
                className="text-xs text-red-300/80 hover:text-red-300 transition-colors"
              >
                Delete team
              </button>
            </form>

            {/* Fee plans */}
            <ul className="mt-5 flex flex-col gap-2">
              {(team.fee_plans ?? []).map((plan) => (
                <li
                  key={plan.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 px-3.5 py-2.5 text-sm"
                >
                  <span className="text-white">
                    {plan.name}{" "}
                    <span className="text-white/40">
                      · £{(plan.annual_price_pence / 100).toFixed(0)}/yr
                      {plan.instalment_count
                        ? ` · or ${plan.instalment_count} × £${(
                            plan.annual_price_pence /
                            plan.instalment_count /
                            100
                          ).toFixed(0)}/mo`
                        : " · pay in full only"}
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
                  No fee plans yet — parents can&apos;t pick this team until
                  it has at least one.
                </li>
              )}
            </ul>

            <form
              action={addFeePlan}
              className="mt-4 flex flex-wrap items-end gap-3"
            >
              <input type="hidden" name="teamId" value={team.id} />
              <div className="flex-1 min-w-[150px]">
                <Field
                  label="Fee plan name"
                  name="name"
                  placeholder="e.g. Full Membership"
                  required
                />
              </div>
              <div className="w-28">
                <Field
                  label="£ per year"
                  name="annualPricePounds"
                  type="number"
                  placeholder="150"
                  required
                />
              </div>
              <div className="w-36">
                <Field
                  label="Monthly instalments"
                  name="instalmentCount"
                  type="number"
                  placeholder="e.g. 6 (blank = none)"
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

      <GlassCard strong className="p-5 sm:p-8">
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
