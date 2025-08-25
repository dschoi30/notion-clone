package com.example.notionclone.domain.document.repository;

import com.example.notionclone.domain.document.entity.DocumentPropertyValue;
import com.example.notionclone.domain.document.entity.Document;
import com.example.notionclone.domain.document.entity.DocumentProperty;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DocumentPropertyValueRepository extends JpaRepository<DocumentPropertyValue, Long> {
    List<DocumentPropertyValue> findByDocument(Document document);
    List<DocumentPropertyValue> findByProperty(DocumentProperty property);
    List<DocumentPropertyValue> findByDocumentId(Long documentId);
    List<DocumentPropertyValue> findByPropertyId(Long propertyId);
    Optional<DocumentPropertyValue> findByDocumentIdAndPropertyId(Long documentId, Long propertyId);
    List<DocumentPropertyValue> findByDocumentIdIn(List<Long> documentIds);
    long deleteByDocumentId(Long documentId);
    long deleteByDocumentIdIn(List<Long> documentIds);

    // 최신 값 한 건(단일 문서)
    Optional<DocumentPropertyValue> findTopByDocumentIdOrderByUpdatedAtDesc(Long documentId);

    // 다건 최적화: 문서별 최신 updatedAt 집계
    @Query("SELECT v.document.id as documentId, MAX(v.updatedAt) as latestUpdatedAt " +
           "FROM DocumentPropertyValue v WHERE v.document.id IN :docIds GROUP BY v.document.id")
    List<Object[]> findLatestUpdatedAtByDocumentIds(@Param("docIds") List<Long> documentIds);
} 