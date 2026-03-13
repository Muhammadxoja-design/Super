import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAddAdmin, useAdminUserSearch } from "@/hooks/use-admin";
import { useToast } from "@/hooks/use-toast";
import {
  getCities,
  getDistricts,
  getMahallas,
  getRegions,
} from "@/lib/locations";
import { DIRECTIONS } from "@shared/schema";
import { Loader2, Search, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export function UsersPanel() {
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState<string>("");
  const [viloyat, setViloyat] = useState("");
  const [tuman, setTuman] = useState("");
  const [shahar, setShahar] = useState("");
  const [mahalla, setMahalla] = useState("");
  const [direction, setDirection] = useState("");
  const [sort, setSort] = useState<string>("created_at");
  const [lastActiveAfter, setLastActiveAfter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const addAdmin = useAddAdmin();
  const { toast } = useToast();

  const [debouncedFilters, setDebouncedFilters] = useState({
    q: "",
    status: "",
    viloyat: "",
    tuman: "",
    shahar: "",
    mahalla: "",
    direction: "",
    sort: "created_at",
    lastActiveAfter: "",
  });

  useEffect(() => {
    const handle = setTimeout(() => {
      setPage(1);
      setDebouncedFilters({
        q: searchInput.trim(),
        status,
        viloyat,
        tuman,
        shahar,
        mahalla,
        direction,
        sort,
        lastActiveAfter,
      });
    }, 400);
    return () => clearTimeout(handle);
  }, [
    status,
    viloyat,
    tuman,
    shahar,
    mahalla,
    direction,
    searchInput,
    sort,
    lastActiveAfter,
  ]);

  useEffect(() => {
    setTuman("");
    setShahar("");
    setMahalla("");
  }, [viloyat]);

  useEffect(() => {
    setShahar("");
    setMahalla("");
  }, [tuman]);

  useEffect(() => {
    setMahalla("");
  }, [shahar]);

  const regionOptions = useMemo(() => getRegions(), []);
  const districtOptions = useMemo(() => getDistricts(viloyat), [viloyat]);
  const cityOptions = useMemo(
    () => getCities(viloyat, tuman),
    [viloyat, tuman],
  );
  const mahallaOptions = useMemo(
    () => getMahallas(viloyat, tuman, shahar),
    [viloyat, tuman, shahar],
  );

  const { data, isLoading, isFetching } = useAdminUserSearch({
    query: debouncedFilters.q || undefined,
    status: debouncedFilters.status || undefined,
    viloyat: debouncedFilters.viloyat || undefined,
    tuman: debouncedFilters.tuman || undefined,
    shahar: debouncedFilters.shahar || undefined,
    mahalla: debouncedFilters.mahalla || undefined,
    direction: debouncedFilters.direction || undefined,
    lastActiveAfter: debouncedFilters.lastActiveAfter || undefined,
    sort: debouncedFilters.sort,
    page,
    pageSize,
  });

  useEffect(() => {
    if (data?.totalPages && page > data.totalPages) {
      setPage(data.totalPages);
    }
  }, [data?.totalPages, page]);

  const users = data?.items || [];
  const totalPages = data?.totalPages ?? 1;

  const handleReset = () => {
    setSearchInput("");
    setStatus("");
    setViloyat("");
    setTuman("");
    setShahar("");
    setMahalla("");
    setDirection("");
    setSort("created_at");
    setLastActiveAfter("");
    setPage(1);
  };

  const handleMakeAdmin = async (userId: number) => {
    try {
      await addAdmin.mutateAsync(userId);
      toast({ title: "Admin qo'shildi" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Xatolik",
        description: error.message || "Admin qo'shilmadi",
      });
    }
  };

  return (
    <div className="admin-panel">
      <div className="glass-card admin-card rounded-2xl border border-white/10 p-5 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">Foydalanuvchilar filtri</h2>
            <p className="text-xs text-muted-foreground">
              Qidirish, saralash va admin belgilashni tezlashtiring.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Ism/familiya/telefon/telegram username/id bo'yicha qidirish..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <select
              className="h-11 rounded-md border border-border bg-background px-3 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Barchasi (status)</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              className="h-11 rounded-md border border-border bg-background px-3 text-sm"
              value={viloyat}
              onChange={(e) => setViloyat(e.target.value)}
            >
              <option value="">Barcha viloyatlar</option>
              {regionOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              className="h-11 rounded-md border border-border bg-background px-3 text-sm"
              value={tuman}
              onChange={(e) => setTuman(e.target.value)}
              disabled={!viloyat}
            >
              <option value="">Barcha tumanlar</option>
              {districtOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <select
              className="h-11 rounded-md border border-border bg-background px-3 text-sm"
              value={shahar}
              onChange={(e) => setShahar(e.target.value)}
              disabled={!viloyat || !tuman || cityOptions.length === 0}
            >
              <option value="">Barcha shaharlar</option>
              {cityOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              className="h-11 rounded-md border border-border bg-background px-3 text-sm"
              value={mahalla}
              onChange={(e) => setMahalla(e.target.value)}
              disabled={!viloyat || !tuman}
            >
              <option value="">Barcha mahallalar</option>
              {mahallaOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              className="h-11 rounded-md border border-border bg-background px-3 text-sm"
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
            >
              <option value="">Barcha yo'nalishlar</option>
              {DIRECTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <select
              className="h-11 rounded-md border border-border bg-background px-3 text-sm"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="last_active">Faollik bo'yicha</option>
              <option value="created_at">Yaratilgan sana</option>
              <option value="tasks_completed">Bajarilgan buyruqlar</option>
            </select>

            <Input
              placeholder="Last active after (YYYY-MM-DD)"
              value={lastActiveAfter}
              onChange={(e) => setLastActiveAfter(e.target.value)}
            />

            <Button variant="outline" onClick={handleReset}>
              Reset filters
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {isFetching ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              Qidiruv yangilanmoqda...
            </div>
          ) : null}
          {!users.length ? (
            <div className="text-center text-muted-foreground py-10 space-y-2">
              <div>Foydalanuvchilar topilmadi</div>
              <div className="text-xs">
                Filtrlarni tozalang yoki qidiruvni qisqartiring
              </div>
            </div>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                className="admin-card glass-card p-5 rounded-2xl border border-white/5"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg">
                      {user.firstName || user.username}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {user.direction || "-"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={user.status} />
                    {user.role && user.role !== "user" ? (
                      <StatusBadge status={user.role} />
                    ) : null}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-y-2 text-sm text-muted-foreground/80">
                  <div>
                    Location: {user.viloyat || user.region || "Unknown"}
                    {user.tuman || user.district
                      ? `, ${user.tuman || user.district}`
                      : ""}
                  </div>
                  <div>Phone: {user.phone || "Unknown"}</div>
                </div>
                {user.role === "user" && (
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMakeAdmin(user.id)}
                      disabled={addAdmin.isPending}
                    >
                      Admin qilish
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      <div className="flex justify-between items-center mt-6">
        <Button
          variant="outline"
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page <= 1}
        >
          Oldingi
        </Button>
        <span className="text-xs text-muted-foreground">
          Sahifa {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
        >
          Keyingi
        </Button>
      </div>
    </div>
  );
}
