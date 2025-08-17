package com.example.notionclone.domain.document.repository;

import com.example.notionclone.domain.document.entity.DocumentPropertyValue;
import com.example.notionclone.domain.document.entity.Document;
import com.example.notionclone.domain.document.entity.DocumentProperty;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface DocumentPropertyValueRepository extends JpaRepository<DocumentPropertyValue, Long> {
    List<DocumentPropertyValue> findByDocument(Document document);
    List<DocumentPropertyValue> findByProperty(DocumentProperty property);
    List<DocumentPropertyValue> findByDocumentId(Long documentId);
    List<DocumentPropertyValue> findByPropertyId(Long propertyId);
    Optional<DocumentPropertyValue> findByDocumentIdAndPropertyId(Long documentId, Long propertyId);
    List<DocumentPropertyValue> findByDocumentIdIn(List<Long> documentIds);
    long deleteByDocumentId(Long documentId);
    long deleteByDocumentIdIn(List<Long> documentIds);
} 