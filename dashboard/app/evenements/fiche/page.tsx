"use client"

import * as React from "react"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

type FormState = {
  structure: string
  eventName: string
  eventDate: string
  eventLocation: string
  eventType: string
  maxPeople: string
  capacity75: string
  program: string
  budget: string
  psc1: string
  psc1Count: string
  prosRescuers: string
  prosRescuersCount: string
  securityAgents: string
  securityAgentsCount: string
  staffPresence: string
  staffPresenceCount: string
  preventionStand: string
  geographicRisk: string
  geographicMeasures: string
  drinks: string
  proBarmen: string
  healthRelays: string
  drinkPlan: string
  roadSafety: string
  roadSafetyDetails: string
  awareness: string
  awarenessDetails: string
  otherPrevention: string
  declarationDate: string
  linkedToDirection: string
  representativeName: string
  representativeRole: string
  signature: string
  signatureFile?: File | null
  headOpinion: string
}

const initialState: FormState = {
  structure: "",
  eventName: "",
  eventDate: "",
  eventLocation: "",
  eventType: "",
  maxPeople: "",
  capacity75: "",
  program: "",
  budget: "",
  psc1: "non",
  psc1Count: "",
  prosRescuers: "non",
  prosRescuersCount: "",
  securityAgents: "non",
  securityAgentsCount: "",
  staffPresence: "non",
  staffPresenceCount: "",
  preventionStand: "non",
  geographicRisk: "non",
  geographicMeasures: "",
  drinks: "non",
  proBarmen: "non",
  healthRelays: "non",
  drinkPlan: "",
  roadSafety: "non",
  roadSafetyDetails: "",
  awareness: "non",
  awarenessDetails: "",
  otherPrevention: "",
  declarationDate: "Le vendredi avant la semaine d’évènement",
  linkedToDirection: "non",
  representativeName: "",
  representativeRole: "",
  signature: "",
  signatureFile: null,
  headOpinion: "",
}

function drawWrappedText(options: {
  page: any
  text: string
  x: number
  y: number
  maxWidth: number
  lineHeight: number
  font: any
  size: number
  color: any
}) {
  const { page, text, x, y, maxWidth, lineHeight, font, size, color } = options
  const words = text.replace(/\n/g, " ").split(" ")
  let line = ""
  let cursorY = y
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word
    const width = font.widthOfTextAtSize(testLine, size)
    if (width > maxWidth) {
      page.drawText(line, { x, y: cursorY, size, font, color })
      line = word
      cursorY -= lineHeight
    } else {
      line = testLine
    }
  }
  if (line) {
    page.drawText(line, { x, y: cursorY, size, font, color })
  }
  return cursorY - lineHeight
}

