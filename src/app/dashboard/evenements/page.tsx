"use client"

import * as React from "react"
import {
  IconChevronLeft,
  IconChevronRight,
  IconFileText,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react"
import Link from "next/link"

import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

export default function Page() {
  const [events, setEvents] = React.useState<
    {
      id: number
      name: string
      date: string
      description: string | null
      image_url: string | null
    }[]
  >([])
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [editEvent, setEditEvent] = React.useState<{
    id: number
    name: string
    date: string
    description: string | null
    image_url: string | null
  } | null>(null)

  const [offset, setOffset] = React.useState(0)
  const baseDate = React.useMemo(() => new Date(), [])
  const now = new Date(baseDate.getFullYear(), baseDate.getMonth() + offset, 1)
  const year = now.getFullYear()
  const month = now.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const lastOfMonth = new Date(year, month + 1, 0)
  const startDay = (firstOfMonth.getDay() + 6) % 7
  const daysInMonth = lastOfMonth.getDate()
  const monthLabel = now.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  })
  const dayLabels = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
  const currentMonthEvents = events.filter((event) => {
    const eventDate = new Date(`${event.date}T00:00:00`)
    return (
      eventDate.getFullYear() === year && eventDate.getMonth() === month
    )
  })

  const refreshEvents = React.useCallback(async () => {
    const response = await fetch("/api/events")
    if (!response.ok) return
    const data = await response.json()
    setEvents(data.events ?? [])
  }, [])

  React.useEffect(() => {
    refreshEvents().catch(() => {})
  }, [refreshEvents])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/events", {
        method: "POST",
        body: formData,
      })
      if (!response.ok) {
        return
      }
      const data = await response.json()
      if (data.event) {
        await refreshEvents()
        form.reset()
        setIsModalOpen(false)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()
    if (!editEvent) return
    const form = event.currentTarget
    const formData = new FormData(form)

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/events/${editEvent.id}`, {
        method: "PUT",
        body: formData,
      })
      if (!response.ok) {
        return
      }
      const data = await response.json()
      if (data.event) {
        await refreshEvents()
        setEditEvent(null)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    const response = await fetch(`/api/events/${id}`, { method: "DELETE" })
    if (!response.ok) {
      return
    }
    await refreshEvents()
  }

  const generateEventSheet = (event: {
    name: string
    date: string
    description: string | null
  }) => {
    const dateLabel = new Date(`${event.date}T00:00:00`).toLocaleDateString(
      "fr-FR"
    )
    const content = `Fiche de description d’événements organisés par les étudiants

Structure organisatrice :


Caractéristiques de l’événement :
Type de lieu :
Bar / discothèque   ◻        Bâtiment de votre établissement   ◻
Salle publique      ◻        Autres : …………………………………..  ◻

Si l’événement se déroule au sein de votre établissement :

Nombre maximum de personnes pouvant être accueillies en théorie dans la salle :
Jauge de 75% liée au contexte sanitaire :


Programme de l’événement :


Budget de l’événement :


Éléments liés à la sécurité des personnes :
Présence d’organisateurs titulaires d’un brevet PSC1 ?                 ◻ oui / ◻ non
Si oui, effectif ?...............................................................................................................................
Présence de secouristes professionnels sur le site ?                    ◻ oui / ◻ non
Si oui, effectif ?...............................................................................................................................
Présence d’agents de sécurité professionnels ?                          ◻ oui / ◻ non
Si oui, effectif ?  VOIR AVEC KHALIFA..........................................................................................
Présence de membres de l’équipe pédagogique ou de présidence/direction ?     ◻ oui / ◻ non
Si oui, effectif ?...............................................................................................................................
Présence d’un stand de prévention ?                                     ◻ oui / ◻ non
Risque accidentel lié à l’environnement géographique (présence d’un point d’eau…) ?
    ◻ oui / ◻ non
Si oui, descriptif des mesures complémentaires mises en place :






Éléments liés à la prévention et la réduction des risques :
Présence d’un débit de boisson ?                                        ◻ oui / ◻ non
Présence de barmans professionnels ?                                    ◻ oui / ◻ non
Présence d’étudiants relais santé ?                                     ◻ oui / ◻ non

Descriptif du dispositif de distribution de boissons alcoolisées et non alcoolisées (quantités, prix, gestion du bar…) :






Dispositif de sécurité routière ?
◻ oui / ◻ non
Si oui, lequel ?................................................................................................................................
Moyens de sensibilisation aux risques liés à l’alcool et aux substances psychoactives ?
◻ oui / ◻ non
Si oui, lesquels ?
..........................................................................................................................................................................................................................................................................................................................................................
Autres dispositifs de prévention mis en place cycle de formations liées à la réduction des risques, secourisme, formation barman ; stand d’information sur les conduites à risques, distribution de préservatifs et de bouchons auditifs…) :
………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………

Date de dépôt de la déclaration auprès du ou des chefs du ou des établissements exerçant des missions d’enseignement supérieur : Le vendredi avant la semaine d’évènement

L’organisation de cet événement a-t-elle été menée en lien avec la présidence/direction de votre établissement :         ◻ oui / ◻ non


Date : ${dateLabel}
Nom du représentant de la structure organisatrice, des étudiants ou des usagers organisateurs :

Qualité (le cas échéant) :
Signature :

Avis du chef d’établissement :………………

