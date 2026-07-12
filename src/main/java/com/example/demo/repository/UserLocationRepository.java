package com.example.demo.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.example.demo.Entity.UserLocationEntity;
import java.util.Optional;

public interface UserLocationRepository extends JpaRepository<UserLocationEntity, Long> {
    Optional<UserLocationEntity> findByUserId(Long userId);
}

