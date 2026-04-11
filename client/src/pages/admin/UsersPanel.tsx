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
import { Loader2, Search, Users, MapPin, Phone, Shield, Filter, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
  }, [status, viloyat, tuman, shahar, mahalla, direction, searchInput, sort, lastActiveAfter]);

  useEffect(() => {
    setTuman("");
    setShahar("");
    setMahalla("");
  }, [viloyat]);

  const regionOptions = useMemo(() => getRegions(), []);
  const districtOptions = useMemo(() => getDistricts(viloyat), [viloyat]);
  const cityOptions = useMemo(() => getCities(viloyat, tuman), [viloyat, tuman]);
  const mahallaOptions = useMemo(() => getMahallas(viloyat, tuman, shahar), [viloyat, tuman, shahar]);

  const { data, isLoading, isFetching } = useAdminUserSearch({
    ...debouncedFilters,
    query: debouncedFilters.q || undefined,
    page,
    pageSize,
  });

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
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-white tracking-tight">Foydalanuvchilar</h2>
          <p className="text-xs text-zinc-500 font-medium tracking-widest uppercase">Database Management Console</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} className="h-9 rounded-xl border-white/5 bg-white/5 hover:bg-white/10 text-zinc-400">
            <RotateCcw className="h-4 w-4 mr-2" /> Reset
          </Button>
          <div className="h-9 px-4 flex items-center rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400 text-xs font-bold">
            {data?.total ?? 0} jami
          </div>
        </div>
      </div>

      {/* Floating Filter Bar */}
      <div className="rounded-[2rem] p-6 bg-white/[0.02] border border-white/[0.08] backdrop-blur-3xl shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Qidirish (ism, tel, username)..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10 h-11 bg-black/40 border-white/5 focus:border-violet-500/50 rounded-xl"
            />
          </div>
          
          <select
            className="h-11 rounded-xl border border-white/5 bg-black/40 px-3 text-sm text-zinc-300 focus:border-violet-500/50 outline-none"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Barcha statuslar</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            className="h-11 rounded-xl border border-white/5 bg-black/40 px-3 text-sm text-zinc-300 focus:border-violet-500/50 outline-none"
            value={viloyat}
            onChange={(e) => setViloyat(e.target.value)}
          >
            <option value="">Viloyat...</option>
            {regionOptions.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>

          <select
            className="h-11 rounded-xl border border-white/5 bg-black/40 px-3 text-sm text-zinc-300 focus:border-violet-500/50 outline-none"
            value={tuman}
            onChange={(e) => setTuman(e.target.value)}
            disabled={!viloyat}
          >
            <option value="">Tuman...</option>
            {districtOptions.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
      </div>

      {/* User List/Grid */}
      <div className="relative min-h-[400px]">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {users.map((user, i) => (
                <motion.div
                  key={user.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05, duration: 0.4 }}
                  className="group relative overflow-hidden rounded-[1.5rem] p-5 bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/10 transition-all shadow-xl"
                >
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 font-bold">
                          {user.firstName?.charAt(0) || user.username?.charAt(0) || "U"}
                        </div>
                        <div>
                          <h4 className="font-bold text-white/90 leading-tight">{user.firstName} {user.lastName}</h4>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">@{user.username || 'no-username'}</p>
                        </div>
                      </div>
                      <StatusBadge status={user.status} />
                    </div>

                    <div className="space-y-2 mb-4 text-[11px] text-zinc-400">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-zinc-600" />
                        <span>{user.viloyat}, {user.tuman}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3 text-zinc-600" />
                        <span>{user.phone || 'Noma\'lum'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Filter className="h-3 w-3 text-zinc-600" />
                        <span>{user.direction || 'Yo\'nalish yo\'q'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <span className="text-[9px] text-zinc-600 font-bold">ID: #{user.id}</span>
                      {user.role === "user" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMakeAdmin(user.id)}
                          disabled={addAdmin.isPending}
                          className="h-8 rounded-lg border-violet-500/20 bg-violet-500/5 text-violet-400 text-[10px] uppercase font-black hover:bg-violet-600 hover:text-white transition-all shadow-lg shadow-violet-900/10"
                        >
                          <Shield className="h-3 w-3 mr-1.5" /> Admin Qilish
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Subtle Background Accent */}
                  <div className="absolute bottom-0 right-0 p-1 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Users className="h-20 w-20 text-white" />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {!users.length && !isLoading && (
              <div className="col-span-full py-20 text-center">
                <Users className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-500 font-bold">Hozircha foydalanuvchilar yo'q</p>
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-1">Filtrlarni tekshiring yoki qidiruvni o'zgartiring</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="h-9 rounded-xl border-white/5 bg-white/5"
        >
          Oldingi
        </Button>
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
          Sahifa {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="h-9 rounded-xl border-white/5 bg-white/5"
        >
          Keyingi
        </Button>
      </div>
    </div>
  );
}
