import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "@/components/StatusBadge";
import BusinessBadge from "@/components/BusinessBadge";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function CustomerList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [bizFilter, setBizFilter] = useState<string>("all");

  const { data: businesses } = useQuery({
    queryKey: ["businesses"],
    queryFn: () => api.businesses.list(),
  });

  const { data: customers, isLoading } = useQuery({
    queryKey: ["customers", search, statusFilter, bizFilter],
    queryFn: () => api.customers.list({ search, status: statusFilter, businessId: bizFilter }),
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Customers</h2>
        <p className="text-sm text-muted-foreground">{customers?.length ?? 0} customers</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New Lead</SelectItem>
            <SelectItem value="warm">Warm</SelectItem>
            <SelectItem value="hot">Hot</SelectItem>
            <SelectItem value="negotiation">Negotiation</SelectItem>
            <SelectItem value="closed">Closed Won</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
        <Select value={bizFilter} onValueChange={setBizFilter}>
          <SelectTrigger className="w-36 h-9">
            <SelectValue placeholder="Business" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Business</SelectItem>
            {businesses?.map((b: any) => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground p-8 text-center">Loading...</div>
      ) : !customers?.length ? (
        <div className="text-sm text-muted-foreground p-8 text-center">
          No customers found. <Link to="/customers/new" className="underline">Add your first customer</Link>
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {customers.map((c: any) => (
            <Link
              key={c.id}
              to={`/customers/${c.id}`}
              className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
            >
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{c.name}</p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {c.customer_businesses?.map((cb: any) => (
                    <BusinessBadge key={cb.business_id} name={cb.businesses?.name} />
                  ))}
                  {c.source && <span className="text-xs text-muted-foreground">via {c.source}</span>}
                  {c.phone && <span className="text-xs text-muted-foreground font-mono">{c.phone}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {c.estimatedValue && (
                  <span className="text-xs font-mono text-green-600 hidden sm:block">
                    IDR {Number(c.estimatedValue).toLocaleString()}
                  </span>
                )}
                <StatusBadge status={c.status} />
                <span className="text-xs text-muted-foreground font-mono">
                  {format(parseISO(c.updatedAt), "MMM d")}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
