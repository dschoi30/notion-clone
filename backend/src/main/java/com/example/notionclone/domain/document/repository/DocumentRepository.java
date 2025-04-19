package com.example.notionclone.domain.document.repository;

import com.example.notionclone.domain.document.entity.Document;
import com.example.notionclone.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DocumentRepository extends JpaRepository<Document, Long> {
    List<Document> findByOwnerAndParentIsNullOrderByPositionAsc(User owner);
    
    List<Document> findByOwnerAndParentOrderByPositionAsc(User owner, Document parent);
    
    @Query("SELECT MAX(d.position) FROM Document d WHERE d.parent = :parent AND d.owner = :owner")
    Optional<Integer> findMaxPositionByParentAndOwner(@Param("parent") Document parent, @Param("owner") User owner);
    
    @Query("SELECT MAX(d.position) FROM Document d WHERE d.parent IS NULL AND d.owner = :owner")
    Optional<Integer> findMaxPositionByOwnerAndNoParent(@Param("owner") User owner);
} 