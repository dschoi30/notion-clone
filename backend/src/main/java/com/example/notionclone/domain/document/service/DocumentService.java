package com.example.notionclone.domain.document.service;

import com.example.notionclone.domain.document.entity.Document;
import com.example.notionclone.domain.document.dto.CreateDocumentRequest;
import com.example.notionclone.domain.document.dto.DocumentDto;
import com.example.notionclone.domain.document.dto.UpdateDocumentRequest;
import com.example.notionclone.domain.document.repository.DocumentRepository;
import com.example.notionclone.domain.user.entity.User;
import com.example.notionclone.domain.user.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DocumentService {
    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;

    private DocumentDto convertToDto(Document document) {
        DocumentDto dto = new DocumentDto();
        dto.setId(document.getId());
        dto.setTitle(document.getTitle());
        dto.setContent(document.getContent());
        dto.setParentId(document.getParent() != null ? document.getParent().getId() : null);
        dto.setOwnerId(document.getOwner().getId());
        dto.setFolder(document.isFolder());
        dto.setIcon(document.getIcon());
        dto.setPosition(document.getPosition());
        return dto;
    }

    public List<DocumentDto> getRootDocuments(Long userId) {
        User owner = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
        return documentRepository.findByOwnerAndParentIsNullOrderByPositionAsc(owner)
                .stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    public List<DocumentDto> getChildDocuments(Long userId, Long parentId) {
        User owner = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
        Document parent = documentRepository.findById(parentId)
                .orElseThrow(() -> new EntityNotFoundException("Parent document not found"));
        return documentRepository.findByOwnerAndParentOrderByPositionAsc(owner, parent)
                .stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public DocumentDto createDocument(Long userId, CreateDocumentRequest request) {
        User owner = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        Document document = new Document();
        document.setTitle(request.getTitle());
        document.setContent(request.getContent());
        document.setFolder(request.isFolder());
        document.setIcon(request.getIcon());
        document.setOwner(owner);

        if (request.getParentId() != null) {
            Document parent = documentRepository.findById(request.getParentId())
                    .orElseThrow(() -> new EntityNotFoundException("Parent document not found"));
            document.setParent(parent);
            Integer maxPosition = documentRepository.findMaxPositionByParentAndOwner(parent, owner)
                    .orElse(-1);
            document.setPosition(maxPosition + 1);
        } else {
            Integer maxPosition = documentRepository.findMaxPositionByOwnerAndNoParent(owner)
                    .orElse(-1);
            document.setPosition(maxPosition + 1);
        }

        document = documentRepository.save(document);
        return convertToDto(document);
    }

    @Transactional
    public DocumentDto updateDocument(Long documentId, UpdateDocumentRequest request) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new EntityNotFoundException("Document not found"));

        if (request.getTitle() != null) {
            document.setTitle(request.getTitle());
        }
        if (request.getContent() != null) {
            document.setContent(request.getContent());
        }
        if (request.getIcon() != null) {
            document.setIcon(request.getIcon());
        }
        if (request.getPosition() != null) {
            document.setPosition(request.getPosition());
        }
        if (request.getParentId() != null) {
            Document parent = documentRepository.findById(request.getParentId())
                    .orElseThrow(() -> new EntityNotFoundException("Parent document not found"));
            document.setParent(parent);
        }

        document = documentRepository.save(document);
        return convertToDto(document);
    }

    @Transactional
    public void deleteDocument(Long documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new EntityNotFoundException("Document not found"));
        documentRepository.delete(document);
    }

    public DocumentDto getDocument(Long documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new EntityNotFoundException("Document not found"));
        return convertToDto(document);
    }
} 