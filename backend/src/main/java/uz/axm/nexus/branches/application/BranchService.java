package uz.axm.nexus.branches.application;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.axm.nexus.audit.application.AuditService;
import uz.axm.nexus.branches.application.dto.BranchDto;
import uz.axm.nexus.branches.application.dto.BranchStatisticsDto;
import uz.axm.nexus.branches.application.dto.CreateBranchRequest;
import uz.axm.nexus.branches.application.dto.UpdateBranchRequest;
import uz.axm.nexus.branches.domain.Branch;
import uz.axm.nexus.branches.infrastructure.BranchRepository;
import uz.axm.nexus.classrooms.domain.Room;
import uz.axm.nexus.classrooms.domain.StudyGroup;
import uz.axm.nexus.classrooms.infrastructure.RoomRepository;
import uz.axm.nexus.classrooms.infrastructure.StudyGroupRepository;
import uz.axm.nexus.mentors.infrastructure.MentorRepository;
import uz.axm.nexus.shared.application.BusinessException;
import uz.axm.nexus.shared.application.ResourceNotFoundException;
import uz.axm.nexus.users.infrastructure.StudentRepository;

import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BranchService {

    private final BranchRepository branchRepository;
    private final StudyGroupRepository studyGroupRepository;
    private final StudentRepository studentRepository;
    private final MentorRepository mentorRepository;
    private final RoomRepository roomRepository;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<BranchDto> getAll(String status, String region, String search) {
        List<Branch> branches = branchRepository.findAll();

        if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
            branches = branches.stream()
                    .filter(b -> status.equalsIgnoreCase(b.getStatus()))
                    .collect(Collectors.toList());
        }

        if (region != null && !region.isBlank() && !"ALL".equalsIgnoreCase(region)) {
            branches = branches.stream()
                    .filter(b -> region.equalsIgnoreCase(b.getRegion()))
                    .collect(Collectors.toList());
        }

        if (search != null && !search.isBlank()) {
            String q = search.trim().toLowerCase(Locale.ROOT);
            branches = branches.stream()
                    .filter(b -> b.getName().toLowerCase(Locale.ROOT).contains(q)
                            || b.getCode().toLowerCase(Locale.ROOT).contains(q)
                            || (b.getRegion() != null && b.getRegion().toLowerCase(Locale.ROOT).contains(q))
                            || (b.getDistrict() != null && b.getDistrict().toLowerCase(Locale.ROOT).contains(q)))
                    .collect(Collectors.toList());
        }

        return branches.stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public BranchDto getById(Long id) {
        return toDto(getEntityById(id));
    }

    @Transactional(readOnly = true)
    public Branch getEntityById(Long id) {
        return branchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Filial topilmadi: #" + id));
    }

    @Transactional(readOnly = true)
    public BranchStatisticsDto getStatistics(Long id) {
        Branch branch = getEntityById(id);

        long totalStudents = studentRepository.countByBranchId(id);
        long activeStudents = studentRepository.countByBranchIdAndStatus(id, "Faol");
        if (activeStudents == 0 && totalStudents > 0) {
            activeStudents = totalStudents; // Fallback for case sensitivity or non-standard statuses
        }

        long totalGroups = studyGroupRepository.countByBranchId(id);
        long activeGroups = studyGroupRepository.countByBranchIdAndStatus(id, "ACTIVE");
        long totalMentors = mentorRepository.countByBranchId(id);
        long totalRooms = roomRepository.countByBranchId(id);

        List<Room> rooms = roomRepository.findByBranchId(id);
        long totalRoomCapacity = rooms.stream()
                .mapToLong(r -> r.getCapacity() != null ? r.getCapacity() : 16)
                .sum();

        double avgGroupSize = activeGroups > 0 ? (double) activeStudents / activeGroups : 0.0;
        avgGroupSize = Math.round(avgGroupSize * 10.0) / 10.0;

        double capacityUtilizationRate = totalRoomCapacity > 0
                ? (double) activeStudents / totalRoomCapacity * 100.0
                : 0.0;
        capacityUtilizationRate = Math.min(100.0, Math.round(capacityUtilizationRate * 10.0) / 10.0);

        return BranchStatisticsDto.builder()
                .branchId(branch.getId())
                .branchName(branch.getName())
                .branchCode(branch.getCode())
                .totalStudents(totalStudents)
                .activeStudents(activeStudents)
                .totalGroups(totalGroups)
                .activeGroups(activeGroups)
                .totalMentors(totalMentors)
                .totalRooms(totalRooms)
                .totalRoomCapacity(totalRoomCapacity)
                .averageGroupSize(avgGroupSize)
                .capacityUtilizationRate(capacityUtilizationRate)
                .build();
    }

    @Transactional
    public BranchDto create(CreateBranchRequest req, String actor) {
        String code = req.getCode().trim().toUpperCase(Locale.ROOT);
        if (branchRepository.existsByCodeIgnoreCase(code)) {
            throw new BusinessException("Ushbu filial kodi allaqachon mavjud: " + code);
        }

        Branch branch = Branch.builder()
                .name(req.getName().trim())
                .code(code)
                .description(req.getDescription())
                .region(req.getRegion().trim())
                .district(req.getDistrict() != null ? req.getDistrict().trim() : null)
                .address(req.getAddress() != null ? req.getAddress().trim() : null)
                .phone(req.getPhone() != null ? req.getPhone().trim() : null)
                .email(req.getEmail() != null ? req.getEmail().trim().toLowerCase(Locale.ROOT) : null)
                .status(req.getStatus() != null && !req.getStatus().isBlank() ? req.getStatus().toUpperCase(Locale.ROOT) : "ACTIVE")
                .build();

        Branch saved = branchRepository.save(branch);
        auditService.logAction("BRANCH_CREATED", "Branch", String.valueOf(saved.getId()), actor,
                "Yangi filial yaratildi: " + saved.getName() + " (" + saved.getCode() + ")");

        return toDto(saved);
    }

    @Transactional
    public BranchDto update(Long id, UpdateBranchRequest req, String actor) {
        Branch branch = getEntityById(id);

        String code = req.getCode().trim().toUpperCase(Locale.ROOT);
        if (branchRepository.existsByCodeIgnoreCaseAndIdNot(code, id)) {
            throw new BusinessException("Ushbu filial kodi boshqa filialda mavjud: " + code);
        }

        branch.setName(req.getName().trim());
        branch.setCode(code);
        branch.setDescription(req.getDescription());
        branch.setRegion(req.getRegion().trim());
        branch.setDistrict(req.getDistrict() != null ? req.getDistrict().trim() : null);
        branch.setAddress(req.getAddress() != null ? req.getAddress().trim() : null);
        branch.setPhone(req.getPhone() != null ? req.getPhone().trim() : null);
        branch.setEmail(req.getEmail() != null ? req.getEmail().trim().toLowerCase(Locale.ROOT) : null);
        if (req.getStatus() != null && !req.getStatus().isBlank()) {
            branch.setStatus(req.getStatus().toUpperCase(Locale.ROOT));
        }

        Branch saved = branchRepository.save(branch);
        auditService.logAction("BRANCH_UPDATED", "Branch", String.valueOf(saved.getId()), actor,
                "Filial ma'lumotlari yangilandi: " + saved.getName() + " (" + saved.getCode() + ")");

        return toDto(saved);
    }

    @Transactional
    public void deleteOrArchive(Long id, String actor) {
        Branch branch = getEntityById(id);

        long groupCount = studyGroupRepository.countByBranchId(id);
        long studentCount = studentRepository.countByBranchId(id);

        if (groupCount > 0 || studentCount > 0) {
            // Safe archive rather than hard delete to prevent constraint violations
            branch.setStatus("ARCHIVED");
            branchRepository.save(branch);
            auditService.logAction("BRANCH_ARCHIVED", "Branch", String.valueOf(id), actor,
                    "Filial arxivlandi (biriktirilgan resurslar mavjudligi sababli): " + branch.getName());
        } else {
            branchRepository.delete(branch);
            auditService.logAction("BRANCH_DELETED", "Branch", String.valueOf(id), actor,
                    "Filial o'chirildi: " + branch.getName() + " (" + branch.getCode() + ")");
        }
    }

    @Transactional(readOnly = true)
    public List<StudyGroup> getBranchGroups(Long branchId) {
        getEntityById(branchId);
        return studyGroupRepository.findByBranchId(branchId);
    }

    @Transactional(readOnly = true)
    public List<Room> getBranchRooms(Long branchId) {
        getEntityById(branchId);
        return roomRepository.findByBranchId(branchId);
    }

    public BranchDto toDto(Branch b) {
        long studentCount = studentRepository.countByBranchId(b.getId());
        long groupCount = studyGroupRepository.countByBranchId(b.getId());
        long mentorCount = mentorRepository.countByBranchId(b.getId());
        long roomCount = roomRepository.countByBranchId(b.getId());

        return BranchDto.builder()
                .id(b.getId())
                .name(b.getName())
                .code(b.getCode())
                .description(b.getDescription())
                .region(b.getRegion())
                .district(b.getDistrict())
                .address(b.getAddress())
                .phone(b.getPhone())
                .email(b.getEmail())
                .status(b.getStatus())
                .studentCount(studentCount)
                .groupCount(groupCount)
                .mentorCount(mentorCount)
                .roomCount(roomCount)
                .createdAt(b.getCreatedAt())
                .updatedAt(b.getUpdatedAt())
                .build();
    }
}
