package com.example.demo.Entity;

public class NearbyUserDto {
    private Long id;
    private String name;
    private String email;
    private Double distance;
    private Boolean isFriend;

    public NearbyUserDto() {}

    public NearbyUserDto(Long id, String name, String email, Double distance, Boolean isFriend) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.distance = distance;
        this.isFriend = isFriend;
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

    public Double getDistance() { 
        return distance; 
    }
    
    public void setDistance(Double distance) { 
        this.distance = distance; 
    }

    public Boolean getIsFriend() { 
        return isFriend; 
    }
    
    public void setIsFriend(Boolean isFriend) { 
        this.isFriend = isFriend; 
    }
}
