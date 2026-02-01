import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div
      className="flex min-h-svh flex-col items-center justify-center px-6 py-10 text-white"
      style={{
        backgroundColor: "rgb(11, 11, 11)",
        backgroundImage:
          "repeating-linear-gradient(135deg, rgba(255,255,255,0.06) 0, rgba(255,255,255,0.06) 18px, rgba(0,0,0,0) 18px, rgba(0,0,0,0) 36px)",
      }}
    >
      <div className="w-full max-w-sm border border-zinc-800 bg-[rgb(11,11,11)] p-8">
        <LoginForm />
      </div>
    </div>
  )
}
