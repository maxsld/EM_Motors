"use client"

import Image from "next/image"
import { useState } from "react"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import logo from "@/assets/logo.png"
import { withBasePath } from "@/lib/base-path"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    const form = event.currentTarget
    const formData = new FormData(form)
    const email = String(formData.get("email") || "").trim().toLowerCase()
    const password = String(formData.get("password") || "")

    try {
      const response = await fetch(withBasePath("/api/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        setError(data?.error ?? "Erreur de connexion.")
        setLoading(false)
        return
      }

      router.replace("/evenements")
    } catch {
      setError("Erreur de connexion.")
      setLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex items-center justify-center p-4">
              <Image
                src={logo}
                alt="EM Motors logo"
                width={126}
                height={126}
                priority
              />
            </div>
            <FieldDescription className="text-zinc-400">
              Connectez-vous pour accéder au tableau de bord.
            </FieldDescription>
          </div>
          <Field>
            <FieldLabel htmlFor="email" className="text-zinc-200">
              Email
            </FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="vous@exemple.com"
              required
              className="rounded-none border-zinc-800 text-white placeholder:text-zinc-500 focus-visible:border-red-600 focus-visible:ring-red-600/30"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="password" className="text-zinc-200">
              Mot de passe
            </FieldLabel>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              className="rounded-none border-zinc-800 text-white placeholder:text-zinc-500 focus-visible:border-red-600 focus-visible:ring-red-600/30"
            />
          </Field>
          <Field>
            <Button
              type="submit"
              className="h-10 w-full rounded-none bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600/30"
              disabled={loading}
            >
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
          </Field>
          {error ? (
            <FieldDescription className="text-red-500">{error}</FieldDescription>
          ) : null}
        </FieldGroup>
      </form>
    </div>
  )
}
