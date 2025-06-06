package com.example.notionclone.domain.workspace.service;

import com.example.notionclone.domain.user.entity.User;
import com.example.notionclone.domain.workspace.dto.WorkspaceDto;
import com.example.notionclone.domain.workspace.entity.Workspace;
import com.example.notionclone.domain.workspace.repository.WorkspaceRepository;
import com.example.notionclone.domain.notification.repository.NotificationRepository;
import com.example.notionclone.domain.notification.entity.NotificationType;
import com.example.notionclone.domain.notification.entity.NotificationStatus;
import com.example.notionclone.domain.document.repository.DocumentRepository;
import com.example.notionclone.domain.document.entity.Document;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;
import java.util.Set;
import java.util.HashSet;
import java.util.Objects;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkspaceService {
    private final WorkspaceRepository workspaceRepository;
    private final NotificationRepository notificationRepository;
    private final DocumentRepository documentRepository;

    public List<WorkspaceDto> getWorkspaces(User user) {
        log.debug("Fetching workspaces for user: {}", user.getId());
        List<Workspace> workspaces = workspaceRepository.findByUser(user);
        return workspaces.stream()
                .map(WorkspaceDto::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public WorkspaceDto createWorkspace(User user, String name) {
        log.debug("Creating workspace. User: {}, Name: {}", user.getId(), name);
        
        Workspace workspace = Workspace.builder()
                .name(name)
                .user(user)
                .build();

        log.debug("Built workspace: {}", workspace);
        log.debug("Workspace user: {}", workspace.getUser());

        workspace = workspaceRepository.save(workspace);
        log.debug("Saved workspace with ID: {}", workspace.getId());
        
        return WorkspaceDto.from(workspace);
    }

    @Transactional
    public WorkspaceDto updateWorkspace(User user, Long workspaceId, String name) {
        log.debug("Updating workspace. User: {}, WorkspaceId: {}, Name: {}", 
                user.getId(), workspaceId, name);
        
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new RuntimeException("Workspace not found"));

        if (!workspace.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Not authorized to update this workspace");
        }

        workspace.update(name);

        return WorkspaceDto.from(workspace);
    }

    @Transactional
    public void deleteWorkspace(User user, Long workspaceId) {
        log.debug("Deleting workspace. User: {}, WorkspaceId: {}", user.getId(), workspaceId);
        
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new RuntimeException("Workspace not found"));

        if (!workspace.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Not authorized to delete this workspace");
        }

        if (workspace.getParent() != null) {
            workspace.getParent().removeSubWorkspace(workspace);
            log.debug("Removed from parent workspace");
        }

        workspaceRepository.delete(workspace);
        log.debug("Workspace deleted");
    }

    public List<WorkspaceDto> getAccessibleWorkspaces(User user) {
        // 내가 owner인 워크스페이스
        List<Workspace> myWorkspaces = workspaceRepository.findByUser(user);
        // 초대 수락한 공유 문서가 속한 워크스페이스
        List<Long> sharedDocIds = notificationRepository
            .findByReceiverAndTypeAndStatus(user, NotificationType.INVITE, NotificationStatus.ACCEPTED)
            .stream()
            .map(n -> {
                try {
                    String payload = n.getPayload();
                    int idx = payload.indexOf(":");
                    int end = payload.indexOf("}");
                    return Long.parseLong(payload.substring(idx + 1, end));
                } catch (Exception e) {
                    return null;
                }
            })
            .filter(Objects::nonNull)
            .collect(Collectors.toList());
        List<Workspace> sharedWorkspaces = sharedDocIds.isEmpty() ? List.of() :
            documentRepository.findAllById(sharedDocIds)
                .stream()
                .map(Document::getWorkspace)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());
        Set<Workspace> all = new HashSet<>(myWorkspaces);
        all.addAll(sharedWorkspaces);
        return all.stream().map(WorkspaceDto::from).collect(Collectors.toList());
    }
} 