async function generatePdf(values: FormState) {
  const pdfDoc = await PDFDocument.create()
  let page = pdfDoc.addPage([595.28, 841.89])
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  let signatureImage:
    | {
        width: number
        height: number
        image: any
      }
    | null = null
  if (values.signatureFile) {
    const arrayBuffer = await values.signatureFile.arrayBuffer()
    const isPng = values.signatureFile.type === "image/png"
    const image = isPng
      ? await pdfDoc.embedPng(arrayBuffer)
      : await pdfDoc.embedJpg(arrayBuffer)
    signatureImage = {
      width: image.width,
      height: image.height,
      image,
    }
  }
  const marginX = 40
  const pageWidth = 595.28
  const usableWidth = pageWidth - marginX * 2
  let y = 800
  const lineHeight = 13

  const ensureSpace = (height: number) => {
    if (y - height < 60) {
      page = pdfDoc.addPage([595.28, 841.89])
      y = 800
    }
  }

  const drawSectionTitle = (title: string) => {
    ensureSpace(26)
    page.drawRectangle({
      x: marginX,
      y: y - 18,
      width: usableWidth,
      height: 18,
      color: rgb(0.92, 0.93, 0.94),
    })
    page.drawText(title, {
      x: marginX + 6,
      y: y - 14,
      size: 11,
      font: bold,
      color: rgb(0.1, 0.1, 0.1),
    })
    y -= 28
  }

  const drawLineField = (label: string, value: string, height = 18) => {
    ensureSpace(height + 6)
    page.drawText(label, {
      x: marginX,
      y: y - 12,
      size: 9,
      font,
      color: rgb(0.15, 0.15, 0.15),
    })
    page.drawLine({
      start: { x: marginX + 180, y: y - 12 },
      end: { x: marginX + usableWidth, y: y - 12 },
      thickness: 0.6,
      color: rgb(0.7, 0.7, 0.7),
    })
    page.drawText(value || "", {
      x: marginX + 184,
      y: y - 12,
      size: 9,
      font,
      color: rgb(0.1, 0.1, 0.1),
    })
    y -= height
  }

  const drawCheckbox = (x: number, yPos: number, checked: boolean) => {
    page.drawRectangle({
      x,
      y: yPos,
      width: 10,
      height: 10,
      borderWidth: 0.8,
      borderColor: rgb(0.2, 0.2, 0.2),
    })
    if (checked) {
      page.drawLine({
        start: { x: x + 2, y: yPos + 5 },
        end: { x: x + 4, y: yPos + 2 },
        thickness: 1.2,
        color: rgb(0.1, 0.1, 0.1),
      })
      page.drawLine({
        start: { x: x + 4, y: yPos + 2 },
        end: { x: x + 8, y: yPos + 8 },
        thickness: 1.2,
        color: rgb(0.1, 0.1, 0.1),
      })
    }
  }

  const drawParagraph = (text: string) => {
    ensureSpace(40)
    y = drawWrappedText({
      page,
      text,
      x: marginX,
      y,
      maxWidth: usableWidth,
      lineHeight,
      font,
      size: 9,
      color: rgb(0.15, 0.15, 0.15),
    })
    y -= 6
  }

  page.drawRectangle({
    x: marginX,
    y: y - 22,
    width: usableWidth,
    height: 24,
    color: rgb(0.87, 0.91, 0.96),
  })
  page.drawText(
    "Fiche de description d’événements organisés par les étudiants",
    {
      x: marginX + 6,
      y: y - 16,
      size: 12,
      font: bold,
      color: rgb(0.08, 0.08, 0.08),
    }
  )
  y -= 36

  drawSectionTitle("Structure organisatrice :")
  drawLineField("Structure organisatrice :", values.structure)

  drawSectionTitle("Caractéristiques de l’événement :")
  ensureSpace(70)
  page.drawText("Type de lieu :", {
    x: marginX,
    y: y - 12,
    size: 9,
    font,
    color: rgb(0.15, 0.15, 0.15),
  })
  const typeValue = values.eventType.toLowerCase()
  drawCheckbox(marginX + 90, y - 14, typeValue.includes("bar"))
  page.drawText("Bar / discothèque", {
    x: marginX + 106,
    y: y - 12,
    size: 9,
    font,
  })
  drawCheckbox(marginX + 280, y - 14, typeValue.includes("bâtiment"))
  page.drawText("Bâtiment de votre établissement", {
    x: marginX + 296,
    y: y - 12,
    size: 9,
    font,
  })
  y -= 20
  drawCheckbox(marginX + 90, y - 14, typeValue.includes("salle"))
  page.drawText("Salle publique", {
    x: marginX + 106,
    y: y - 12,
    size: 9,
    font,
  })
  drawCheckbox(marginX + 280, y - 14, typeValue.includes("autres"))
  page.drawText("Autres :", {
    x: marginX + 296,
    y: y - 12,
    size: 9,
    font,
  })
  page.drawLine({
    start: { x: marginX + 340, y: y - 12 },
    end: { x: marginX + usableWidth, y: y - 12 },
    thickness: 0.6,
    color: rgb(0.7, 0.7, 0.7),
  })
  page.drawText(values.eventType || "", {
    x: marginX + 344,
    y: y - 12,
    size: 9,
    font,
  })
  y -= 28

  drawSectionTitle("Si l’événement se déroule au sein de votre établissement :")
  drawLineField(
    "Nombre maximum de personnes pouvant être accueillies en théorie dans la salle :",
    values.maxPeople
  )
  drawLineField("Jauge de 75% liée au contexte sanitaire :", values.capacity75)

  drawSectionTitle("Programme de l’événement :")
  drawParagraph(values.program || "—")

  drawSectionTitle("Budget de l’événement :")
  drawParagraph(values.budget || "—")

  drawSectionTitle("Éléments liés à la sécurité des personnes :")
  drawLineField("Présence d’organisateurs titulaires d’un brevet PSC1 ?", "")
  drawCheckbox(marginX + 360, y + 6, values.psc1 === "oui")
  page.drawText("oui", { x: marginX + 374, y: y + 8, size: 9, font })
  drawCheckbox(marginX + 410, y + 6, values.psc1 === "non")
  page.drawText("non", { x: marginX + 424, y: y + 8, size: 9, font })
  drawLineField("Si oui, effectif ?", values.psc1Count)
  drawLineField("Présence de secouristes professionnels sur le site ?", "")
  drawCheckbox(marginX + 360, y + 6, values.prosRescuers === "oui")
  page.drawText("oui", { x: marginX + 374, y: y + 8, size: 9, font })
  drawCheckbox(marginX + 410, y + 6, values.prosRescuers === "non")
  page.drawText("non", { x: marginX + 424, y: y + 8, size: 9, font })
  drawLineField("Si oui, effectif ?", values.prosRescuersCount)
  drawLineField("Présence d’agents de sécurité professionnels ?", "")
  drawCheckbox(marginX + 360, y + 6, values.securityAgents === "oui")
  page.drawText("oui", { x: marginX + 374, y: y + 8, size: 9, font })
  drawCheckbox(marginX + 410, y + 6, values.securityAgents === "non")
  page.drawText("non", { x: marginX + 424, y: y + 8, size: 9, font })
  drawLineField("Si oui, effectif ?  VOIR AVEC KHALIFA", values.securityAgentsCount)
  drawLineField(
    "Présence de membres de l’équipe pédagogique ou de présidence/direction ?",
    ""
  )
  drawCheckbox(marginX + 360, y + 6, values.staffPresence === "oui")
  page.drawText("oui", { x: marginX + 374, y: y + 8, size: 9, font })
  drawCheckbox(marginX + 410, y + 6, values.staffPresence === "non")
  page.drawText("non", { x: marginX + 424, y: y + 8, size: 9, font })
  drawLineField("Si oui, effectif ?", values.staffPresenceCount)
  drawLineField("Présence d’un stand de prévention ?", "")
  drawCheckbox(marginX + 360, y + 6, values.preventionStand === "oui")
  page.drawText("oui", { x: marginX + 374, y: y + 8, size: 9, font })
  drawCheckbox(marginX + 410, y + 6, values.preventionStand === "non")
  page.drawText("non", { x: marginX + 424, y: y + 8, size: 9, font })
  drawLineField(
    "Risque accidentel lié à l’environnement géographique (présence d’un point d’eau…)?",
    ""
  )
  drawCheckbox(marginX + 360, y + 6, values.geographicRisk === "oui")
  page.drawText("oui", { x: marginX + 374, y: y + 8, size: 9, font })
  drawCheckbox(marginX + 410, y + 6, values.geographicRisk === "non")
  page.drawText("non", { x: marginX + 424, y: y + 8, size: 9, font })
  drawParagraph(values.geographicMeasures || "—")

  drawSectionTitle("Éléments liés à la prévention et la réduction des risques :")
  drawLineField("Présence d’un débit de boisson ?", "")
  drawCheckbox(marginX + 360, y + 6, values.drinks === "oui")
  page.drawText("oui", { x: marginX + 374, y: y + 8, size: 9, font })
  drawCheckbox(marginX + 410, y + 6, values.drinks === "non")
  page.drawText("non", { x: marginX + 424, y: y + 8, size: 9, font })
  drawLineField("Présence de barmans professionnels ?", "")
  drawCheckbox(marginX + 360, y + 6, values.proBarmen === "oui")
  page.drawText("oui", { x: marginX + 374, y: y + 8, size: 9, font })
  drawCheckbox(marginX + 410, y + 6, values.proBarmen === "non")
  page.drawText("non", { x: marginX + 424, y: y + 8, size: 9, font })
  drawLineField("Présence d’étudiants relais santé ?", "")
  drawCheckbox(marginX + 360, y + 6, values.healthRelays === "oui")
  page.drawText("oui", { x: marginX + 374, y: y + 8, size: 9, font })
  drawCheckbox(marginX + 410, y + 6, values.healthRelays === "non")
  page.drawText("non", { x: marginX + 424, y: y + 8, size: 9, font })
  drawLineField(
    "Descriptif du dispositif de distribution de boissons alcoolisées et non alcoolisées :",
    ""
  )
  drawParagraph(values.drinkPlan || "—")
  drawLineField("Dispositif de sécurité routière ?", "")
  drawCheckbox(marginX + 360, y + 6, values.roadSafety === "oui")
  page.drawText("oui", { x: marginX + 374, y: y + 8, size: 9, font })
  drawCheckbox(marginX + 410, y + 6, values.roadSafety === "non")
  page.drawText("non", { x: marginX + 424, y: y + 8, size: 9, font })
  drawLineField("Si oui, lequel ?", values.roadSafetyDetails)
  drawLineField(
    "Moyens de sensibilisation aux risques liés à l’alcool et aux substances psychoactives ?",
    ""
  )
  drawCheckbox(marginX + 360, y + 6, values.awareness === "oui")
  page.drawText("oui", { x: marginX + 374, y: y + 8, size: 9, font })
  drawCheckbox(marginX + 410, y + 6, values.awareness === "non")
  page.drawText("non", { x: marginX + 424, y: y + 8, size: 9, font })
  drawLineField("Si oui, lesquels ?", values.awarenessDetails)
  drawParagraph(values.otherPrevention || "—")

  drawSectionTitle(
    "Date de dépôt de la déclaration auprès des établissements :"
  )
  drawParagraph(values.declarationDate || "—")

  drawSectionTitle(
    "Organisation menée en lien avec la présidence/direction :"
  )
  drawLineField("Organisation menée en lien avec la présidence/direction :", "")
  drawCheckbox(marginX + 360, y + 6, values.linkedToDirection === "oui")
  page.drawText("oui", { x: marginX + 374, y: y + 8, size: 9, font })
  drawCheckbox(marginX + 410, y + 6, values.linkedToDirection === "non")
  page.drawText("non", { x: marginX + 424, y: y + 8, size: 9, font })

  drawSectionTitle("Représentant de la structure organisatrice :")
  drawLineField("Date :", values.eventDate)
  drawLineField("Nom :", values.representativeName)
  drawLineField("Qualité :", values.representativeRole)
  drawLineField("Signature :", values.signature)

  drawSectionTitle("Avis du chef d’établissement :")
  drawParagraph(values.headOpinion || "—")

  if (signatureImage) {
    const sigPage = pdfDoc.addPage([595.28, 841.89])
    sigPage.drawText("Signature :", {
      x: marginX,
      y: 780,
      size: 12,
      font: bold,
      color: rgb(0.1, 0.1, 0.1),
    })
    const maxWidth = 250
    const maxHeight = 120
    const scale = Math.min(
      maxWidth / signatureImage.width,
      maxHeight / signatureImage.height
    )
    const drawWidth = signatureImage.width * scale
    const drawHeight = signatureImage.height * scale
    sigPage.drawImage(signatureImage.image, {
      x: marginX,
      y: 760 - drawHeight,
      width: drawWidth,
      height: drawHeight,
    })
  }

  const pdfBytes = await pdfDoc.save()
  const blob = new Blob([pdfBytes], { type: "application/pdf" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `fiche-evenement-${values.eventName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "") || "evenement"}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export default function Page() {
  const [values, setValues] = React.useState<FormState>(initialState)

  const updateField = (
    key: keyof FormState,
    value: string
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await generatePdf(values)
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
                <form
                  onSubmit={handleSubmit}
                  className="grid gap-6 border border-border bg-card p-6 text-sm"
                >
                  <div>
                    <h2 className="text-lg font-semibold">
                      Fiche de description d’événement
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Remplis tous les champs pour générer un PDF.
                    </p>
                  </div>

                  <label className="grid gap-1">
                    Structure organisatrice
                    <input
                      value={values.structure}
                      onChange={(e) => updateField("structure", e.target.value)}
                      className="border border-border bg-background px-3 py-2"
                    />
                  </label>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="grid gap-1">
                      Nom de l’événement
                      <input
                        value={values.eventName}
                        onChange={(e) => updateField("eventName", e.target.value)}
                        className="border border-border bg-background px-3 py-2"
                      />
                    </label>
                    <label className="grid gap-1">
                      Date
                      <input
                        type="date"
                        value={values.eventDate}
                        onChange={(e) => updateField("eventDate", e.target.value)}
                        className="border border-border bg-background px-3 py-2"
                      />
                    </label>
                    <label className="grid gap-1">
                      Lieu
                      <input
                        value={values.eventLocation}
                        onChange={(e) =>
                          updateField("eventLocation", e.target.value)
                        }
                        className="border border-border bg-background px-3 py-2"
                      />
                    </label>
                    <label className="grid gap-1">
                      Type de lieu
                      <input
                        value={values.eventType}
                        onChange={(e) => updateField("eventType", e.target.value)}
                        className="border border-border bg-background px-3 py-2"
                        placeholder="Bar / discothèque, Salle publique, etc."
                      />
                    </label>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="grid gap-1">
                      Nombre max de personnes
                      <input
                        value={values.maxPeople}
                        onChange={(e) => updateField("maxPeople", e.target.value)}
                        className="border border-border bg-background px-3 py-2"
                      />
                    </label>
                    <label className="grid gap-1">
                      Jauge 75%
                      <input
                        value={values.capacity75}
                        onChange={(e) => updateField("capacity75", e.target.value)}
                        className="border border-border bg-background px-3 py-2"
                      />
                    </label>
                  </div>

                  <label className="grid gap-1">
                    Programme de l’événement
                    <textarea
                      value={values.program}
                      onChange={(e) => updateField("program", e.target.value)}
                      className="border border-border bg-background px-3 py-2"
                      rows={4}
                    />
                  </label>

                  <label className="grid gap-1">
                    Budget de l’événement
                    <textarea
                      value={values.budget}
                      onChange={(e) => updateField("budget", e.target.value)}
                      className="border border-border bg-background px-3 py-2"
                      rows={3}
                    />
                  </label>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="grid gap-1">
                      PSC1
                      <select
                        value={values.psc1}
                        onChange={(e) => updateField("psc1", e.target.value)}
                        className="border border-border bg-background px-3 py-2"
                      >
                        <option value="oui">oui</option>
                        <option value="non">non</option>
                      </select>
                    </label>
                    <label className="grid gap-1">
                      Effectif PSC1
                      <input
                        value={values.psc1Count}
                        onChange={(e) => updateField("psc1Count", e.target.value)}
                        className="border border-border bg-background px-3 py-2"
                      />
                    </label>
                    <label className="grid gap-1">
                      Secouristes professionnels
                      <select
                        value={values.prosRescuers}
                        onChange={(e) =>
                          updateField("prosRescuers", e.target.value)
                        }
                        className="border border-border bg-background px-3 py-2"
                      >
                        <option value="oui">oui</option>
                        <option value="non">non</option>
                      </select>
                    </label>
                    <label className="grid gap-1">
                      Effectif secouristes
                      <input
                        value={values.prosRescuersCount}
                        onChange={(e) =>
                          updateField("prosRescuersCount", e.target.value)
                        }
                        className="border border-border bg-background px-3 py-2"
                      />
                    </label>
                    <label className="grid gap-1">
                      Agents de sécurité
                      <select
                        value={values.securityAgents}
                        onChange={(e) =>
                          updateField("securityAgents", e.target.value)
                        }
                        className="border border-border bg-background px-3 py-2"
                      >
                        <option value="oui">oui</option>
                        <option value="non">non</option>
                      </select>
                    </label>
                    <label className="grid gap-1">
                      Effectif agents de sécurité
                      <input
                        value={values.securityAgentsCount}
                        onChange={(e) =>
                          updateField("securityAgentsCount", e.target.value)
                        }
                        className="border border-border bg-background px-3 py-2"
                      />
                    </label>
                    <label className="grid gap-1">
                      Équipe pédagogique / direction
                      <select
                        value={values.staffPresence}
                        onChange={(e) =>
                          updateField("staffPresence", e.target.value)
                        }
                        className="border border-border bg-background px-3 py-2"
                      >
                        <option value="oui">oui</option>
                        <option value="non">non</option>
                      </select>
                    </label>
                    <label className="grid gap-1">
                      Effectif équipe pédagogique
                      <input
                        value={values.staffPresenceCount}
                        onChange={(e) =>
                          updateField("staffPresenceCount", e.target.value)
                        }
                        className="border border-border bg-background px-3 py-2"
                      />
                    </label>
                    <label className="grid gap-1">
                      Stand de prévention
                      <select
                        value={values.preventionStand}
                        onChange={(e) =>
                          updateField("preventionStand", e.target.value)
                        }
                        className="border border-border bg-background px-3 py-2"
                      >
                        <option value="oui">oui</option>
                        <option value="non">non</option>
                      </select>
                    </label>
                    <label className="grid gap-1">
                      Risque accidentel géographique
                      <select
                        value={values.geographicRisk}
                        onChange={(e) =>
                          updateField("geographicRisk", e.target.value)
                        }
                        className="border border-border bg-background px-3 py-2"
                      >
                        <option value="oui">oui</option>
                        <option value="non">non</option>
                      </select>
                    </label>
                    <label className="grid gap-1 md:col-span-2">
                      Mesures complémentaires
                      <textarea
                        value={values.geographicMeasures}
                        onChange={(e) =>
                          updateField("geographicMeasures", e.target.value)
                        }
                        className="border border-border bg-background px-3 py-2"
                        rows={3}
                      />
                    </label>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="grid gap-1">
                      Débit de boisson
                      <select
                        value={values.drinks}
                        onChange={(e) => updateField("drinks", e.target.value)}
                        className="border border-border bg-background px-3 py-2"
                      >
                        <option value="oui">oui</option>
                        <option value="non">non</option>
                      </select>
                    </label>
                    <label className="grid gap-1">
                      Barmans professionnels
                      <select
                        value={values.proBarmen}
                        onChange={(e) => updateField("proBarmen", e.target.value)}
                        className="border border-border bg-background px-3 py-2"
                      >
                        <option value="oui">oui</option>
                        <option value="non">non</option>
                      </select>
                    </label>
                    <label className="grid gap-1">
                      Étudiants relais santé
                      <select
                        value={values.healthRelays}
                        onChange={(e) =>
                          updateField("healthRelays", e.target.value)
                        }
                        className="border border-border bg-background px-3 py-2"
                      >
                        <option value="oui">oui</option>
                        <option value="non">non</option>
                      </select>
                    </label>
                    <label className="grid gap-1 md:col-span-2">
                      Descriptif du dispositif de boissons
                      <textarea
                        value={values.drinkPlan}
                        onChange={(e) => updateField("drinkPlan", e.target.value)}
                        className="border border-border bg-background px-3 py-2"
                        rows={3}
                      />
                    </label>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="grid gap-1">
                      Dispositif de sécurité routière
                      <select
                        value={values.roadSafety}
                        onChange={(e) => updateField("roadSafety", e.target.value)}
                        className="border border-border bg-background px-3 py-2"
                      >
                        <option value="oui">oui</option>
                        <option value="non">non</option>
                      </select>
                    </label>
                    <label className="grid gap-1">
                      Détails sécurité routière
                      <input
                        value={values.roadSafetyDetails}
                        onChange={(e) =>
                          updateField("roadSafetyDetails", e.target.value)
                        }
                        className="border border-border bg-background px-3 py-2"
                      />
                    </label>
                    <label className="grid gap-1">
                      Sensibilisation alcool/substances
                      <select
                        value={values.awareness}
                        onChange={(e) => updateField("awareness", e.target.value)}
                        className="border border-border bg-background px-3 py-2"
                      >
                        <option value="oui">oui</option>
                        <option value="non">non</option>
                      </select>
                    </label>
                    <label className="grid gap-1">
                      Détails sensibilisation
                      <input
                        value={values.awarenessDetails}
                        onChange={(e) =>
                          updateField("awarenessDetails", e.target.value)
                        }
                        className="border border-border bg-background px-3 py-2"
                      />
                    </label>
                    <label className="grid gap-1 md:col-span-2">
                      Autres dispositifs de prévention
                      <textarea
                        value={values.otherPrevention}
                        onChange={(e) =>
                          updateField("otherPrevention", e.target.value)
                        }
                        className="border border-border bg-background px-3 py-2"
                        rows={3}
                      />
                    </label>
                  </div>

                  <label className="grid gap-1">
                    Date de dépôt de la déclaration
                    <input
                      value={values.declarationDate}
                      onChange={(e) =>
                        updateField("declarationDate", e.target.value)
                      }
                      className="border border-border bg-background px-3 py-2"
                    />
                  </label>

                  <label className="grid gap-1">
                    Organisation en lien avec la direction
                    <select
                      value={values.linkedToDirection}
                      onChange={(e) =>
                        updateField("linkedToDirection", e.target.value)
                      }
                      className="border border-border bg-background px-3 py-2"
                    >
                      <option value="oui">oui</option>
                      <option value="non">non</option>
                    </select>
                  </label>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="grid gap-1">
                      Nom du représentant
                      <input
                        value={values.representativeName}
                        onChange={(e) =>
                          updateField("representativeName", e.target.value)
                        }
                        className="border border-border bg-background px-3 py-2"
                      />
                    </label>
                    <label className="grid gap-1">
                      Qualité
                      <input
                        value={values.representativeRole}
                        onChange={(e) =>
                          updateField("representativeRole", e.target.value)
                        }
                        className="border border-border bg-background px-3 py-2"
                      />
                    </label>
                    <label className="grid gap-1 md:col-span-2">
                      Signature
                      <div className="grid gap-2">
                        <input
                          value={values.signature}
                          onChange={(e) =>
                            updateField("signature", e.target.value)
                          }
                          className="border border-border bg-background px-3 py-2"
                          placeholder="Nom ou mention"
                        />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            setValues((prev) => ({
                              ...prev,
                              signatureFile: e.target.files?.[0] ?? null,
                            }))
                          }
                          className="border border-border bg-background px-3 py-2"
                        />
                      </div>
                    </label>
                  </div>

                  <label className="grid gap-1">
                    Avis du chef d’établissement
                    <textarea
                      value={values.headOpinion}
                      onChange={(e) => updateField("headOpinion", e.target.value)}
                      className="border border-border bg-background px-3 py-2"
                      rows={3}
                    />
                  </label>

                  <div className="flex items-center justify-end">
                    <button
                      type="submit"
                      className="cursor-pointer border border-border bg-background px-4 py-2 text-xs font-semibold transition hover:bg-primary hover:text-primary-foreground"
                    >
                      Générer le PDF
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
