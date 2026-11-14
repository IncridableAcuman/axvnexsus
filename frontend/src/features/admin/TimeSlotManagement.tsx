import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/app/providers/QueryProvider';
import {
  Clock,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { timeSlotApi } from '@/api';
import type { TimeSlot, TimeSlotRequest } from '@/types';
import { useTranslation } from '@/shared/i18n';
import { useToast } from '@/shared/ui/toast/ToastContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const TimeSlotManagement: React.FC = () => {
  const { t } = useTranslation();
  const toast = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('09:30');
  const [endTime, setEndTime] = useState('11:00');
  const [durationMinutes, setDurationMinutes] = useState<number>(90);
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: slots = [], isLoading, error } = useQuery({
    queryKey: ['time-slots-admin'],
    queryFn: () => timeSlotApi.getAllAdmin(),
  });

  const openCreateModal = () => {
    setEditingSlot(null);
    setName('');
    setStartTime('09:30');
    setEndTime('11:00');
    setDurationMinutes(90);
    setDisplayOrder(slots.length + 1);
    setDescription('');
    setActive(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (slot: TimeSlot) => {
    setEditingSlot(slot);
    setName(slot.name);
    setStartTime(slot.startTime);
    setEndTime(slot.endTime);
    setDurationMinutes(slot.durationMinutes || 90);
    setDisplayOrder(slot.displayOrder || 1);
    setDescription(slot.description || '');
    setActive(slot.active);
    setFormError(null);
    setIsModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: TimeSlotRequest) => {
      if (editingSlot) {
        return timeSlotApi.update(editingSlot.id, payload);
      } else {
        return timeSlotApi.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-slots-admin'] });
      queryClient.invalidateQueries({ queryKey: ['time-slots'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success(
        editingSlot
          ? t('scheduling.timeSlotsTitle') + ': muvaffaqiyatli yangilandi'
          : t('scheduling.timeSlotsTitle') + ': yangi vaqt qo‘shildi'
      );
      setIsModalOpen(false);
    },
    onError: (err: unknown) => {
      const respData = (err as { response?: { data?: { message?: string } } })?.response?.data;
      setFormError(respData?.message || 'Xatolik yuz berdi. Iltimos tekshirib qayta urinib ko‘ring.');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => timeSlotApi.toggleActive(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['time-slots-admin'] });
      queryClient.invalidateQueries({ queryKey: ['time-slots'] });
      toast.success(`"${updated.name}" holati ${updated.active ? 'Faol' : 'Nofaol'} ga o‘zgartirildi`);
    },
    onError: (err: unknown) => {
      const respData = (err as { response?: { data?: { message?: string } } })?.response?.data;
      toast.error(respData?.message || 'Holatni o‘zgartirishda xatolik yuz berdi');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => timeSlotApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-slots-admin'] });
      queryClient.invalidateQueries({ queryKey: ['time-slots'] });
      toast.success('Dars vaqti o‘chirildi');
    },
    onError: (err: unknown) => {
      const respData = (err as { response?: { data?: { message?: string } } })?.response?.data;
      toast.error(respData?.message || 'O‘chirishda xatolik yuz berdi');
    },
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Dars vaqti nomi kiritilishi shart');
      return;
    }

    if (!startTime.trim() || !endTime.trim()) {
      setFormError('Boshlanish va tugash vaqtlari kiritilishi shart');
      return;
    }

    if (startTime >= endTime) {
      setFormError(t('scheduling.invalidTimeRange'));
      return;
    }

    saveMutation.mutate({
      name: name.trim(),
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      durationMinutes,
      displayOrder,
      description: description.trim() || undefined,
      active,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[var(--brand-primary)]" />
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              {t('scheduling.timeSlotsTitle')}
            </h2>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {t('scheduling.timeSlotsSubtitle')}
          </p>
        </div>

        <Button
          onClick={openCreateModal}
          data-testid="add-time-slot-btn"
          className="bg-[var(--brand-primary)] hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>{t('scheduling.addNewSlot')}</span>
        </Button>
      </div>

      {isLoading ? (
        <Card className="p-8 text-center bg-card border-border/20 rounded-2xl">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Dars vaqtlari yuklanmoqda...</p>
        </Card>
      ) : error ? (
        <Card className="p-6 text-center border-rose-500/20 bg-rose-500/10 rounded-2xl">
          <AlertCircle className="w-6 h-6 text-rose-500 mx-auto mb-2" />
          <p className="text-xs font-bold text-rose-600">Dars vaqtlarini yuklashda xatolik yuz berdi</p>
        </Card>
      ) : (
        <Card className="bg-card border-border/20 rounded-2xl overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border/20">
                <TableHead className="w-12 text-center text-xs font-bold">#</TableHead>
                <TableHead className="text-xs font-bold">{t('scheduling.slotName')}</TableHead>
                <TableHead className="text-xs font-bold">{t('scheduling.timeSlot')}</TableHead>
                <TableHead className="text-xs font-bold">{t('scheduling.slotUsage')}</TableHead>
                <TableHead className="text-xs font-bold text-center">{t('scheduling.activeStatus')}</TableHead>
                <TableHead className="text-xs font-bold text-right pr-6">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slots.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                    Dars vaqtlari mavjud emas. Yuqoridagi tugma orqali yangi vaqt qo‘shing.
                  </TableCell>
                </TableRow>
              ) : (
                slots.map((slot) => (
                  <TableRow key={slot.id} className="border-border/15 hover:bg-muted/10 transition">
                    <TableCell className="text-center text-xs font-mono text-muted-foreground">
                      {slot.displayOrder || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                        <span>{slot.name}</span>
                        {slot.branchName && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {slot.branchName}
                          </Badge>
                        )}
                      </div>
                      {slot.description && (
                        <p className="text-[11px] text-muted-foreground truncate max-w-xs">
                          {slot.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[var(--brand-primary)] bg-blue-500/10 px-2.5 py-1 rounded-lg">
                          {slot.startTime} – {slot.endTime}
                        </span>
                        {slot.durationMinutes && (
                          <span className="text-[10px] text-muted-foreground">
                            ({slot.durationMinutes} daq)
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {slot.usageCount && slot.usageCount > 0 ? (
                        <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                          {t('scheduling.slotUsageCount', { count: slot.usageCount })}
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">
                          Ishlatilmagan
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleMutation.mutate(slot.id)}
                        disabled={toggleMutation.isPending}
                        className={`h-7 px-2.5 rounded-full text-[11px] font-bold border transition ${
                          slot.active
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25'
                            : 'bg-muted border-border/40 text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {slot.active ? (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {t('scheduling.statusActive')}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            {t('scheduling.statusInactive')}
                          </span>
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`edit-slot-${slot.id}`}
                          onClick={() => openEditModal(slot)}
                          className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                          title={t('scheduling.editSlot')}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`delete-slot-${slot.id}`}
                          onClick={() => {
                            if (window.confirm(`"${slot.name}" dars vaqtini o‘chirishni xohlaysizmi?`)) {
                              deleteMutation.mutate(slot.id);
                            }
                          }}
                          disabled={deleteMutation.isPending || (slot.usageCount ? slot.usageCount > 0 : false)}
                          className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-rose-500 disabled:opacity-30"
                          title={slot.usageCount && slot.usageCount > 0 ? "Jadvalda ishlatilayotgani sababli o'chirib bo'lmaydi" : "O'chirish"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && setIsModalOpen(false)}>
        <DialogContent className="max-w-md p-6 bg-card text-card-foreground border-border/20 rounded-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              {editingSlot ? t('scheduling.editSlot') : t('scheduling.addNewSlot')}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Dars jadvali uchun foydalaniladigan vaqt oralig‘ini belgilang.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">{t('scheduling.slotName')} *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masalan: Ertalabki smena (Morning)"
                className="h-9 text-xs bg-muted/30 border-0 rounded-xl"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{t('scheduling.startTime')} *</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => {
                    setStartTime(e.target.value);
                    if (e.target.value && endTime && e.target.value < endTime) {
                      const [sh, sm] = e.target.value.split(':').map(Number);
                      const [eh, em] = endTime.split(':').map(Number);
                      setDurationMinutes((eh * 60 + em) - (sh * 60 + sm));
                    }
                  }}
                  className="h-9 text-xs bg-muted/30 border-0 rounded-xl font-mono text-center"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{t('scheduling.endTime')} *</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => {
                    setEndTime(e.target.value);
                    if (startTime && e.target.value && startTime < e.target.value) {
                      const [sh, sm] = startTime.split(':').map(Number);
                      const [eh, em] = e.target.value.split(':').map(Number);
                      setDurationMinutes((eh * 60 + em) - (sh * 60 + sm));
                    }
                  }}
                  className="h-9 text-xs bg-muted/30 border-0 rounded-xl font-mono text-center"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Davomiyligi (daqiqa)</Label>
                <Input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  placeholder="90"
                  className="h-9 text-xs bg-muted/30 border-0 rounded-xl text-center"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{t('scheduling.displayOrder')}</Label>
                <Input
                  type="number"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(Number(e.target.value))}
                  placeholder="1"
                  className="h-9 text-xs bg-muted/30 border-0 rounded-xl text-center"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tavsif (Ixtiyoriy)</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Dars vaqti bo‘yicha qo‘shimcha izoh"
                className="h-9 text-xs bg-muted/30 border-0 rounded-xl"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="activeSlotCheckbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="rounded border-border/40 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
              />
              <Label htmlFor="activeSlotCheckbox" className="text-xs font-semibold cursor-pointer">
                {t('scheduling.activeStatus')} (Jadval shaklida ko‘rinishi uchun)
              </Label>
            </div>

            <DialogFooter className="pt-4 border-t border-border/15 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl text-xs"
              >
                Bekor qilish
              </Button>
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold"
              >
                {saveMutation.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
