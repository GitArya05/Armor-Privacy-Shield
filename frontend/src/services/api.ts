// src/services/api.ts
const BASE_URL = "http://127.0.0.1:8000/api/v1";

export const uploadSecureFile = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Local file isolation ingestion failed.");
  }
  return await response.json();
};

export const wipeLocalData = async () => {
  const response = await fetch(`${BASE_URL}/wipe`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Zero-knowledge shred command failed.");
  }
  return await response.json();
};
