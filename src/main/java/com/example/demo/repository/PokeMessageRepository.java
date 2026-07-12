package com.example.demo.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.example.demo.Entity.PokeMessageEntity;
import java.util.List;
import java.util.Optional;

public interface PokeMessageRepository extends JpaRepository<PokeMessageEntity, Long> {
    List<PokeMessageEntity> findByReceiverId(Long receiverId);

    boolean existsBySenderIdAndReceiverIdAndReaction(Long senderId, Long receiverId, String reaction);

    Optional<PokeMessageEntity> findTopBySenderIdAndReceiverIdOrderBySentAtDesc(Long senderId, Long receiverId);
}
