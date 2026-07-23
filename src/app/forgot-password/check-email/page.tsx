import { GlassCard } from "@/components/ui";

export default function ForgotPasswordCheckEmailPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <GlassCard strong className="w-full max-w-sm p-8 text-center">
        <h1 className="font-(family-name:--font-display) text-3xl text-white mb-2">
          Check your inbox
        </h1>
        <p className="text-white/60 text-sm">
          If that email has an account with us, we&apos;ve sent a link to
          reset your password. It&apos;ll expire after a while, so use it
          soon.
        </p>
      </GlassCard>
    </div>
  );
}
