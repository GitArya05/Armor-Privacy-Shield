// src/services/api.ts

// Pointing to your specific backend configuration
const BASE_URL = "http://127.0.0.1:8000/api/v1";

export const uploadSecureFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${BASE_URL}/upload`, {
        method: "POST",
        body: formData,
    });
    
    if (!response.ok) throw new Error("Upload failed");
    return response.json();
};

export const askLocalEngine = async (query: string) => {
    const response = await fetch(`${BASE_URL}/chat`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
    });
    
    if (!response.ok) throw new Error("Inference failed");
    return response.json();
};

export const wipeLocalData = async () => {
    const response = await fetch(`${BASE_URL}/wipe`, {
        method: "DELETE",
    });
    
    if (!response.ok) throw new Error("Wipe failed");
    return response.json();
};