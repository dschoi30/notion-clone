package com.example.notionclone.domain.document.repository;

import com.example.notionclone.domain.document.entity.Document;
import com.example.notionclone.domain.document.entity.DocumentVersion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface DocumentVersionRepository extends JpaRepository<DocumentVersion, Long> {
    Page<DocumentVersion> findByDocumentOrderByCreatedAtDesc(Document document, Pageable pageable);
    Optional<DocumentVersion> findFirstByDocumentAndSnapshotHash(Document document, String snapshotHash);
    long deleteByDocumentAndCreatedAtBefore(Document document, LocalDateTime threshold);
    long deleteByDocument(Document document);
}


