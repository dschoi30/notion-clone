package com.example.notionclone.domain.document.entity;

import com.example.notionclone.domain.BaseEntity;
import com.example.notionclone.domain.document.dto.DocumentPropertyDto;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter 
@Setter 
@NoArgsConstructor 
@AllArgsConstructor 
@Builder
public class DocumentPropertyTagOption extends BaseEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id")
    private DocumentProperty property;

    private String label;
    private String color;
    private Integer sortOrder;

    public DocumentPropertyDto.TagOptionDto toDto() {
        return new DocumentPropertyDto.TagOptionDto(this);
    }
} 