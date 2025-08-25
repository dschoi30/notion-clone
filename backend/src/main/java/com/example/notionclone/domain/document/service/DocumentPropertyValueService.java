package com.example.notionclone.domain.document.service;

import com.example.notionclone.domain.document.entity.Document;
import com.example.notionclone.domain.document.entity.DocumentProperty;
import com.example.notionclone.domain.document.entity.DocumentPropertyValue;
import com.example.notionclone.domain.document.repository.DocumentPropertyRepository;
import com.example.notionclone.domain.document.repository.DocumentPropertyValueRepository;
import com.example.notionclone.domain.document.repository.DocumentRepository;
import com.example.notionclone.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class DocumentPropertyValueService {
    private final DocumentPropertyValueRepository valueRepository;
    private final DocumentPropertyRepository propertyRepository;
    private final DocumentRepository documentRepository;

    @Transactional
    public DocumentPropertyValue addOrUpdateValue(Long documentId, Long propertyId, String value) {
        DocumentPropertyValue propertyValue = valueRepository.findByDocumentIdAndPropertyId(documentId, propertyId)
                .orElse(null);

        if (propertyValue == null) {
            Document document = documentRepository.findById(documentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + documentId));
            DocumentProperty property = propertyRepository.findById(propertyId)
                    .orElseThrow(() -> new ResourceNotFoundException("Property not found with id: " + propertyId));
            propertyValue = DocumentPropertyValue.builder()
                    .document(document)
                    .property(property)
                    .value(value)
                    .build();
        } else {
            propertyValue.setValue(value);
        }
        return valueRepository.save(propertyValue);
    }

    @Transactional(readOnly = true)
    public Optional<DocumentPropertyValue> findLatestValue(Long documentId) {
        return valueRepository.findTopByDocumentIdOrderByUpdatedAtDesc(documentId);
    }

    @Transactional(readOnly = true)
    public List<DocumentPropertyValue> getValuesByDocument(Long documentId) {
        return valueRepository.findByDocumentId(documentId);
    }

    @Transactional(readOnly = true)
    public List<DocumentPropertyValue> getValuesByProperty(Long propertyId) {
        return valueRepository.findByPropertyId(propertyId);
    }

    @Transactional(readOnly = true)
    public List<DocumentPropertyValue> getValuesByChildDocuments(Long parentId) {
        // 1. Find all child documents
        List<Document> children = documentRepository.findByParentIdAndIsTrashedFalse(parentId);
        if (children.isEmpty()) {
            return List.of();
        }
        // 2. Get all child document IDs
        List<Long> childIds = children.stream().map(Document::getId).collect(java.util.stream.Collectors.toList());
        // 3. Find all property values for those children
        return valueRepository.findByDocumentIdIn(childIds);
    }
} 