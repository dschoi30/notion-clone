package com.example.notionclone.domain.document.service;

import com.example.notionclone.domain.document.entity.Document;
import com.example.notionclone.domain.document.entity.DocumentProperty;
import com.example.notionclone.domain.document.entity.PropertyType;
import com.example.notionclone.domain.document.repository.DocumentPropertyRepository;
import com.example.notionclone.domain.document.repository.DocumentRepository;
import com.example.notionclone.exception.ResourceNotFoundException;
import com.example.notionclone.domain.user.entity.User;
import com.example.notionclone.domain.user.repository.UserRepository;
import com.example.notionclone.domain.permission.service.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DocumentPropertyService {
    private final DocumentPropertyRepository propertyRepository;
    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;

    @Transactional
    public DocumentProperty addProperty(Long documentId, String name, PropertyType type, Integer sortOrder) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + documentId));
        DocumentProperty property = DocumentProperty.builder()
                .document(document)
                .name(name)
                .type(type)
                .sortOrder(sortOrder)
                .build();
        return propertyRepository.save(property);
    }

    @Transactional(readOnly = true)
    public List<DocumentProperty> getPropertiesByDocument(Long documentId) {
        return propertyRepository.findByDocumentId(documentId);
    }

    @Transactional
    public void deleteProperty(Long propertyId) {
        propertyRepository.deleteById(propertyId);
    }

    @Transactional
    public DocumentProperty updateProperty(Long userId, Long propertyId, String name) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        DocumentProperty property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new ResourceNotFoundException("Property not found: " + propertyId));

        Document document = property.getDocument();

        boolean isOwner = document.getUser().getId().equals(userId);
        boolean hasWritePermission = permissionService.hasAcceptedWritePermission(user, document);

        if (!isOwner && !hasWritePermission) {
            throw new org.springframework.security.access.AccessDeniedException("No permission to edit this property.");
        }

        property.setName(name);
        return propertyRepository.save(property);
    }
} 