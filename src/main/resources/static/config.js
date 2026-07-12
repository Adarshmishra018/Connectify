// Centralized configuration for the Connectify frontend API connection
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:8081"
    : "https://your-production-backend.onrender.com"; // Replace with your actual production backend URL
