import { IconArrowDownRight, IconArrowUpRight } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function SectionCards() {
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Fonds disponibles</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            18 420 €
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconArrowUpRight />
              +4.2%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Hausse légère ce mois-ci <IconArrowUpRight className="size-4" />
          </div>
          <div className="text-muted-foreground">Solde consolidé</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Cotisations à venir</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            6 750 €
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconArrowDownRight />
              -1.8%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Ralentissement des entrées <IconArrowDownRight className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Rappels à planifier
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Dépenses prévues</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            4 980 €
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconArrowUpRight />
              +3.1%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Budget encours <IconArrowUpRight className="size-4" />
          </div>
          <div className="text-muted-foreground">Prévisions Q1</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Budget restant</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            12 300 €
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconArrowUpRight />
              +2.0%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Marge disponible <IconArrowUpRight className="size-4" />
          </div>
          <div className="text-muted-foreground">Suivi mensuel</div>
        </CardFooter>
      </Card>
    </div>
  )
}
