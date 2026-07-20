package com.example.demo.Entity;


import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.persistence.*;

@Entity
public class UserEntity {
//id,name,email,password
	    @Id
	    @GeneratedValue(strategy = GenerationType.IDENTITY)
	    private Long id;

	    private String name;
	    private String email;
	    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
	    private String password;
	   
	    @Column(length = 500) // Allows for a longer bio
	    private String bio;

	    private String profilePictureUrl;

	    // --- Add these Getters and Setters ---
	    
	    public String getBio() {
	        return bio;
	    }

	    public void setBio(String bio) {
	        this.bio = bio;
	    }

	    public String getProfilePictureUrl() {
	        return profilePictureUrl;
	    }

	    public void setProfilePictureUrl(String profilePictureUrl) {
	        this.profilePictureUrl = profilePictureUrl;
	    }

	    
	    
	    
	    
		public Long getId() {
			return id;
		}
		public void setId(Long id) {
			this.id = id;
		}
		public String getName() {
			return name;
		}
		public void setName(String name) {
			this.name = name;
		}
		public String getEmail() {
			return email;
		}
		public void setEmail(String email) {
			this.email = email;
		}
		public String getPassword() {
			return password;
		}
		public void setPassword(String password) {
			this.password = password;
		}
		@Override
		public String toString() {
			return "UserEntity [id=" + id + ", name=" + name + ", email=" + email + ", password=" + password + "]";
		}

	    // getters and setters
	    
		
		
		
}
