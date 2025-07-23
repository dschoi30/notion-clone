package com.example.notionclone.domain.document.repository;

import com.example.notionclone.domain.document.entity.DocumentPropertyTagOption;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DocumentPropertyTagOptionRepository extends JpaRepository<DocumentPropertyTagOption, Long> {
    List<DocumentPropertyTagOption> findByPropertyId(Long propertyId);
    void deleteByPropertyId(Long propertyId);
} 