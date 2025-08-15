package com.example.notionclone.domain.document.service;

import com.example.notionclone.domain.document.dto.DocumentVersionDtos;
import com.example.notionclone.domain.document.entity.Document;
import com.example.notionclone.domain.document.entity.DocumentProperty;
import com.example.notionclone.domain.document.entity.DocumentPropertyValue;
import com.example.notionclone.domain.document.entity.DocumentVersion;
import com.example.notionclone.domain.document.entity.PropertyType;
import com.example.notionclone.domain.document.repository.DocumentPropertyRepository;
import com.example.notionclone.domain.document.repository.DocumentPropertyValueRepository;
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

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DocumentVersionService {
    private final DocumentVersionRepository versionRepository;
    private final DocumentRepository documentRepository;
    private final DocumentPropertyRepository propertyRepository;
    private final DocumentPropertyValueRepository valueRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

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

    @Transactional
    public void restoreVersion(Long workspaceId, Long documentId, Long versionId, String restoredByEmail) {
        DocumentVersion version = versionRepository.findById(versionId)
                .orElseThrow(() -> new ResourceNotFoundException("Document version not found with id: " + versionId));
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + documentId));

        // 안전 검증: 버전이 해당 문서에 속하는지
        if (!version.getDocument().getId().equals(document.getId())) {
            throw new ResourceNotFoundException("Version does not belong to the specified document");
        }

        // 1) 문서 기본 필드 복구
        document.update(version.getTitle(), version.getContent());
        document.setViewType(version.getViewType());
        document.setTitleColumnWidth(version.getTitleColumnWidth());
        documentRepository.save(document);

        // 2) 속성/값 복구 (단순전략: 재작성)
        try {
            // propertiesJson: [{id?, name, type, sortOrder, width}]
            String propsJson = version.getPropertiesJson();
            String valuesJson = version.getPropertyValuesJson();

            List<Map<String, Object>> propItems = (propsJson == null || propsJson.isBlank())
                    ? List.of()
                    : objectMapper.readValue(propsJson, new TypeReference<List<Map<String, Object>>>() {});
            Map<String, String> valueMap = (valuesJson == null || valuesJson.isBlank())
                    ? Map.of()
                    : objectMapper.readValue(valuesJson, new TypeReference<Map<String, String>>() {});

            // 기존 속성/값 제거
            List<DocumentProperty> existingProps = propertyRepository.findByDocumentId(document.getId());
            for (DocumentProperty prop : existingProps) {
                // orphanRemoval=true로 값들도 제거됨
                propertyRepository.delete(prop);
            }

            // 새 속성 생성 및 값 복구
            for (Map<String, Object> item : propItems) {
                String name = (String) item.getOrDefault("name", "");
                String typeStr = String.valueOf(item.get("type"));
                Integer sortOrder = item.get("sortOrder") == null ? null : ((Number) item.get("sortOrder")).intValue();
                Integer width = item.get("width") == null ? null : ((Number) item.get("width")).intValue();

                DocumentProperty prop = DocumentProperty.builder()
                        .document(document)
                        .name(name)
                        .type(PropertyType.valueOf(typeStr))
                        .sortOrder(sortOrder)
                        .width(width != null ? width : 192)
                        .build();
                prop = propertyRepository.save(prop);

                // 값 복구 (propertyId key는 과거 ID라 가정 → 이름 기반 대신 map은 id 키이므로 재매핑 불가: 값은 건너뜀)
                // 현재 프런트 payload는 propertyId -> value 형태이므로, ID가 재생성되는 복구에서는 매핑이 불가
                // 간단 전략: 이름을 키로도 수용하도록 valuesJson이 숫자키만 있는 경우는 생략
                String byId = valueMap.get(String.valueOf(item.get("id")));
                if (byId != null) {
                    DocumentPropertyValue pv = DocumentPropertyValue.builder()
                            .document(document)
                            .property(prop)
                            .value(byId)
                            .build();
                    valueRepository.save(pv);
                }
            }
        } catch (Exception e) {
            throw new IllegalStateException("Failed to restore document properties/values", e);
        }
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


