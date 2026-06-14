import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { StateCue } from "@/components/StateCue";
import { api, type Client } from "@/lib/api";
import { queryKeys } from "@/lib/queries";

/** Click a client row → this dialog. Loads the client's work (matters, documents,
 *  contracts, reviews the caller can see) on open; rows link out to their detail. */
export function ClientDialog({ client, onClose }: { client: Client | null; onClose: () => void }) {
  // Fetch only while a client is selected; cached per id so reopening is instant.
  const { data: overview } = useQuery({
    queryKey: queryKeys.client(client?.id ?? ""),
    queryFn: () => api.getClient(client!.id),
    enabled: !!client,
  });

  return (
    <Dialog open={!!client} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        {client && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <span className="truncate">{client.name}</span>
                {client.status === "inactive" && <StateCue tone="muted">Inactive</StateCue>}
              </DialogTitle>
              <DialogDescription className="capitalize">
                {client.type}
                {client.clientNumber && ` · No. ${client.clientNumber}`}
              </DialogDescription>
            </DialogHeader>

            {!overview ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-2/3" />
              </div>
            ) : (
              <div className="flex max-h-[70vh] flex-col gap-section overflow-y-auto">
                <Section title="Matters" empty="No matters you can access.">
                  {overview.matters.map(({ matter }) => (
                    <Row
                      key={matter.id}
                      to="/matters/$id"
                      id={matter.id}
                      onNavigate={onClose}
                      label={matter.name}
                      meta={matter.practiceArea ?? undefined}
                    />
                  ))}
                </Section>
                <Section title="Documents" empty="No documents.">
                  {overview.documents.map((d) => (
                    <Row
                      key={d.id}
                      to="/documents/$id"
                      id={d.id}
                      onNavigate={onClose}
                      label={d.title}
                      meta={d.fileType}
                    />
                  ))}
                </Section>
                <Section title="Reviews" empty="No reviews.">
                  {overview.reviews.map((rv) => (
                    <Row
                      key={rv.id}
                      to="/reviews/$id"
                      id={rv.id}
                      onNavigate={onClose}
                      label={rv.title}
                    />
                  ))}
                </Section>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h3>
      {children.length ? (
        <div className="flex flex-col divide-y divide-border">{children}</div>
      ) : (
        <p className="py-2 text-sm text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}

function Row({
  to,
  id,
  label,
  meta,
  onNavigate,
}: {
  to: "/matters/$id" | "/documents/$id" | "/reviews/$id";
  id: string;
  label: string;
  meta?: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      to={to}
      params={{ id }}
      onClick={onNavigate}
      className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted/50"
    >
      <span className="truncate">{label}</span>
      {meta && <span className="shrink-0 text-xs text-muted-foreground">{meta}</span>}
    </Link>
  );
}
