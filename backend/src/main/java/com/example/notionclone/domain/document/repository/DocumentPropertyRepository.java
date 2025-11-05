package com.example.notionclone.domain.document.repository;

import com.example.notionclone.domain.document.entity.DocumentProperty;
import com.example.notionclone.domain.document.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DocumentPropertyRepository extends JpaRepository<DocumentProperty, Long> {
    List<DocumentProperty> findByDocument(Document document);
    List<DocumentProperty> findByDocumentId(Long documentId);
    List<DocumentProperty> findByDocumentIdIn(List<Long> documentIds);
    List<DocumentProperty> findByDocumentIdOrderBySortOrderAsc(Long documentId);
    List<DocumentProperty> findByDocumentOrderBySortOrder(Document document);
} 