package com.example.notionclone.domain.notification.repository;

import com.example.notionclone.domain.notification.entity.Notification;
import com.example.notionclone.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByReceiverOrderByCreatedAtDesc(User receiver);
} 