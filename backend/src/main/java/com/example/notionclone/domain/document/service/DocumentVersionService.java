package com.example.notionclone.domain.document.service;

import com.example.notionclone.domain.document.dto.DocumentVersionDtos;
import com.example.notionclone.domain.document.entity.Document;
import com.example.notionclone.domain.document.entity.DocumentVersion;
import com.example.notionclone.domain.document.repository.DocumentRepository;
import com.example.notionclone.domain.document.repository.DocumentVersionRepository;
import com.example.notionclone.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DocumentVersionService {
    private final DocumentVersionRepository versionRepository;
    private final DocumentRepository documentRepository;

    @Transactional
    public Long createVersion(Long workspaceId, Long documentId, DocumentVersionDtos.CreateRequest req, String createdByEmail) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + documentId));

        String snapshotHash = computeSnapshotHash(req);

        // 동일 스냅샷 중복 방지
        if (versionRepository.findFirstByDocumentAndSnapshotHash(document, snapshotHash).isPresent()) {
            return null; // 이미 존재 → 생성 스킵
        }

        DocumentVersion version = DocumentVersion.builder()
                .document(document)
                .workspace(document.getWorkspace())
                .title(req.getTitle())
                .viewType(req.getViewType())
                .titleColumnWidth(req.getTitleWidth())
                .content(req.getContent())
                .propertiesJson(req.getPropertiesJson())
                .propertyValuesJson(req.getPropertyValuesJson())
                .snapshotHash(snapshotHash)
                .build();
        version = versionRepository.save(version);

        // 보관 90일 정리 (문서 단위)
        LocalDateTime threshold = LocalDateTime.now().minusDays(90);
        versionRepository.deleteByDocumentAndCreatedAtBefore(document, threshold);

        return version.getId();
    }

    @Transactional(readOnly = true)
    public Page<DocumentVersionDtos.ResponseItem> listVersions(Long documentId, int page, int size) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + documentId));
        Pageable pageable = PageRequest.of(page, size);
        Page<DocumentVersion> result = versionRepository.findByDocumentOrderByCreatedAtDesc(document, pageable);
        List<DocumentVersionDtos.ResponseItem> items = result.getContent().stream()
                .map(v -> DocumentVersionDtos.ResponseItem.builder()
                        .id(v.getId())
                        .title(v.getTitle())
                        .viewType(v.getViewType())
                        .titleWidth(v.getTitleColumnWidth())
                        .createdBy(v.getCreatedBy())
                        .createdAt(v.getCreatedAt())
                        .locked(false)
                        .build())
                .collect(Collectors.toList());
        return new PageImpl<>(items, pageable, result.getTotalElements());
    }

    @Transactional(readOnly = true)
    public DocumentVersionDtos.DetailResponse getVersion(Long versionId) {
        DocumentVersion version = versionRepository.findById(versionId)
                .orElseThrow(() -> new ResourceNotFoundException("Document version not found with id: " + versionId));
        return DocumentVersionDtos.DetailResponse.builder()
                .id(version.getId())
                .title(version.getTitle())
                .viewType(version.getViewType())
                .titleWidth(version.getTitleColumnWidth())
                .content(version.getContent())
                .propertiesJson(version.getPropertiesJson())
                .propertyValuesJson(version.getPropertyValuesJson())
                .createdBy(version.getCreatedBy())
                .createdAt(version.getCreatedAt())
                .build();
    }

    private String computeSnapshotHash(DocumentVersionDtos.CreateRequest req) {
        // 간단한 해시: 주요 필드 JSON 결합 후 SHA-256
        String payload = String.join("|",
                safe(req.getTitle()),
                String.valueOf(req.getViewType()),
                String.valueOf(req.getTitleWidth()),
                safe(req.getContent()),
                safe(req.getPropertiesJson()),
                safe(req.getPropertyValuesJson())
        );
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(payload.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    private String safe(String s) { return s == null ? "" : s; }
}


