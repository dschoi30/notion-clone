package com.example.notionclone.domain.document.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "document_property_values")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class DocumentPropertyValue {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id", nullable = false)
    private DocumentProperty property;

    @Column(columnDefinition = "TEXT")
    private String value;
} 