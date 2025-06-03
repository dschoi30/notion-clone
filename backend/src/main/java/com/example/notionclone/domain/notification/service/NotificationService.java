package com.example.notionclone.domain.notification.service;

import com.example.notionclone.domain.notification.entity.*;
import com.example.notionclone.domain.notification.repository.NotificationRepository;
import com.example.notionclone.domain.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {
    private final NotificationRepository notificationRepository;

    public List<Notification> getUserNotifications(User user) {
        return notificationRepository.findByReceiverOrderByCreatedAtDesc(user);
    }

    public Notification acceptNotification(Long id, User user) {
        Notification notification = notificationRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("알림 없음"));
        if (!notification.getReceiver().equals(user)) throw new RuntimeException("권한 없음");
        notification.setStatus(NotificationStatus.ACCEPTED);
        return notificationRepository.save(notification);
    }

    public Notification rejectNotification(Long id, User user) {
        Notification notification = notificationRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("알림 없음"));
        if (!notification.getReceiver().equals(user)) throw new RuntimeException("권한 없음");
        notification.setStatus(NotificationStatus.REJECTED);
        return notificationRepository.save(notification);
    }

    public Notification sendNotification(User receiver, NotificationType type, String message, String payload) {
        Notification notification = Notification.builder()
            .receiver(receiver)
            .type(type)
            .message(message)
            .payload(payload)
            .status(NotificationStatus.UNREAD)
            .build();
        return notificationRepository.save(notification);
    }
} 