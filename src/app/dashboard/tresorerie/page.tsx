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

type Operation = {
  id: number
  label: string
  amount: number
  date: string
  kind: "income" | "expense"
  status: "real" | "planned"
  notes: string | null
}

const emptyForm = {
  label: "",
  amount: "",
  date: "",
  kind: "expense",
  status: "real",
  notes: "",
}

export default function Page() {
  const [operations, setOperations] = React.useState<Operation[]>([])
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [editOperation, setEditOperation] = React.useState<Operation | null>(null)
  const [form, setForm] = React.useState({ ...emptyForm })
  const [filterKind, setFilterKind] = React.useState<"all" | "income" | "expense">(
    "all"
  )
  const [filterStatus, setFilterStatus] = React.useState<"all" | "real" | "planned">(
    "all"
  )
  const [query, setQuery] = React.useState("")

  const refreshOperations = React.useCallback(async () => {
    const response = await fetch("/api/treasury")
    if (!response.ok) return
    const data = await response.json()
    setOperations(data.operations ?? [])
  }, [])

  React.useEffect(() => {
    refreshOperations().catch(() => {})
  }, [refreshOperations])

  const totals = React.useMemo(() => {
    let balance = 0
    let plannedExpenses = 0
    let plannedIncome = 0
    operations.forEach((op) => {
      if (op.status === "planned") {
        if (op.kind === "expense") plannedExpenses += op.amount
        if (op.kind === "income") plannedIncome += op.amount
        return
      }
      if (op.kind === "income") balance += op.amount
      if (op.kind === "expense") balance -= op.amount
    })
    return { balance, plannedExpenses, plannedIncome }
  }, [operations])

  const filteredOperations = React.useMemo(() => {
    return operations.filter((op) => {
      if (filterKind !== "all" && op.kind !== filterKind) return false
      if (filterStatus !== "all" && op.status !== filterStatus) return false
      if (query.trim()) {
        const haystack = `${op.label} ${op.notes ?? ""}`.toLowerCase()
        if (!haystack.includes(query.trim().toLowerCase())) return false
      }
      return true
    })
  }, [operations, filterKind, filterStatus, query])

  const handleChange = (
    key: keyof typeof form,
    value: string
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const submitOperation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.label || !form.date || !form.amount) return
    setIsSubmitting(true)
    try {
      const payload = {
        label: form.label,
        date: form.date,
        amount: Number(form.amount),
        kind: form.kind,
        status: form.status,
        notes: form.notes,
      }
      const response = await fetch("/api/treasury", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!response.ok) return
      setForm({ ...emptyForm })
      setIsModalOpen(false)
      await refreshOperations()
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitEdit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editOperation) return
    setIsSubmitting(true)
    try {
      const payload = {
        label: editOperation.label,
        date: editOperation.date,
        amount: Number(editOperation.amount),
        kind: editOperation.kind,
        status: editOperation.status,
        notes: editOperation.notes,
      }
      const response = await fetch(`/api/treasury/${editOperation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!response.ok) return
      setEditOperation(null)
      await refreshOperations()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    const response = await fetch(`/api/treasury/${id}`, { method: "DELETE" })
    if (!response.ok) return
    await refreshOperations()
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
                    {
                      title: "Solde actuel",
                      value: `${totals.balance.toLocaleString("fr-FR")} €`,
                    },
                    {
                      title: "Dépenses prévues",
                      value: `${totals.plannedExpenses.toLocaleString("fr-FR")} €`,
                    },
                    {
                      title: "Cotisations à venir",
                      value: `${totals.plannedIncome.toLocaleString("fr-FR")} €`,
                    },
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
                  <h2 className="text-lg font-semibold">Opérations</h2>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="flex cursor-pointer items-center gap-2 border border-border bg-background px-3 py-2 text-xs font-semibold transition hover:bg-primary hover:text-primary-foreground"
                  >
                    <IconPlus className="size-4" />
                    Ajouter une opération
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
                    value={filterKind}
                    onChange={(e) =>
                      setFilterKind(e.target.value as "all" | "income" | "expense")
                    }
                    className="border border-border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="all">Tous types</option>
                    <option value="income">Entrées</option>
                    <option value="expense">Dépenses</option>
                  </select>
                  <select
                    value={filterStatus}
                    onChange={(e) =>
                      setFilterStatus(e.target.value as "all" | "real" | "planned")
                    }
                    className="border border-border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="all">Tous statuts</option>
                    <option value="real">Réel</option>
                    <option value="planned">Prévu</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterKind("all")
                      setFilterStatus("all")
                      setQuery("")
                    }}
                    className="cursor-pointer border border-border bg-background px-3 py-2 text-xs font-semibold transition hover:bg-primary hover:text-primary-foreground"
                  >
                    Réinitialiser
                  </button>
                </div>

                <div className="mt-4 grid gap-3 text-sm">
                  {filteredOperations.map((op) => (
                    <div
                      key={op.id}
                      className="grid items-center gap-3 border border-border bg-card p-3 md:grid-cols-[1.3fr_0.7fr_0.6fr_0.6fr_0.6fr_auto]"
                    >
                      <div>
                        <div className="font-medium">{op.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {op.notes || "—"}
                        </div>
                      </div>
                      <div className="text-muted-foreground">
                        {new Date(`${op.date}T00:00:00`).toLocaleDateString("fr-FR")}
                      </div>
                      <div className="text-muted-foreground">
                        {op.kind === "income" ? "Entrée" : "Dépense"}
                      </div>
                      <div className="text-muted-foreground">
                        {op.status === "planned" ? "Prévu" : "Réel"}
                      </div>
                      <div className="text-muted-foreground">
                        {op.kind === "expense" ? "-" : "+"}
                        {op.amount.toLocaleString("fr-FR")} €
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditOperation(op)}
                          className="flex cursor-pointer items-center gap-2 border border-border bg-background px-3 py-2 text-xs font-semibold transition hover:bg-primary hover:text-primary-foreground"
                        >
                          <IconPencil className="size-4" />
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(op.id)}
                          className="flex cursor-pointer items-center gap-2 border border-border bg-background px-3 py-2 text-xs font-semibold transition hover:bg-primary hover:text-primary-foreground"
                        >
                          <IconTrash className="size-4" />
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                  {!filteredOperations.length ? (
                    <div className="border border-border bg-card p-4 text-sm text-muted-foreground">
                      Aucune opération pour le moment.
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
              <h2 className="text-lg font-semibold">Ajouter une opération</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="cursor-pointer text-sm text-muted-foreground hover:text-foreground"
              >
                Fermer
              </button>
            </div>
            <form onSubmit={submitOperation} className="grid gap-3 text-sm">
              <label className="grid gap-1 text-xs text-muted-foreground">
                Libellé
                <input
                  value={form.label}
                  onChange={(e) => handleChange("label", e.target.value)}
                  className="border border-border bg-background px-3 py-2 text-sm text-foreground"
                  required
                />
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-1 text-xs text-muted-foreground">
                  Montant
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => handleChange("amount", e.target.value)}
                    className="border border-border bg-background px-3 py-2 text-sm text-foreground"
                    required
                  />
                </label>
                <label className="grid gap-1 text-xs text-muted-foreground">
                  Date
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => handleChange("date", e.target.value)}
                    className="border border-border bg-background px-3 py-2 text-sm text-foreground"
                    required
                  />
                </label>
                <label className="grid gap-1 text-xs text-muted-foreground">
                  Type
                  <select
                    value={form.kind}
                    onChange={(e) => handleChange("kind", e.target.value)}
                    className="border border-border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="expense">Dépense</option>
                    <option value="income">Entrée</option>
                  </select>
                </label>
                <label className="grid gap-1 text-xs text-muted-foreground">
                  Statut
                  <select
                    value={form.status}
                    onChange={(e) => handleChange("status", e.target.value)}
                    className="border border-border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="real">Réel</option>
                    <option value="planned">Prévu</option>
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

      {editOperation ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl border border-border bg-background p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Modifier une opération</h2>
              <button
                type="button"
                onClick={() => setEditOperation(null)}
                className="cursor-pointer text-sm text-muted-foreground hover:text-foreground"
              >
                Fermer
              </button>
            </div>
            <form onSubmit={submitEdit} className="grid gap-3 text-sm">
              <label className="grid gap-1 text-xs text-muted-foreground">
                Libellé
                <input
                  value={editOperation.label}
                  onChange={(e) =>
                    setEditOperation({ ...editOperation, label: e.target.value })
                  }
                  className="border border-border bg-background px-3 py-2 text-sm text-foreground"
                  required
                />
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-1 text-xs text-muted-foreground">
                  Montant
                  <input
                    type="number"
                    value={editOperation.amount}
                    onChange={(e) =>
                      setEditOperation({
                        ...editOperation,
                        amount: Number(e.target.value),
                      })
                    }
                    className="border border-border bg-background px-3 py-2 text-sm text-foreground"
                    required
                  />
                </label>
                <label className="grid gap-1 text-xs text-muted-foreground">
                  Date
                  <input
                    type="date"
                    value={editOperation.date}
                    onChange={(e) =>
                      setEditOperation({ ...editOperation, date: e.target.value })
                    }
                    className="border border-border bg-background px-3 py-2 text-sm text-foreground"
                    required
                  />
                </label>
                <label className="grid gap-1 text-xs text-muted-foreground">
                  Type
                  <select
                    value={editOperation.kind}
                    onChange={(e) =>
                      setEditOperation({
                        ...editOperation,
                        kind: e.target.value as "income" | "expense",
                      })
                    }
                    className="border border-border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="expense">Dépense</option>
                    <option value="income">Entrée</option>
                  </select>
                </label>
                <label className="grid gap-1 text-xs text-muted-foreground">
                  Statut
                  <select
                    value={editOperation.status}
                    onChange={(e) =>
                      setEditOperation({
                        ...editOperation,
                        status: e.target.value as "real" | "planned",
                      })
                    }
                    className="border border-border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="real">Réel</option>
                    <option value="planned">Prévu</option>
                  </select>
                </label>
              </div>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Notes
                <textarea
                  value={editOperation.notes ?? ""}
                  onChange={(e) =>
                    setEditOperation({
                      ...editOperation,
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
                  onClick={() => setEditOperation(null)}
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
