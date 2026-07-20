package com.example.demo.Entity;

public class UserProfileDto {
    private Long id;
    private String name;
    private String email;
    private String bio;
    private String profilePictureUrl;

    // Constructors
    public UserProfileDto() {}

    public UserProfileDto(Long id, String name, String email, String bio, String profilePictureUrl) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.bio = bio;
        this.profilePictureUrl = profilePictureUrl;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    
    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }
    
    public String getProfilePictureUrl() { return profilePictureUrl; }
    public void setProfilePictureUrl(String profilePictureUrl) { this.profilePictureUrl = profilePictureUrl; }
}
