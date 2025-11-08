package com.example.notionclone.domain.notification.service;

import com.example.notionclone.domain.notification.entity.*;
import com.example.notionclone.domain.notification.repository.NotificationRepository;
import com.example.notionclone.domain.user.entity.User;
import com.example.notionclone.domain.permission.service.PermissionService;
import com.example.notionclone.domain.permission.entity.PermissionStatus;
import com.example.notionclone.domain.permission.entity.Permission;
import com.example.notionclone.domain.document.entity.Document;
import com.example.notionclone.domain.document.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {
    private final NotificationRepository notificationRepository;
    private final PermissionService permissionService;
    private final DocumentRepository documentRepository;

    public List<Notification> getUserNotifications(User user) {
        return notificationRepository.findByReceiverOrderByCreatedAtDesc(user);
    }

    public Notification acceptNotification(Long id, User user) {
        Notification notification = notificationRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("알림 없음"));
        if (!notification.getReceiver().equals(user)) throw new RuntimeException("권한 없음");
        notification.setStatus(NotificationStatus.ACCEPTED);
        if (notification.getPayload() != null && notification.getType() == NotificationType.INVITE) {
            try {
                String payload = notification.getPayload();
                int idx = payload.indexOf(":");
                int end = payload.indexOf("}");
                if (idx != -1 && end != -1) {
                    Long documentId = Long.parseLong(payload.substring(idx + 1, end));
                    Document document = documentRepository.findById(documentId)
                        .orElseThrow(() -> new RuntimeException("문서 없음"));
                    Permission permission = permissionService.getPermission(user, document);
                    if (permission != null) {
                        permissionService.updateStatus(permission, PermissionStatus.ACCEPTED);
                    }
                }
            } catch (Exception e) {
                // 파싱 실패 시 무시
            }
        }
        return notificationRepository.save(notification);
    }

    public Notification rejectNotification(Long id, User user) {
        Notification notification = notificationRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("알림 없음"));
        if (!notification.getReceiver().equals(user)) throw new RuntimeException("권한 없음");
        notification.setStatus(NotificationStatus.REJECTED);
        return notificationRepository.save(notification);
    }

    public Notification markAsRead(Long id, User user) {
        Notification notification = notificationRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("알림 없음"));
        if (!notification.getReceiver().equals(user)) throw new RuntimeException("권한 없음");
        notification.setStatus(NotificationStatus.READ);
        return notificationRepository.save(notification);
    }

    public Notification sendInviteNotification(User invitee, NotificationType type, String message, String payload) {
        Notification notification = Notification.builder()
            .receiver(invitee)
            .type(type)
            .message(message)
            .payload(payload)
            .status(NotificationStatus.UNREAD)
            .build();
        return notificationRepository.save(notification);
    }
} 