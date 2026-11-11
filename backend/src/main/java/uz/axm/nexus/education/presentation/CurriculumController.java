package uz.axm.nexus.education.presentation;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import uz.axm.nexus.education.application.EducationService;
import uz.axm.nexus.education.domain.SubjectTrack;

import java.util.List;

@RestController
@RequestMapping("/api/curriculum")
@RequiredArgsConstructor
@Tag(name = "Education Curriculum", description = "8-11 sinflar o'quv dasturlari va yo'nalishlari")
public class CurriculumController {

    private final EducationService educationService;

    @GetMapping("/tracks")
    @PreAuthorize("hasAuthority('curriculum.read') or isAuthenticated()")
    @Operation(summary = "Barcha o'quv dasturi yo'nalishlarini olish")
    public ResponseEntity<List<SubjectTrack>> getTracks() {
        return ResponseEntity.ok(educationService.getAllTracks());
    }
}
