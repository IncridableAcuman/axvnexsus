package uz.axm.nexus.branches.application;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.axm.nexus.audit.application.AuditService;
import uz.axm.nexus.audit.domain.AuditLog;
import uz.axm.nexus.audit.infrastructure.AuditLogRepository;
import uz.axm.nexus.branches.application.dto.*;
import uz.axm.nexus.branches.domain.Branch;
import uz.axm.nexus.branches.infrastructure.BranchRepository;
import uz.axm.nexus.classrooms.domain.Room;
import uz.axm.nexus.classrooms.domain.StudyGroup;
import uz.axm.nexus.classrooms.infrastructure.GroupMembershipRepository;
import uz.axm.nexus.classrooms.infrastructure.RoomRepository;
import uz.axm.nexus.classrooms.infrastructure.StudyGroupRepository;
import uz.axm.nexus.mentors.domain.Mentor;
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
    private final GroupMembershipRepository groupMembershipRepository;
    private final AuditLogRepository auditLogRepository;
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
            activeStudents = totalStudents;
        }

        long totalGroups = studyGroupRepository.countByBranchId(id);
        long activeGroups = studyGroupRepository.countByBranchIdAndStatus(id, "ACTIVE");
        long totalMentors = mentorRepository.countByBranchId(id);
        
        List<Room> rooms = roomRepository.findByBranchId(id);
        long totalRooms = rooms.size();
        long totalRoomCapacity = rooms.stream()
                .filter(r -> !"INACTIVE".equalsIgnoreCase(r.getStatus()))
                .mapToLong(r -> r.getCapacity() != null ? r.getCapacity() : 16)
                .sum();

        double avgGroupSize = activeGroups > 0 ? (double) activeStudents / activeGroups : 0.0;
        avgGroupSize = Math.round(avgGroupSize * 10.0) / 10.0;

        Double capacityUtilizationRate = null;
        boolean hasCapacityData = false;
        if (totalRoomCapacity > 0) {
            double rate = (double) activeStudents / totalRoomCapacity * 100.0;
            capacityUtilizationRate = Math.min(100.0, Math.round(rate * 10.0) / 10.0);
            hasCapacityData = true;
        }

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
                .hasCapacityData(hasCapacityData)
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
    public List<BranchGroupDto> getBranchGroups(Long branchId) {
        getEntityById(branchId);
        List<StudyGroup> groups = studyGroupRepository.findByBranchId(branchId);

        return groups.stream().map(g -> {
            long activeMembers = groupMembershipRepository.countByGroupIdAndStatus(g.getId(), "ACTIVE");
            int studentCount;
            if (activeMembers > 0) {
                studentCount = (int) activeMembers;
            } else if (g.getStudentCount() != null && g.getStudentCount() > 0) {
                studentCount = g.getStudentCount();
            } else {
                studentCount = (int) studentRepository.countByStudyGroupId(g.getId());
            }

            int capacity = g.getMaxCapacity() != null ? g.getMaxCapacity() : 16;
            boolean isOverCapacity = studentCount > capacity;
            String warning = isOverCapacity
                    ? "Guruh belgilangan sig'imdan oshgan (" + studentCount + "/" + capacity + ")"
                    : null;

            return BranchGroupDto.builder()
                    .id(g.getId())
                    .groupCode(g.getGroupCode())
                    .gradeLevel(g.getGradeLevel())
                    .subject(g.getSubject())
                    .mentorId(g.getMentor() != null ? g.getMentor().getId() : null)
                    .mentorName(g.getMentor() != null ? g.getMentor().getFullName() : null)
                    .room(g.getRoom())
                    .studentCount(studentCount)
                    .maxCapacity(capacity)
                    .overCapacity(isOverCapacity)
                    .overCapacityWarning(warning)
                    .status(g.getStatus())
                    .scheduleDays(g.getScheduleDays())
                    .scheduleTime(g.getScheduleTime())
                    .build();
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<BranchRoomDto> getBranchRooms(Long branchId) {
        Branch branch = getEntityById(branchId);
        List<Room> rooms = roomRepository.findByBranchId(branchId);
        List<StudyGroup> groups = studyGroupRepository.findByBranchId(branchId);

        return rooms.stream().map(r -> {
            List<String> assignedGroups = groups.stream()
                    .filter(g -> r.getName().equalsIgnoreCase(g.getRoom()))
                    .map(StudyGroup::getGroupCode)
                    .collect(Collectors.toList());

            int occupancy = groups.stream()
                    .filter(g -> r.getName().equalsIgnoreCase(g.getRoom()))
                    .mapToInt(g -> {
                        long active = groupMembershipRepository.countByGroupIdAndStatus(g.getId(), "ACTIVE");
                        return active > 0 ? (int) active : (g.getStudentCount() != null ? g.getStudentCount() : 0);
                    })
                    .sum();

            int cap = r.getCapacity() != null ? r.getCapacity() : 16;
            String availability = "AVAILABLE";
            if (occupancy > cap) {
                availability = "OVERLOADED";
            } else if (occupancy > 0) {
                availability = "OCCUPIED";
            }

            return BranchRoomDto.builder()
                    .id(r.getId())
                    .name(r.getName())
                    .branchId(branch.getId())
                    .branchName(branch.getName())
                    .roomType(r.getRoomType() != null ? r.getRoomType() : "IT_LAB")
                    .capacity(cap)
                    .status(r.getStatus() != null ? r.getStatus() : "ACTIVE")
                    .currentOccupancy(occupancy)
                    .assignedGroups(assignedGroups)
                    .availabilityStatus(availability)
                    .build();
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<BranchMentorDto> getBranchMentors(Long branchId) {
        getEntityById(branchId);
        List<Mentor> mentors = mentorRepository.findByBranchId(branchId);
        List<StudyGroup> groups = studyGroupRepository.findByBranchId(branchId);

        return mentors.stream().map(m -> {
            List<String> assignedGroups = groups.stream()
                    .filter(g -> g.getMentor() != null && m.getId().equals(g.getMentor().getId()))
                    .map(StudyGroup::getGroupCode)
                    .collect(Collectors.toList());

            int workloadHours = assignedGroups.size() * 6;

            return BranchMentorDto.builder()
                    .id(m.getId())
                    .fullName(m.getFullName())
                    .role(m.getRole())
                    .email(m.getEmail())
                    .phone(m.getPhone())
                    .specialization(m.getBio() != null ? m.getBio() : m.getRole())
                    .assignedGroupCount(assignedGroups.size())
                    .assignedGroups(assignedGroups)
                    .weeklyWorkloadHours(workloadHours)
                    .status(m.getStatus() != null ? m.getStatus() : "ACTIVE")
                    .build();
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<BranchActivityDto> getBranchAuditLogs(Long branchId) {
        getEntityById(branchId);
        List<AuditLog> allLogs = auditLogRepository.findTop50ByOrderByCreatedAtDesc();
        String idStr = String.valueOf(branchId);

        return allLogs.stream()
                .filter(a -> ("Branch".equalsIgnoreCase(a.getEntityName()) && idStr.equals(a.getEntityId()))
                        || ("Room".equalsIgnoreCase(a.getEntityName()))
                        || ("StudyGroup".equalsIgnoreCase(a.getEntityName())))
                .map(a -> BranchActivityDto.builder()
                        .id(a.getId())
                        .action(a.getAction())
                        .entityName(a.getEntityName())
                        .entityId(a.getEntityId())
                        .performedBy(a.getPerformedBy())
                        .outcome(a.getOutcome())
                        .details(a.getDetails())
                        .createdAt(a.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional
    public BranchRoomDto createRoom(Long branchId, CreateRoomRequest req, String actor) {
        Branch branch = getEntityById(branchId);
        String name = req.getName().trim();

        if (roomRepository.existsByBranchIdAndNameIgnoreCase(branchId, name)) {
            throw new BusinessException("Ushbu filialda bunday nomli xona allaqachon mavjud: " + name);
        }

        Room room = Room.builder()
                .name(name)
                .branch(branch)
                .branchLocation(branch.getName())
                .capacity(req.getCapacity() != null ? req.getCapacity() : 16)
                .roomType(req.getRoomType() != null ? req.getRoomType().toUpperCase(Locale.ROOT) : "IT_LAB")
                .status(req.getStatus() != null ? req.getStatus().toUpperCase(Locale.ROOT) : "ACTIVE")
                .build();

        Room saved = roomRepository.save(room);
        auditService.logAction("ROOM_CREATED", "Room", String.valueOf(saved.getId()), actor,
                "Filialga (" + branch.getName() + ") yangi xona qo'shildi: " + saved.getName() + " (" + saved.getCapacity() + " o'rin)");

        return BranchRoomDto.builder()
                .id(saved.getId())
                .name(saved.getName())
                .branchId(branch.getId())
                .branchName(branch.getName())
                .roomType(saved.getRoomType())
                .capacity(saved.getCapacity())
                .status(saved.getStatus())
                .currentOccupancy(0)
                .assignedGroups(List.of())
                .availabilityStatus("AVAILABLE")
                .build();
    }

    @Transactional
    public BranchRoomDto updateRoom(Long branchId, Long roomId, UpdateRoomRequest req, String actor) {
        Branch branch = getEntityById(branchId);
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Xona topilmadi: #" + roomId));

        if (room.getBranch() == null || !branchId.equals(room.getBranch().getId())) {
            throw new BusinessException("Ushbu xona mazkur filialga tegishli emas");
        }

        String name = req.getName().trim();
        if (roomRepository.existsByBranchIdAndNameIgnoreCaseAndIdNot(branchId, name, roomId)) {
            throw new BusinessException("Ushbu filialda bunday nomli boshqa xona mavjud: " + name);
        }

        room.setName(name);
        if (req.getRoomType() != null && !req.getRoomType().isBlank()) {
            room.setRoomType(req.getRoomType().toUpperCase(Locale.ROOT));
        }
        if (req.getCapacity() != null && req.getCapacity() > 0) {
            room.setCapacity(req.getCapacity());
        }
        if (req.getStatus() != null && !req.getStatus().isBlank()) {
            room.setStatus(req.getStatus().toUpperCase(Locale.ROOT));
        }

        Room saved = roomRepository.save(room);
        auditService.logAction("ROOM_UPDATED", "Room", String.valueOf(saved.getId()), actor,
                "Filial (" + branch.getName() + ") xonasi ma'lumotlari yangilandi: " + saved.getName());

        return BranchRoomDto.builder()
                .id(saved.getId())
                .name(saved.getName())
                .branchId(branch.getId())
                .branchName(branch.getName())
                .roomType(saved.getRoomType())
                .capacity(saved.getCapacity())
                .status(saved.getStatus())
                .currentOccupancy(0)
                .assignedGroups(List.of())
                .availabilityStatus("AVAILABLE")
                .build();
    }

    @Transactional
    public void deleteOrDeactivateRoom(Long branchId, Long roomId, String actor) {
        Branch branch = getEntityById(branchId);
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Xona topilmadi: #" + roomId));

        if (room.getBranch() == null || !branchId.equals(room.getBranch().getId())) {
            throw new BusinessException("Ushbu xona mazkur filialga tegishli emas");
        }

        boolean isReferenced = studyGroupRepository.findByBranchId(branchId).stream()
                .anyMatch(g -> room.getName().equalsIgnoreCase(g.getRoom()));

        if (isReferenced) {
            room.setStatus("INACTIVE");
            roomRepository.save(room);
            auditService.logAction("ROOM_DEACTIVATED", "Room", String.valueOf(roomId), actor,
                    "Xona nofaol holatga o'tkazildi (faol guruhlar biriktirilganligi sababli): " + room.getName());
        } else {
            roomRepository.delete(room);
            auditService.logAction("ROOM_DELETED", "Room", String.valueOf(roomId), actor,
                    "Xona o'chirildi: " + room.getName() + " filial: " + branch.getName());
        }
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
