import React, { useState, useMemo } from 'react';
import {
  Building2,
  Search,
  Plus,
  Users,
  GraduationCap,
  Award,
  MapPin,
  Phone,
  Mail,
  Edit2,
  Trash2,
  Eye,
  LayoutGrid,
  List,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { useBranches, useDeleteBranch } from './useBranches';
import { BranchModal } from './BranchModal';
import { BranchDetailsModal } from './BranchDetailsModal';
import type { BranchDto } from '@/types';

export const BranchesView: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchDto | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<BranchDto | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [deletingBranchId, setDeletingBranchId] = useState<number | null>(null);

  const {
    data: branches = [],
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useBranches({
    status: selectedStatus === 'all' ? undefined : selectedStatus,
    region: selectedRegion === 'all' ? undefined : selectedRegion,
    search: search || undefined,
  });

  const deleteMutation = useDeleteBranch();

  // Aggregate KPI metrics
  const kpis = useMemo(() => {
    const totalBranches = branches.length;
    const activeBranches = branches.filter((b) => b.status === 'ACTIVE').length;
    const totalStudents = branches.reduce((acc, b) => acc + (b.studentCount || 0), 0);
    const totalGroups = branches.reduce((acc, b) => acc + (b.groupCount || 0), 0);
    const totalMentors = branches.reduce((acc, b) => acc + (b.mentorCount || 0), 0);

    return { totalBranches, activeBranches, totalStudents, totalGroups, totalMentors };
  }, [branches]);

  // Extract unique regions for filter
  const regions = useMemo(() => {
    const set = new Set<string>();
    branches.forEach((b) => {
      if (b.region) set.add(b.region);
    });
    return Array.from(set);
  }, [branches]);

  const handleDelete = async (branch: BranchDto) => {
    const confirmed = window.confirm(
      `"${branch.name}" filialini o‘chirish yoki arxivlashni tasdiqlaysizmi? Agar filialga guruhlar biriktirilgan bo‘lsa, u xavfsiz holda "ARCHIVED" holatiga o‘tkaziladi.`
    );
    if (!confirmed) return;

    try {
      setDeletingBranchId(branch.id);
      await deleteMutation.mutateAsync(branch.id);
      refetch();
    } catch (err) {
      console.error('Failed to delete branch:', err);
    } finally {
      setDeletingBranchId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            Filiallar & Markazlar
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Al-Xorazmiy Vorislari tizimidagi hududiy ta‘lim filiallari va infratuzilma boshqaruvi
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
            <span>Yangilash</span>
          </Button>
          <Button onClick={() => setIsCreateOpen(true)} size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" />
            <span>Yangi filial</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-card border">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Jami filiallar</span>
            <Building2 className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold">{isLoading ? '...' : kpis.totalBranches}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Faol: <span className="font-semibold text-emerald-600">{kpis.activeBranches}</span> ta markaz
          </div>
        </Card>

        <Card className="p-4 bg-card border">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Jami o‘quvchilar</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold">{isLoading ? '...' : kpis.totalStudents}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Filiallar bo‘yicha tahsil oluvchilar
          </div>
        </Card>

        <Card className="p-4 bg-card border">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Ta‘lim guruhlari</span>
            <GraduationCap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold">{isLoading ? '...' : kpis.totalGroups}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Faol o‘quv sinflari & kohortlar</div>
        </Card>

        <Card className="p-4 bg-card border">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Biriktirilgan mentorlar</span>
            <Award className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold">{isLoading ? '...' : kpis.totalMentors}</div>
          <div className="text-xs text-muted-foreground mt-0.5">IT va til sohasi murabbiylari</div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-card border">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filial nomi, kodi, hududi yoki tumani bo‘yicha qidiruv..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              aria-label="Hudud bo'yicha saralash"
              className="h-9 px-3 py-1 bg-background border rounded-md text-sm shadow-xs focus:ring-2 focus:ring-ring focus:outline-hidden"
            >
              <option value="all">Barcha hududlar</option>
              {regions.map((reg) => (
                <option key={reg} value={reg}>
                  {reg}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              aria-label="Holat bo'yicha saralash"
              className="h-9 px-3 py-1 bg-background border rounded-md text-sm shadow-xs focus:ring-2 focus:ring-ring focus:outline-hidden"
            >
              <option value="all">Barcha holatlar</option>
              <option value="ACTIVE">Faol (ACTIVE)</option>
              <option value="INACTIVE">Nofaol (INACTIVE)</option>
              <option value="ARCHIVED">Arxivlangan (ARCHIVED)</option>
            </select>

            <div className="flex border rounded-md p-0.5 bg-muted/40">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-sm transition-colors ${
                  viewMode === 'grid' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'
                }`}
                title="Katak ko'rinishi"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-sm transition-colors ${
                  viewMode === 'table' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'
                }`}
                title="Jadval ko'rinishi"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 p-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>Filiallar ma‘lumotlarini yuklashda xatolik: {error.message}</span>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && branches.length === 0 && (
        <Card className="p-12 text-center bg-card border">
          <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-40" />
          <CardTitle className="text-lg">Hech qanday filial topilmadi</CardTitle>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
            Qidiruv mezonlarini o‘zgartiring yoki yangi filial qo‘shing.
          </p>
          <Button onClick={() => setIsCreateOpen(true)} size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" />
            <span>Yangi filial qo‘shish</span>
          </Button>
        </Card>
      )}

      {/* Grid View */}
      {!isLoading && branches.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((branch) => (
            <Card
              key={branch.id}
              className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow border bg-card"
            >
              <div className="space-y-3">
                {/* Branch Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <h3 className="font-bold text-base leading-snug line-clamp-1">
                      {branch.name}
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="font-mono text-xs">
                        {branch.code}
                      </Badge>
                      <Badge
                        variant={
                          branch.status === 'ACTIVE'
                            ? 'default'
                            : branch.status === 'ARCHIVED'
                            ? 'destructive'
                            : 'secondary'
                        }
                        className="text-[10px] px-1.5 py-0"
                      >
                        {branch.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                </div>

                {/* Location & Contacts */}
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-primary" />
                    <span className="line-clamp-1">
                      {branch.region}
                      {branch.district ? `, ${branch.district}` : ''}
                    </span>
                  </div>
                  {branch.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{branch.phone}</span>
                    </div>
                  )}
                  {branch.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="line-clamp-1">{branch.email}</span>
                    </div>
                  )}
                </div>

                {/* Metric Mini-Grid */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t text-center">
                  <div className="bg-muted/40 p-2 rounded-md">
                    <div className="text-xs text-muted-foreground">O‘quvchilar</div>
                    <div className="font-bold text-sm">{branch.studentCount ?? 0}</div>
                  </div>
                  <div className="bg-muted/40 p-2 rounded-md">
                    <div className="text-xs text-muted-foreground">Guruhlar</div>
                    <div className="font-bold text-sm">{branch.groupCount ?? 0}</div>
                  </div>
                  <div className="bg-muted/40 p-2 rounded-md">
                    <div className="text-xs text-muted-foreground">Mentorlar</div>
                    <div className="font-bold text-sm">{branch.mentorCount ?? 0}</div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between gap-2 pt-4 mt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs gap-1"
                  onClick={() => {
                    setSelectedBranch(branch);
                    setIsDetailOpen(true);
                  }}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Batafsil</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="px-2.5 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setEditingBranch(branch)}
                  title="Tahrirlash"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="px-2.5 text-xs text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(branch)}
                  disabled={deletingBranchId === branch.id}
                  title="O'chirish yoki arxivlash"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Table View */}
      {!isLoading && branches.length > 0 && viewMode === 'table' && (
        <Card className="border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Kodi</TableHead>
                <TableHead>Filial nomi</TableHead>
                <TableHead>Hudud / Tuman</TableHead>
                <TableHead className="text-center">Guruhlar</TableHead>
                <TableHead className="text-center">O‘quvchilar</TableHead>
                <TableHead className="text-center">Mentorlar</TableHead>
                <TableHead className="text-center">Xonalar</TableHead>
                <TableHead className="text-center">Holat</TableHead>
                <TableHead className="text-right">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.map((branch) => (
                <TableRow key={branch.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono font-medium">{branch.code}</TableCell>
                  <TableCell className="font-semibold">{branch.name}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {branch.region}
                    {branch.district ? ` (${branch.district})` : ''}
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {branch.groupCount ?? 0}
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {branch.studentCount ?? 0}
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {branch.mentorCount ?? 0}
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {branch.roomCount ?? 0}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={
                        branch.status === 'ACTIVE'
                          ? 'default'
                          : branch.status === 'ARCHIVED'
                          ? 'destructive'
                          : 'secondary'
                      }
                      className="text-xs"
                    >
                      {branch.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => {
                          setSelectedBranch(branch);
                          setIsDetailOpen(true);
                        }}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => setEditingBranch(branch)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(branch)}
                        disabled={deletingBranchId === branch.id}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create Modal */}
      <BranchModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => refetch()}
      />

      {/* Edit Modal */}
      {editingBranch && (
        <BranchModal
          isOpen={!!editingBranch}
          branch={editingBranch}
          onClose={() => setEditingBranch(null)}
          onSuccess={() => refetch()}
        />
      )}

      {/* Details Modal */}
      <BranchDetailsModal
        isOpen={isDetailOpen}
        branch={selectedBranch}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedBranch(null);
        }}
        onEdit={(b) => setEditingBranch(b)}
      />
    </div>
  );
};
