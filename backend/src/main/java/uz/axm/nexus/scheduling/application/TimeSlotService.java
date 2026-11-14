package uz.axm.nexus.scheduling.application;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.axm.nexus.audit.application.AuditService;
import uz.axm.nexus.branches.domain.Branch;
import uz.axm.nexus.branches.infrastructure.BranchRepository;
import uz.axm.nexus.scheduling.domain.TimeSlot;
import uz.axm.nexus.scheduling.infrastructure.ScheduleRepository;
import uz.axm.nexus.scheduling.infrastructure.TimeSlotRepository;
import uz.axm.nexus.shared.application.BusinessException;
import uz.axm.nexus.shared.application.ResourceNotFoundException;
import uz.axm.nexus.shared.infrastructure.CurrentUserHelper;

import java.time.Duration;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TimeSlotService {

    private final TimeSlotRepository timeSlotRepository;
    private final ScheduleRepository scheduleRepository;
    private final BranchRepository branchRepository;
    private final AuditService auditService;
    private final CurrentUserHelper currentUserHelper;

    @Transactional(readOnly = true)
    public List<TimeSlotDto> getActiveTimeSlots(Long branchId) {
        List<TimeSlot> slots;
        if (branchId != null) {
            slots = timeSlotRepository.findByBranchIdAndActiveTrueOrderByDisplayOrderAscStartTimeAsc(branchId);
            if (slots.isEmpty()) {
                slots = timeSlotRepository.findByActiveTrueOrderByDisplayOrderAscStartTimeAsc();
            }
        } else {
            slots = timeSlotRepository.findByActiveTrueOrderByDisplayOrderAscStartTimeAsc();
        }
        return slots.stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TimeSlotDto> getAllTimeSlots() {
        return timeSlotRepository.findAllByOrderByDisplayOrderAscStartTimeAsc().stream()
                .map(this::toDtoWithUsage)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TimeSlotDto getById(Long id) {
        TimeSlot slot = timeSlotRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Dars vaqti oralig'i topilmadi: #" + id));
        return toDtoWithUsage(slot);
    }

    @Transactional
    public TimeSlotDto createTimeSlot(TimeSlotRequest req) {
        validateTimeSlotTimes(req.getStartTime(), req.getEndTime());

        String name = req.getName().trim();
        if (timeSlotRepository.existsByNameIgnoreCase(name)) {
            throw new BusinessException("Bunday nomdagi dars vaqti allaqachon mavjud: " + name);
        }

        String startTime = req.getStartTime().trim();
        String endTime = req.getEndTime().trim();

        if (timeSlotRepository.existsByStartTimeAndEndTime(startTime, endTime)) {
            throw new BusinessException("Ushbu vaqt oralig'i (" + startTime + " - " + endTime + ") allaqachon mavjud!");
        }

        Integer duration = req.getDurationMinutes();
        if (duration == null || duration <= 0) {
            LocalTime s = LocalTime.parse(startTime);
            LocalTime e = LocalTime.parse(endTime);
            duration = (int) Duration.between(s, e).toMinutes();
        }

        Integer displayOrder = req.getDisplayOrder();
        if (displayOrder == null) {
            displayOrder = timeSlotRepository.findAll().size() + 1;
        }

        Branch branch = null;
        if (req.getBranchId() != null) {
            branch = branchRepository.findById(req.getBranchId()).orElse(null);
        }

        TimeSlot slot = TimeSlot.builder()
                .name(name)
                .startTime(startTime)
                .endTime(endTime)
                .durationMinutes(duration)
                .displayOrder(displayOrder)
                .active(req.getActive() != null ? req.getActive() : true)
                .description(req.getDescription() != null ? req.getDescription().trim() : null)
                .branch(branch)
                .build();

        TimeSlot saved = timeSlotRepository.save(slot);

        String actor = currentUserHelper.isAuthenticated() ? currentUserHelper.getCurrentUsername() : "SYSTEM";
        auditService.logAction("TIME_SLOT_CREATED", "TimeSlot", String.valueOf(saved.getId()), actor,
                "Dars vaqti qo'shildi: " + saved.getName() + " (" + saved.getStartTime() + " - " + saved.getEndTime() + ")");

        return toDtoWithUsage(saved);
    }

    @Transactional
    public TimeSlotDto updateTimeSlot(Long id, TimeSlotRequest req) {
        TimeSlot slot = timeSlotRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Dars vaqti oralig'i topilmadi: #" + id));

        validateTimeSlotTimes(req.getStartTime(), req.getEndTime());

        String name = req.getName().trim();
        if (timeSlotRepository.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw new BusinessException("Bunday nomdagi dars vaqti allaqachon mavjud: " + name);
        }

        String startTime = req.getStartTime().trim();
        String endTime = req.getEndTime().trim();

        if (timeSlotRepository.existsByStartTimeAndEndTimeAndIdNot(startTime, endTime, id)) {
            throw new BusinessException("Ushbu vaqt oralig'i (" + startTime + " - " + endTime + ") allaqachon mavjud!");
        }

        Integer duration = req.getDurationMinutes();
        if (duration == null || duration <= 0) {
            LocalTime s = LocalTime.parse(startTime);
            LocalTime e = LocalTime.parse(endTime);
            duration = (int) Duration.between(s, e).toMinutes();
        }

        Branch branch = slot.getBranch();
        if (req.getBranchId() != null) {
            branch = branchRepository.findById(req.getBranchId()).orElse(null);
        }

        slot.setName(name);
        slot.setStartTime(startTime);
        slot.setEndTime(endTime);
        slot.setDurationMinutes(duration);
        if (req.getDisplayOrder() != null) {
            slot.setDisplayOrder(req.getDisplayOrder());
        }
        if (req.getActive() != null) {
            slot.setActive(req.getActive());
        }
        slot.setDescription(req.getDescription() != null ? req.getDescription().trim() : null);
        slot.setBranch(branch);

        TimeSlot updated = timeSlotRepository.save(slot);

        String actor = currentUserHelper.isAuthenticated() ? currentUserHelper.getCurrentUsername() : "SYSTEM";
        auditService.logAction("TIME_SLOT_UPDATED", "TimeSlot", String.valueOf(updated.getId()), actor,
                "Dars vaqti yangilandi: " + updated.getName() + " (" + updated.getStartTime() + " - " + updated.getEndTime() + ")");

        return toDtoWithUsage(updated);
    }

    @Transactional
    public TimeSlotDto toggleActive(Long id) {
        TimeSlot slot = timeSlotRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Dars vaqti oralig'i topilmadi: #" + id));

        slot.setActive(!Boolean.TRUE.equals(slot.getActive()));
        TimeSlot saved = timeSlotRepository.save(slot);

        String actor = currentUserHelper.isAuthenticated() ? currentUserHelper.getCurrentUsername() : "SYSTEM";
        auditService.logAction("TIME_SLOT_STATUS_CHANGED", "TimeSlot", String.valueOf(saved.getId()), actor,
                "Dars vaqti holati o'zgartirildi: " + saved.getName() + " -> " + (saved.getActive() ? "Faol" : "Nofaol"));

        return toDtoWithUsage(saved);
    }

    @Transactional
    public void deleteTimeSlot(Long id) {
        TimeSlot slot = timeSlotRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Dars vaqti oralig'i topilmadi: #" + id));

        long usage = scheduleRepository.countByStartTimeAndEndTime(slot.getStartTime(), slot.getEndTime());
        if (usage > 0) {
            throw new BusinessException("Ushbu dars vaqti " + usage + " ta dars jadvalida ishlatilmoqda. Uni o'chirish o'rniga nofaol (deactivate) qiling!");
        }

        timeSlotRepository.delete(slot);

        String actor = currentUserHelper.isAuthenticated() ? currentUserHelper.getCurrentUsername() : "SYSTEM";
        auditService.logAction("TIME_SLOT_DELETED", "TimeSlot", String.valueOf(id), actor,
                "Dars vaqti o'chirildi: " + slot.getName());
    }

    public void validateTimeSlotTimes(String startTime, String endTime) {
        if (startTime == null || startTime.trim().isBlank()) {
            throw new BusinessException("Dars boshlanish vaqti ko'rsatilishi shart!");
        }
        if (endTime == null || endTime.trim().isBlank()) {
            throw new BusinessException("Dars tugash vaqti ko'rsatilishi shart!");
        }

        try {
            LocalTime s = LocalTime.parse(startTime.trim());
            LocalTime e = LocalTime.parse(endTime.trim());
            if (!s.isBefore(e)) {
                throw new BusinessException("Dars tugash vaqti boshlanish vaqtidan kechroq bo'lishi kerak (" + startTime + " >= " + endTime + ")");
            }
        } catch (BusinessException be) {
            throw be;
        } catch (DateTimeParseException ex) {
            throw new BusinessException("Vaqt formati noto'g'ri (HH:mm bo'lishi kerak, masalan: 09:30 yoki 15:00)");
        }
    }

    public TimeSlotDto toDto(TimeSlot slot) {
        return TimeSlotDto.builder()
                .id(slot.getId())
                .name(slot.getName())
                .startTime(slot.getStartTime())
                .endTime(slot.getEndTime())
                .durationMinutes(slot.getDurationMinutes())
                .displayOrder(slot.getDisplayOrder())
                .active(slot.getActive())
                .description(slot.getDescription())
                .branchId(slot.getBranch() != null ? slot.getBranch().getId() : null)
                .branchName(slot.getBranch() != null ? slot.getBranch().getName() : null)
                .createdAt(slot.getCreatedAt())
                .updatedAt(slot.getUpdatedAt())
                .build();
    }

    public TimeSlotDto toDtoWithUsage(TimeSlot slot) {
        TimeSlotDto dto = toDto(slot);
        long count = scheduleRepository.countByStartTimeAndEndTime(slot.getStartTime(), slot.getEndTime());
        dto.setUsageCount(count);
        return dto;
    }
}
