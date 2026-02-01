"use client"

import * as React from "react"
import {
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { withBasePath } from "@/lib/base-path"

type Member = {
  id: number
  name: string
  email: string | null
  status: "active" | "inactive"
  membership_fee: number
  payment_status: "paid" | "due"
  notes: string | null
}

const emptyForm = {
  name: "",
  email: "",
  status: "active",
  membership_fee: "",
  payment_status: "paid",
  notes: "",
}

export default function Page() {
  const [members, setMembers] = React.useState<Member[]>([])
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [editMember, setEditMember] = React.useState<Member | null>(null)
  const [form, setForm] = React.useState({ ...emptyForm })
  const [filterStatus, setFilterStatus] = React.useState<
    "all" | "active" | "inactive"
  >("all")
  const [filterPayment, setFilterPayment] = React.useState<
    "all" | "paid" | "due"
  >("all")
  const [query, setQuery] = React.useState("")

  const refreshMembers = React.useCallback(async () => {
    const response = await fetch(withBasePath("/api/members"))
    if (!response.ok) return
    const data = await response.json()
    setMembers(data.members ?? [])
  }, [])

  React.useEffect(() => {
    refreshMembers().catch(() => {})
  }, [refreshMembers])

  const stats = React.useMemo(() => {
    const total = members.length
    const active = members.filter((m) => m.status === "active").length
    const due = members.filter((m) => m.payment_status === "due").length
    return { total, active, due }
  }, [members])

  const filteredMembers = React.useMemo(() => {
    return members.filter((member) => {
      if (filterStatus !== "all" && member.status !== filterStatus) return false
      if (filterPayment !== "all" && member.payment_status !== filterPayment)
        return false
      if (query.trim()) {
        const haystack = `${member.name} ${member.email ?? ""}`.toLowerCase()
        if (!haystack.includes(query.trim().toLowerCase())) return false
      }
      return true
    })
  }, [members, filterStatus, filterPayment, query])

  const handleChange = (
    key: keyof typeof form,
    value: string
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const submitMember = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.name || !form.membership_fee) return
    setIsSubmitting(true)
    try {
      const payload = {
        name: form.name,
        email: form.email,
        status: form.status,
        membership_fee: Number(form.membership_fee),
        payment_status: form.payment_status,
        notes: form.notes,
      }
      const response = await fetch(withBasePath("/api/members"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!response.ok) return
      setForm({ ...emptyForm })
      setIsModalOpen(false)
      await refreshMembers()
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitEdit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editMember) return
    setIsSubmitting(true)
    try {
      const payload = {
        name: editMember.name,
        email: editMember.email,
        status: editMember.status,
        membership_fee: Number(editMember.membership_fee),
        payment_status: editMember.payment_status,
        notes: editMember.notes,
      }
      const response = await fetch(
        withBasePath(`/api/members/${editMember.id}`),
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )
      if (!response.ok) return
      setEditMember(null)
      await refreshMembers()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    const response = await fetch(withBasePath(`/api/members/${id}`), {
      method: "DELETE",
    })
    if (!response.ok) return
    await refreshMembers()
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <div className="grid gap-4 lg:grid-cols-3">
                  {[
                    { title: "Adhérents", value: stats.total },
                    { title: "Actifs", value: stats.active },
                    { title: "Cotisations dues", value: stats.due },
                  ].map((card) => (
                    <div
                      key={card.title}
                      className="border border-border bg-card p-6"
                    >
                      <div className="text-sm text-muted-foreground">
                        {card.title}
                      </div>
                      <div className="mt-2 text-2xl font-semibold">
                        {card.value}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Liste des membres</h2>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="flex cursor-pointer items-center gap-2 border border-border bg-background px-3 py-2 text-xs font-semibold transition hover:bg-primary hover:text-primary-foreground"
                  >
                    <IconPlus className="size-4" />
                    Ajouter un membre
                  </button>
                </div>

                <div className="mt-3 grid gap-3 text-sm md:grid-cols-[1.2fr_0.6fr_0.6fr_auto]">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Rechercher..."
                    className="border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                  <select
                    value={filterStatus}
                    onChange={(e) =>
                      setFilterStatus(e.target.value as "all" | "active" | "inactive")
                    }
                    className="border border-border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="all">Tous statuts</option>
                    <option value="active">Actifs</option>
                    <option value="inactive">Inactifs</option>
                  </select>
                  <select
                    value={filterPayment}
                    onChange={(e) =>
                      setFilterPayment(e.target.value as "all" | "paid" | "due")
                    }
                    className="border border-border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="all">Toutes cotisations</option>
                    <option value="paid">Payées</option>
                    <option value="due">À payer</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterStatus("all")
                      setFilterPayment("all")
                      setQuery("")
                    }}
                    className="cursor-pointer border border-border bg-background px-3 py-2 text-xs font-semibold transition hover:bg-primary hover:text-primary-foreground"
                  >
                    Réinitialiser
                  </button>
                </div>

                <div className="mt-4 grid gap-3 text-sm">
                  {filteredMembers.map((member) => (
                    <div
                      key={member.id}
                      className="grid items-center gap-3 border border-border bg-card p-3 md:grid-cols-[1.2fr_0.9fr_0.6fr_0.6fr_0.5fr_auto]"
                    >
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {member.email || "—"}
                        </div>
                      </div>
                      <div className="text-muted-foreground">
                        {member.notes || "—"}
                      </div>
                      <div className="text-muted-foreground">
                        {member.status === "active" ? "Actif" : "Inactif"}
                      </div>
                      <div className="text-muted-foreground">
                        {member.payment_status === "paid" ? "Payée" : "À payer"}
                      </div>
                      <div className="text-muted-foreground">
                        {member.membership_fee.toLocaleString("fr-FR")} €
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditMember(member)}
                          className="flex cursor-pointer items-center gap-2 border border-border bg-background px-3 py-2 text-xs font-semibold transition hover:bg-primary hover:text-primary-foreground"
                        >
                          <IconPencil className="size-4" />
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(member.id)}
                          className="flex cursor-pointer items-center gap-2 border border-border bg-background px-3 py-2 text-xs font-semibold transition hover:bg-primary hover:text-primary-foreground"
                        >
                          <IconTrash className="size-4" />
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                  {!filteredMembers.length ? (
                    <div className="border border-border bg-card p-4 text-sm text-muted-foreground">
                      Aucun membre pour le moment.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl border border-border bg-background p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Ajouter un membre</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="cursor-pointer text-sm text-muted-foreground hover:text-foreground"
              >
                Fermer
              </button>
            </div>
            <form onSubmit={submitMember} className="grid gap-3 text-sm">
              <label className="grid gap-1 text-xs text-muted-foreground">
                Nom
                <input
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className="border border-border bg-background px-3 py-2 text-sm text-foreground"
                  required
                />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className="border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-1 text-xs text-muted-foreground">
                  Statut
                  <select
                    value={form.status}
                    onChange={(e) => handleChange("status", e.target.value)}
                    className="border border-border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="active">Actif</option>
                    <option value="inactive">Inactif</option>
                  </select>
                </label>
                <label className="grid gap-1 text-xs text-muted-foreground">
                  Cotisation (€)
                  <input
                    type="number"
                    value={form.membership_fee}
                    onChange={(e) => handleChange("membership_fee", e.target.value)}
                    className="border border-border bg-background px-3 py-2 text-sm text-foreground"
                    required
                  />
                </label>
                <label className="grid gap-1 text-xs text-muted-foreground">
                  Paiement
                  <select
                    value={form.payment_status}
                    onChange={(e) => handleChange("payment_status", e.target.value)}
                    className="border border-border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="paid">Payée</option>
                    <option value="due">À payer</option>
                  </select>
                </label>
              </div>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Notes
                <textarea
                  value={form.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  rows={3}
                  className="border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </label>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="cursor-pointer border border-border bg-background px-3 py-2 text-xs font-semibold transition hover:bg-primary hover:text-primary-foreground"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex cursor-pointer items-center gap-2 border border-border bg-background px-3 py-2 text-xs font-semibold transition hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <IconPlus className="size-4" />
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editMember ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl border border-border bg-background p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Modifier un membre</h2>
              <button
                type="button"
                onClick={() => setEditMember(null)}
                className="cursor-pointer text-sm text-muted-foreground hover:text-foreground"
              >
                Fermer
              </button>
            </div>
            <form onSubmit={submitEdit} className="grid gap-3 text-sm">
              <label className="grid gap-1 text-xs text-muted-foreground">
                Nom
                <input
                  value={editMember.name}
                  onChange={(e) =>
                    setEditMember({ ...editMember, name: e.target.value })
                  }
                  className="border border-border bg-background px-3 py-2 text-sm text-foreground"
                  required
                />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Email
                <input
                  type="email"
                  value={editMember.email ?? ""}
                  onChange={(e) =>
                    setEditMember({ ...editMember, email: e.target.value })
                  }
                  className="border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-1 text-xs text-muted-foreground">
                  Statut
                  <select
                    value={editMember.status}
                    onChange={(e) =>
                      setEditMember({
                        ...editMember,
                        status: e.target.value as "active" | "inactive",
                      })
                    }
                    className="border border-border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="active">Actif</option>
                    <option value="inactive">Inactif</option>
                  </select>
                </label>
                <label className="grid gap-1 text-xs text-muted-foreground">
                  Cotisation (€)
                  <input
                    type="number"
                    value={editMember.membership_fee}
                    onChange={(e) =>
                      setEditMember({
                        ...editMember,
                        membership_fee: Number(e.target.value),
                      })
                    }
                    className="border border-border bg-background px-3 py-2 text-sm text-foreground"
                    required
                  />
                </label>
                <label className="grid gap-1 text-xs text-muted-foreground">
                  Paiement
                  <select
                    value={editMember.payment_status}
                    onChange={(e) =>
                      setEditMember({
                        ...editMember,
                        payment_status: e.target.value as "paid" | "due",
                      })
                    }
                    className="border border-border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="paid">Payée</option>
                    <option value="due">À payer</option>
                  </select>
                </label>
              </div>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Notes
                <textarea
                  value={editMember.notes ?? ""}
                  onChange={(e) =>
                    setEditMember({
                      ...editMember,
                      notes: e.target.value,
                    })
                  }
                  rows={3}
                  className="border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </label>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditMember(null)}
                  className="cursor-pointer border border-border bg-background px-3 py-2 text-xs font-semibold transition hover:bg-primary hover:text-primary-foreground"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex cursor-pointer items-center gap-2 border border-border bg-background px-3 py-2 text-xs font-semibold transition hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <IconPencil className="size-4" />
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </SidebarProvider>
  )
}
