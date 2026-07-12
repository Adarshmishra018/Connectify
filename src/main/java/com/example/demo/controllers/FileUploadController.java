package com.example.demo.controllers;

import com.example.demo.Service.FileStorageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.util.Map;

@RestController
@RequestMapping("/api/files")
public class FileUploadController {

    private final FileStorageService fileStorageService;

    public FileUploadController(FileStorageService fileStorageService) {
        this.fileStorageService = fileStorageService;
    }
    
    /**
     * Serves uploaded files securely from the uploads directory.
     */
    @GetMapping("/download/{fileName:.+}")
    public ResponseEntity<org.springframework.core.io.Resource> downloadFile(@PathVariable String fileName) {
        try {
            // Resolve the path to the file in the "uploads" directory
            java.nio.file.Path filePath = java.nio.file.Paths.get("uploads").resolve(fileName).normalize();
            org.springframework.core.io.Resource resource = new org.springframework.core.io.UrlResource(filePath.toUri());
            if (resource.exists()) {
                // Determine file content type automatically
                String contentType = java.nio.file.Files.probeContentType(filePath);
                if (contentType == null) {
                    contentType = "application/octet-stream";
                }
                return ResponseEntity.ok()
                        .contentType(org.springframework.http.MediaType.parseMediaType(contentType))
                        .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    

    @PostMapping("/upload")
    public ResponseEntity<Map<String, String>> uploadFile(@RequestParam("file") MultipartFile file) {
        String fileName = fileStorageService.storeFile(file);

        String fileDownloadUri = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/api/files/download/")
                .path(fileName)
                .toUriString();

        return ResponseEntity.ok(Map.of(
                "fileName", file.getOriginalFilename(),
                "fileUrl", fileDownloadUri,
                "fileType", file.getContentType()
        ));
    }
}