---
Nom de l’événement : ${event.name}
Description : ${event.description ?? "—"}
`

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `fiche-evenement-${event.name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "")}.txt`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
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
                  <div className="flex flex-col gap-4">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="flex cursor-pointer items-center gap-2 border border-border bg-background px-4 py-3 text-left text-sm font-medium transition hover:bg-primary hover:text-primary-foreground"
                      >
                        <IconPlus className="size-4" />
                        Ajouter un événement
                      </button>
                      <Link
                        href="/dashboard/evenements/fiche"
                        className="flex cursor-pointer items-center gap-2 border border-border bg-background px-4 py-3 text-left text-sm font-medium transition hover:bg-primary hover:text-primary-foreground"
                      >
                        <IconFileText className="size-4" />
                        Générer une fiche événement
                      </Link>
                    </div>
                    <div className="border border-border bg-background p-4">
                      <div className="mb-4 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setOffset((current) => current - 1)}
                            className="cursor-pointer border border-border bg-background p-2 text-xs font-semibold uppercase tracking-[0.2em] transition hover:bg-primary hover:text-primary-foreground"
                          >
                            <IconChevronLeft className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setOffset((current) => current + 1)}
                            className="cursor-pointer border border-border bg-background p-2 text-xs font-semibold uppercase tracking-[0.2em] transition hover:bg-primary hover:text-primary-foreground"
                          >
                            <IconChevronRight className="size-4" />
                          </button>
                        </div>
                        <span className="text-sm font-semibold text-muted-foreground">
                          {monthLabel}
                        </span>
                      </div>
                      <div className="grid grid-cols-7 gap-px border border-border bg-border text-xs text-muted-foreground">
                        {dayLabels.map((label) => (
                          <div
                            key={label}
                            className="bg-card px-2 py-2 text-center"
                          >
                            {label}
                          </div>
                        ))}
                        {Array.from({ length: startDay }).map((_, index) => (
                          <div
                            key={`empty-${index}`}
                            className="bg-background px-2 py-6"
                          />
                        ))}
                        {Array.from({ length: daysInMonth }).map((_, index) => {
                          const day = index + 1
                          const eventForDay = currentMonthEvents.find(
                            (event) =>
                              new Date(`${event.date}T00:00:00`).getDate() ===
                              day
                          )

                          return (
                            <div
                              key={day}
                              className={[
                                "bg-background px-2 py-6 text-sm",
                                eventForDay ? "border-l-2 border-red-500" : "",
                              ].join(" ")}
                            >
                              <span className="text-muted-foreground">
                                {day}
                              </span>
                              {eventForDay ? (
                                <div className="mt-2 text-xs font-medium text-foreground">
                                  {eventForDay.name}
                                </div>
                              ) : null}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    <div className="border border-border bg-background">
                      <div className="border-b border-border px-4 py-3">
                        <h3 className="text-sm font-semibold text-muted-foreground">
                          Liste des événements
                        </h3>
                      </div>
                      <div className="grid gap-3 p-4 text-sm">
                        {events.map((event) => (
                          <div
                            key={event.id}
                            className="grid items-center gap-3 border border-border bg-card p-3 md:grid-cols-[1.2fr_0.8fr_1fr_auto]"
                          >
                            <div className="font-medium">{event.name}</div>
                            <div className="text-muted-foreground">
                              {new Date(`${event.date}T00:00:00`).toLocaleDateString(
                                "fr-FR"
                              )}
                            </div>
                            <div className="text-muted-foreground max-w-[320px] truncate">
                              {event.description || "—"}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setEditEvent(event)}
                                className="flex cursor-pointer items-center gap-2 border border-border bg-background px-3 py-2 text-xs font-semibold transition hover:bg-primary hover:text-primary-foreground"
                              >
                                <IconPencil className="size-4" />
                                Modifier
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(event.id)}
                                className="flex cursor-pointer items-center gap-2 border border-border bg-background px-3 py-2 text-xs font-semibold transition hover:bg-primary hover:text-primary-foreground"
                              >
                                <IconTrash className="size-4" />
                                Supprimer
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
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
              <h2 className="text-lg font-semibold">Ajouter un événement</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="cursor-pointer text-sm text-muted-foreground hover:text-foreground"
              >
                Fermer
              </button>
            </div>
            <form onSubmit={handleSubmit} className="grid gap-3 text-sm">
              <label className="grid gap-1 text-xs text-muted-foreground">
                Nom
                <input
                  name="name"
                  required
                  className="border border-border bg-background px-3 py-2 text-sm text-foreground"
                  placeholder="Nom de l'événement"
                />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Date
                <input
                  type="date"
                  name="date"
                  required
                  className="border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Description
                <textarea
                  name="description"
                  rows={3}
                  className="border border-border bg-background px-3 py-2 text-sm text-foreground"
                  placeholder="Détails"
                />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Image (URL)
                <input
                  name="imageUrl"
                  className="border border-border bg-background px-3 py-2 text-sm text-foreground"
                  placeholder="https://"
                />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Image (fichier)
                <input
                  type="file"
                  name="imageFile"
                  accept="image/*"
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
      {editEvent ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl border border-border bg-background p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Modifier un événement</h2>
              <button
                type="button"
                onClick={() => setEditEvent(null)}
                className="cursor-pointer text-sm text-muted-foreground hover:text-foreground"
              >
                Fermer
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="grid gap-3 text-sm">
              <label className="grid gap-1 text-xs text-muted-foreground">
                Nom
                <input
                  name="name"
                  required
                  defaultValue={editEvent.name}
                  className="border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Date
                <input
                  type="date"
                  name="date"
                  required
                  defaultValue={editEvent.date}
                  className="border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Description
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={editEvent.description ?? ""}
                  className="border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Image (URL)
                <input
                  name="imageUrl"
                  defaultValue={editEvent.image_url ?? ""}
                  className="border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Image (fichier)
                <input
                  type="file"
                  name="imageFile"
                  accept="image/*"
                  className="border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </label>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditEvent(null)}
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
