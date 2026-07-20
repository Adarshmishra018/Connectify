// Assuming you store the logged-in user's ID and token in localStorage
const userId = localStorage.getItem('userId');
const token = localStorage.getItem('token'); 

// Load profile data when the page opens
window.onload = function() {
    if (!userId) {
        alert("Please log in first!");
        window.location.href = "login.html";
        return;
    }
    loadProfile();
};

// 1. Fetch current profile from the new backend endpoint
async function loadProfile() {
    try {
		const response = await fetch(`/api/auth/${userId}/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const profile = await response.json();
            
            // Populate the UI
            if (profile.bio) {
                document.getElementById('bioInput').value = profile.bio;
            }
            if (profile.profilePictureUrl) {
                document.getElementById('profileImageDisplay').src = profile.profilePictureUrl;
            }
        }
    } catch (error) {
        console.error("Error loading profile:", error);
    }
}

// 2. Save profile (Handles image upload first, then saves bio + image URL)
async function saveProfile() {
    const bioText = document.getElementById('bioInput').value;
    const imageInput = document.getElementById('profileImageInput');
    let profilePictureUrl = document.getElementById('profileImageDisplay').src;

    // Check if user selected a new image to upload
    if (imageInput.files.length > 0) {
        const file = imageInput.files[0];
        const formData = new FormData();
        formData.append("file", file);

        try {
            // Upload the file using your existing FileUploadController
			const uploadResponse = await fetch('/api/files/upload', {        
				        method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (uploadResponse.ok) {
                const uploadResult = await uploadResponse.json();
                // Assuming your upload controller returns the URL of the saved file
                profilePictureUrl = uploadResult.fileUrl; 
            } else {
                alert("Image upload failed.");
                return;
            }
        } catch (error) {
            console.error("Upload error:", error);
            return;
        }
    }

    // 3. Send the updated Bio and Image URL to your new Profile endpoint
    try {
const updateResponse = await fetch(`/api/auth/${userId}/profile`, {
	            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                bio: bioText,
                profilePictureUrl: profilePictureUrl
            })
        });

        if (updateResponse.ok) {
            const updatedProfile = await updateResponse.json();
            document.getElementById('profileImageDisplay').src = updatedProfile.profilePictureUrl;
            
            // Show success message
            const statusMsg = document.getElementById('statusMessage');
            statusMsg.style.display = 'block';
            setTimeout(() => statusMsg.style.display = 'none', 3000);
        } else {
            alert("Failed to save profile.");
        }
    } catch (error) {
        console.error("Error saving profile:", error);
    }
}
